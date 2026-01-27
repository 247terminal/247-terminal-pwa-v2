# Trading API Requirements

This document outlines all APIs needed for the trading functionality, categorized by CCXT availability vs native implementation requirements.

---

## Exchange Support

| Exchange    | ID            | Type                | Auth Method                 |
| ----------- | ------------- | ------------------- | --------------------------- |
| Binance     | `binance`     | USDM Futures        | API Key + HMAC-SHA256       |
| Bybit       | `bybit`       | Linear Perpetuals   | API Key + HMAC-SHA256       |
| Blofin      | `blofin`      | Perpetual Contracts | API Key + Passphrase + HMAC |
| Hyperliquid | `hyperliquid` | Perps + Spot        | EIP-712 Wallet Signature    |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UI Components                              │
│  (TradeBlock, AccountBlock, PositionsTab, OrdersTab)                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ reads signals
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Stores (Signals)                             │
│  trade_store.ts  │  account_store.ts (balances, positions, orders)  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ calls bridge
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Worker Bridge (account_bridge.ts)                  │
│  - Sends postMessage to worker                                       │
│  - Request deduplication, market map caching                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ postMessage
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Worker (exchange.worker.ts)                       │
│  - All CCXT operations (never blocks main thread)                   │
│  - account_worker.ts: balance, positions, orders                     │
│  - data_fetchers.ts: markets, tickers, funding                       │
│  - Exchange-specific adapters (binance, bybit, blofin, hyperliquid) │
└────────────────────────────┬────────────────────────────────────────┘
                             │ CCXT / native REST calls
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Exchange APIs                                │
│  Binance  │  Bybit  │  Blofin  │  Hyperliquid                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Performance Best Practices

### Worker Isolation

- All CCXT calls run in web worker (never block main thread)
- Request/response pattern with 10s timeout to prevent hanging
- Worker bridge handles message routing and pending request tracking

### Store Updates

- Use `batch()` when updating multiple related fields to prevent cascading re-renders
- Avoid excessive object spreading on rapid updates (combine balance + positions + orders into single update when possible)
- Keep computed signals simple; avoid expensive calculations in them

### Request Management

- **Deduplication**: Track in-flight requests by key, return existing promise if duplicate
- **Debouncing**: 200ms debounce on WS-triggered fetches to batch rapid events
- **Cancellation**: Support AbortController for switching exchanges/symbols quickly
- **Rate limiting**: Respect exchange limits (Binance 1200/min, Bybit 120/5s, Blofin 60/2s)

### WebSocket Strategy

- **Hybrid approach**: Use WS data directly for tick fields, REST for structural changes (private info updates) after WS detected update
- Exponential backoff on reconnection (start 1s, max 30s)
- Ping intervals per exchange to maintain connection

### Memory Management

- Filter closed positions after 5min retention (for UI history)
- Limit cached filled orders to last 100
- Clean up pending requests on timeout

### Parallel Operations

- `Promise.all()` for initial data fetch (balance, positions, orders)
- Native batch APIs for scale orders where available (Bybit 20, Blofin 20, Hyperliquid 100+, Binance only 5)

---

## Exchange Account Store Structure

Each connected exchange stores its trading data in a unified structure:

```typescript
interface ExchangeAccountState {
    exchange_id: ExchangeId;
    connected: boolean;

    // Account configuration (fetched on connect)
    config: {
        position_mode: 'one_way' | 'hedge';
        default_margin_mode: 'cross' | 'isolated';
    };

    // Per-symbol settings
    symbol_settings: Record<
        string,
        {
            leverage: number;
            margin_mode: 'cross' | 'isolated';
            max_market_qty: number;
            min_qty: number;
            qty_step: number;
        }
    >;

    // Trading data (updated via WS triggers + REST fetch)
    balance: {
        total: number;
        available: number;
        used: number;
        currency: string;
        last_updated: number;
    } | null;

    positions: Position[];
    open_orders: Order[];

    // WebSocket state
    ws_connected: boolean;
    ws_last_ping: number;
}

// Global store structure
interface TradingAccountStore {
    accounts: Record<ExchangeId, ExchangeAccountState>;
    active_exchange: ExchangeId | null;
}
```

### Store Update Flow

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  WebSocket Event │────▶│  Trigger Fetch  │────▶│  Update Store    │
│  (notification)  │     │  (REST API)     │     │  (signal update) │
└──────────────────┘     └─────────────────┘     └──────────────────┘

Example:
1. WS receives "position_update" event
2. Call fetchPositions(exchange_id)
3. Update accounts[exchange_id].positions = newPositions
4. UI reactively updates via signals
```

---

## Leverage with Order Parameter

**None of the exchanges support sending leverage directly with order placement.**

| Exchange    | Leverage in Order | Required Action                                       |
| ----------- | ----------------- | ----------------------------------------------------- |
| Binance     | NO                | Set via `POST /fapi/v1/leverage` before order         |
| Bybit       | NO                | Set via `POST /v5/position/set-leverage` before order |
| Blofin      | NO                | Set via position management API before order          |
| Hyperliquid | NO                | Set via `updateLeverage` action before order          |

**Implementation:** Always set leverage for symbol before placing orders.

---

## Margin Mode in Order Placement

| Exchange    | Required in Order | Parameter                           | Notes                                                         |
| ----------- | ----------------- | ----------------------------------- | ------------------------------------------------------------- |
| Binance     | NO                | N/A                                 | Set at account level via `POST /fapi/v1/marginType`           |
| Bybit       | NO                | N/A                                 | Set at position level via `POST /v5/position/switch-isolated` |
| Blofin      | **YES**           | `marginMode: "cross" \| "isolated"` | Must send with every order                                    |
| Hyperliquid | NO                | N/A                                 | Always isolated                                               |

**Blofin Order Params:**

```typescript
{
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  params: {
    marginMode: 'cross' | 'isolated',  // REQUIRED
    positionSide?: 'net' | 'long' | 'short'
  }
}
```

---

## Position Mode (Hedge vs One-Way)

### Fetch Position Mode

| Exchange    | Endpoint                         | Response                                                         |
| ----------- | -------------------------------- | ---------------------------------------------------------------- |
| Binance     | `GET /fapi/v1/positionSide/dual` | `{ "dualSidePosition": true/false }`                             |
| Bybit       | `GET /v5/position/list`          | `positionIdx` in response (0=one-way, 1=buy-hedge, 2=sell-hedge) |
| Blofin      | `GET /api/v1/account/positions`  | `positionSide`: `"net"` / `"long"` / `"short"`                   |
| Hyperliquid | N/A                              | Always isolated per-position, no hedge mode                      |

### Position Side Values

| Exchange    | One-Way Mode           | Hedge Mode                           |
| ----------- | ---------------------- | ------------------------------------ |
| Binance     | `positionSide: "BOTH"` | `positionSide: "LONG"` or `"SHORT"`  |
| Bybit       | `positionIdx: 0`       | `positionIdx: 1` (buy) or `2` (sell) |
| Blofin      | `positionSide: "net"`  | `positionSide: "long"` or `"short"`  |
| Hyperliquid | Always per-position    | N/A                                  |

### Order Placement with Position Mode

**One-Way Mode:**

```typescript
// All exchanges - just specify side
{
    side: 'buy' | 'sell';
}
```

**Hedge Mode:**

```typescript
// Binance
{ side: 'BUY', positionSide: 'LONG' }   // Open long
{ side: 'SELL', positionSide: 'LONG' }  // Close long
{ side: 'SELL', positionSide: 'SHORT' } // Open short
{ side: 'BUY', positionSide: 'SHORT' }  // Close short

// Bybit
{ side: 'Buy', positionIdx: 1 }   // Buy side (long)
{ side: 'Sell', positionIdx: 2 }  // Sell side (short)

// Blofin
{ side: 'buy', positionSide: 'long', marginMode: 'cross' }
{ side: 'sell', positionSide: 'short', marginMode: 'cross' }
```

---

## Margin Mode (Cross vs Isolated)

### Fetch Margin Mode

| Exchange    | Endpoint                        | Response Field                           |
| ----------- | ------------------------------- | ---------------------------------------- |
| Binance     | `GET /fapi/v2/positionRisk`     | `marginType: "isolated" \| "cross"`      |
| Bybit       | `GET /v5/position/list`         | `tradeMode: 0` (cross) or `1` (isolated) |
| Blofin      | `GET /api/v1/account/positions` | `marginMode: "isolated" \| "cross"`      |
| Hyperliquid | N/A                             | Always isolated (no cross margin)        |

### Set Margin Mode

| Exchange    | Endpoint                               | Notes                                    |
| ----------- | -------------------------------------- | ---------------------------------------- |
| Binance     | `POST /fapi/v1/marginType`             | `marginType: "ISOLATED" \| "CROSSED"`    |
| Bybit       | `POST /v5/position/switch-isolated`    | `tradeMode: 0` (cross) or `1` (isolated) |
| Blofin      | `POST /api/v1/account/set-margin-mode` | Per instrument                           |
| Hyperliquid | N/A                                    | Always isolated                          |

---

## Order Size Limits & Splitting

### Fetch Max Order Size

| Exchange    | Endpoint                          | Fields                       |
| ----------- | --------------------------------- | ---------------------------- |
| Binance     | `GET /fapi/v1/exchangeInfo`       | `filters[LOT_SIZE].maxQty`   |
| Bybit       | `GET /v5/market/instruments-info` | `lotSizeFilter.maxOrderQty`  |
| Blofin      | `GET /api/v1/market/instruments`  | `maxMarketSize`              |
| Hyperliquid | `POST /info` with `type: "meta"`  | Per-asset limits in response |

### Order Splitting Logic

When order size exceeds exchange max market order size, split into multiple orders:

```typescript
interface OrderSplit {
    orders: Array<{ amount: number }>;
    total_amount: number;
}

function split_large_order(
    total_amount: number,
    max_order_size: number,
    min_order_size: number,
    qty_step: number
): OrderSplit {
    const orders: Array<{ amount: number }> = [];
    let remaining = total_amount;

    while (remaining > 0) {
        // Calculate this order's size
        let order_size = Math.min(remaining, max_order_size);

        // Round to qty_step
        order_size = Math.floor(order_size / qty_step) * qty_step;

        // Skip if below minimum
        if (order_size < min_order_size) {
            break;
        }

        orders.push({ amount: order_size });
        remaining -= order_size;
    }

    return {
        orders,
        total_amount: orders.reduce((sum, o) => sum + o.amount, 0),
    };
}

// Usage in order placement
async function place_market_order(
    exchange: Exchange,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number
) {
    const settings = get_symbol_settings(exchange.id, symbol);

    if (amount <= settings.max_market_qty) {
        // Single order
        return await exchange.createMarketOrder(symbol, side, amount);
    }

    // Split into multiple orders
    const { orders } = split_large_order(
        amount,
        settings.max_market_qty,
        settings.min_qty,
        settings.qty_step
    );

    const results = [];
    for (const order of orders) {
        const result = await exchange.createMarketOrder(symbol, side, order.amount);
        results.push(result);
    }

    return results;
}
```

### Max Order Sizes (Examples)

| Exchange    | Symbol   | Max Market Qty      |
| ----------- | -------- | ------------------- |
| Binance     | BTCUSDT  | 500 BTC             |
| Bybit       | BTCUSDT  | 100 BTC             |
| Blofin      | BTC-USDT | 1,000,000 contracts |
| Hyperliquid | BTC      | ~50 BTC (varies)    |

---

## 1. Order Placement

### Market Orders

| Method             | CCXT                  | Native | Notes         |
| ------------------ | --------------------- | ------ | ------------- |
| Place market order | `createMarketOrder()` | -      | Standard CCXT |

**Parameters:**

```typescript
// Binance / Bybit
{
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  params: {
    reduceOnly?: boolean,
    positionSide?: string,  // For hedge mode
    positionIdx?: number    // Bybit hedge mode
  }
}

// Blofin (marginMode required)
{
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  params: {
    marginMode: 'cross' | 'isolated',  // REQUIRED
    reduceOnly?: boolean,
    positionSide?: string
  }
}
```

### Limit Orders

| Method            | CCXT                 | Native | Notes                   |
| ----------------- | -------------------- | ------ | ----------------------- |
| Place limit order | `createLimitOrder()` | -      | Standard CCXT           |
| Post-only limit   | `createLimitOrder()` | -      | `params.postOnly: true` |

**Parameters:**

```typescript
{
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number,
  params: {
    reduceOnly?: boolean,
    postOnly?: boolean,
    positionSide?: string,
    positionIdx?: number,
    marginMode?: 'cross' | 'isolated'  // Required for Blofin
  }
}
```

### Scale Orders (Grid)

| Method             | CCXT      | Native           | Notes                                |
| ------------------ | --------- | ---------------- | ------------------------------------ |
| Place batch orders | Loop CCXT | Native preferred | Better performance with native batch |

**Native Batch Endpoints:**

| Exchange    | Endpoint                             | Max Orders |
| ----------- | ------------------------------------ | ---------- |
| Binance     | `POST /fapi/v1/batchOrders`          | 5          |
| Bybit       | `POST /v5/order/create-batch`        | 20         |
| Blofin      | `POST /api/v1/trade/batch-orders`    | 20         |
| Hyperliquid | Single request with `orders[]` array | 100+       |

**Parameters:**

```typescript
{
  symbol: string,
  side: 'buy' | 'sell',
  orders: Array<{ price: number, amount: number }>,
  priceDistribution: 'linear' | 'start_weighted' | 'end_weighted',
  sizeDistribution: 'equal' | 'start_bigger' | 'end_bigger',
  reduceOnly?: boolean,
  postOnly?: boolean
}
```

### TWAP Orders

| Method         | CCXT | Native      | Notes              |
| -------------- | ---- | ----------- | ------------------ |
| TWAP execution | -    | Client-side | Scheduler required |

**Implementation:** Client-side timer placing orders at intervals.

```typescript
{
  symbol: string,
  side: 'buy' | 'sell',
  totalSize: number,
  durationMinutes: number,
  ordersCount: number,
  reduceOnly?: boolean
}
// Interval = (durationMinutes * 60 * 1000) / ordersCount
// Size per order = totalSize / ordersCount
```

### Take Profit / Stop Loss

| Method | CCXT            | Native           | Notes                |
| ------ | --------------- | ---------------- | -------------------- |
| Set TP | `createOrder()` | Native preferred | Position-level TP/SL |
| Set SL | `createOrder()` | Native preferred | Position-level TP/SL |

**Native Position TP/SL Endpoints:**

| Exchange    | Endpoint                                                              |
| ----------- | --------------------------------------------------------------------- |
| Binance     | `POST /fapi/v1/order` with `type=TAKE_PROFIT_MARKET` or `STOP_MARKET` |
| Bybit       | `POST /v5/position/trading-stop`                                      |
| Blofin      | `POST /api/v1/trade/order-tpsl`                                       |
| Hyperliquid | Include `tp` and `sl` in order action                                 |

---

## 2. Order Management

| Method            | CCXT                | Native | Notes         |
| ----------------- | ------------------- | ------ | ------------- |
| Fetch open orders | `fetchOpenOrders()` | -      | Standard CCXT |
| Cancel order      | `cancelOrder()`     | -      | Standard CCXT |
| Cancel all orders | `cancelAllOrders()` | -      | Standard CCXT |

---

## 3. Position Management

| Method              | CCXT                  | Native | Notes                  |
| ------------------- | --------------------- | ------ | ---------------------- |
| Fetch positions     | `fetchPositions()`    | -      | Standard CCXT          |
| Close position      | `createMarketOrder()` | -      | Use `reduceOnly: true` |
| Close all positions | -                     | Loop   | Iterate and close each |

**Position Data Structure:**

```typescript
interface Position {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entry_price: number;
    mark_price: number;
    liquidation_price: number | null;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    margin: number;
    leverage: number;
    margin_mode: 'cross' | 'isolated';
    updated_at: number;
}
```

---

## 4. Account & Balance

| Method             | CCXT             | Native   | Notes                |
| ------------------ | ---------------- | -------- | -------------------- |
| Fetch balance      | `fetchBalance()` | -        | Standard CCXT        |
| Fetch account info | -                | Required | Position/margin mode |

**Balance Data Structure:**

```typescript
interface Balance {
    exchange: ExchangeId;
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
}
```

---

## 5. Leverage Management

| Method         | CCXT            | Native   | Notes         |
| -------------- | --------------- | -------- | ------------- |
| Set leverage   | `setLeverage()` | -        | Standard CCXT |
| Fetch leverage | -               | Required | Per-symbol    |

**Set Leverage Before Order:**

```typescript
// Always call before placing order
await exchange.setLeverage(leverage, symbol);
await exchange.createMarketOrder(symbol, side, amount);
```

---

## 6. WebSocket Architecture

### Pattern: WS Update → REST Fetch

Connect to private WebSocket streams for real-time notifications. When an update is received, fetch the full data via REST API.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Exchange WS    │────▶│  Update Event    │────▶│  REST Fetch     │
│  Private Stream │     │  (notification)  │     │  (full data)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Event → Fetch Mapping

| WS Event        | Action            | REST Call           |
| --------------- | ----------------- | ------------------- |
| Position update | Fetch positions   | `fetchPositions()`  |
| Order update    | Fetch open orders | `fetchOpenOrders()` |
| Balance update  | Fetch balance     | `fetchBalance()`    |

### WebSocket Connection Details

**Binance:**

```
Stream: wss://fstream.binance.com/ws/<listenKey>
Listen Key: POST /fapi/v1/listenKey (renew every 30min)

Events:
- ACCOUNT_UPDATE → fetch positions + balance
- ORDER_TRADE_UPDATE → fetch orders
```

**Bybit:**

```
Stream: wss://stream.bybit.com/v5/private
Auth: Send auth message with signature on connect

Topics to subscribe:
- position → fetch positions
- order → fetch orders
- wallet → fetch balance
```

**Blofin:**

```
Stream: wss://openapi.blofin.com/ws/private
Auth: Login message with signature

Channels:
- positions → fetch positions
- orders → fetch orders
- account → fetch balance
```

**Hyperliquid:**

```
Stream: wss://api.hyperliquid.xyz/ws
Subscription: {"method": "subscribe", "subscription": {"type": "userEvents", "user": "<address>"}}

Events:
- fills → fetch positions + orders
- liquidation → fetch positions
- funding → fetch balance
```

### WebSocket Event Handling

```typescript
interface WsEventHandler {
    onPositionUpdate: () => Promise<void>; // → fetchPositions()
    onOrderUpdate: () => Promise<void>; // → fetchOpenOrders()
    onBalanceUpdate: () => Promise<void>; // → fetchBalance()
}

// Debounce rapid updates
const debouncedFetch = debounce(fetchPositions, 200);
ws.on('position_update', () => debouncedFetch());
```

---

## 7. Hyperliquid Specifics

### API Endpoints

| Type             | URL                                         |
| ---------------- | ------------------------------------------- |
| Exchange (write) | `POST https://api.hyperliquid.xyz/exchange` |
| Info (read)      | `POST https://api.hyperliquid.xyz/info`     |
| WebSocket        | `wss://api.hyperliquid.xyz/ws`              |

### Order Placement

```typescript
{
  "action": {
    "type": "order",
    "orders": [{
      "a": 0,              // asset index (0 = BTC)
      "b": true,           // true = buy, false = sell
      "p": "42000",        // price as string
      "s": "1.0",          // size as string
      "r": false,          // reduce only
      "t": {
        "limit": { "tif": "Gtc" }  // Good til canceled
      }
    }],
    "grouping": "na"
  },
  "nonce": 1234567890123,
  "signature": { "r": "0x...", "s": "0x...", "v": 27 }
}
```

### Time in Force Options

| Value | Description                    |
| ----- | ------------------------------ |
| `Gtc` | Good til canceled              |
| `Ioc` | Immediate or cancel            |
| `Alo` | Add liquidity only (post-only) |

### Set Leverage

```typescript
{
  "action": {
    "type": "updateLeverage",
    "asset": 0,           // asset index
    "isCross": false,     // always false (isolated only)
    "leverage": 10
  },
  "nonce": 1234567890123,
  "signature": { ... }
}
```

### EIP-712 Authentication

```typescript
// Domain
{
  name: "Exchange",
  version: "1",
  chainId: 42161,  // Arbitrum
  verifyingContract: "0x..."
}

// Signing process
1. Construct action payload
2. Create EIP-712 typed data structure
3. Sign with wallet private key
4. Extract r, s, v from signature
5. Include nonce (timestamp in ms)
```

### API Wallet (Delegated Trading)

```typescript
// 1. Authorize API wallet (signed by main wallet)
{
  "action": {
    "type": "approveApiWallet",
    "apiWallet": "0x...",       // API wallet address
    "nonce": 1234567890123
  },
  "signature": { ... }          // Main wallet signature
}

// 2. Trade with API wallet (signed by API wallet)
// API wallet can trade but cannot withdraw
```

### Builder Fees

```typescript
// Check if user approved builder fee
POST /info
{ "type": "maxBuilderFee", "user": "<address>", "builder": "<builder_address>" }

// Approve builder fee (one-time, signed by main wallet)
{
  "action": {
    "type": "approveBuilderFee",
    "maxFeeRate": "0.001",  // 0.1%
    "builder": "0x..."
  }
}
```

| Fee Type   | Max Rate |
| ---------- | -------- |
| Perpetuals | 0.1%     |
| Spot       | 1%       |

### Asset Index Mapping

Fetch via info endpoint:

```typescript
POST /info
{ "type": "meta" }

// Response includes assetContexts with index mapping
// BTC = 0, ETH = 1, etc.
```

---

## 8. Exchange-Specific Native APIs

### Binance Futures

```
Base: https://fapi.binance.com

POST /fapi/v1/order              - Place order
POST /fapi/v1/batchOrders        - Batch orders (max 5)
DELETE /fapi/v1/order            - Cancel order
GET /fapi/v1/openOrders          - Open orders
GET /fapi/v2/positionRisk        - Positions + margin mode
GET /fapi/v1/positionSide/dual   - Position mode (hedge/one-way)
POST /fapi/v1/leverage           - Set leverage
POST /fapi/v1/marginType         - Set margin mode
GET /fapi/v2/account             - Account info + balance

Auth: X-MBX-APIKEY header + signature query param
```

### Bybit

```
Base: https://api.bybit.com

POST /v5/order/create            - Place order
POST /v5/order/create-batch      - Batch orders (max 20)
POST /v5/order/cancel            - Cancel order
GET /v5/order/realtime           - Open orders
GET /v5/position/list            - Positions + leverage + margin
POST /v5/position/set-leverage   - Set leverage
POST /v5/position/switch-isolated - Set margin mode
POST /v5/position/trading-stop   - Set TP/SL
GET /v5/account/wallet-balance   - Balance

Auth: X-BAPI-API-KEY, X-BAPI-TIMESTAMP, X-BAPI-SIGN headers
```

### Blofin

```
Base: https://openapi.blofin.com

POST /api/v1/trade/order              - Place order (marginMode required!)
POST /api/v1/trade/batch-orders       - Batch orders
POST /api/v1/trade/cancel-order       - Cancel order
GET /api/v1/trade/orders-pending      - Open orders
GET /api/v1/account/positions         - Positions
GET /api/v1/account/balance           - Balance
POST /api/v1/account/set-leverage     - Set leverage
POST /api/v1/account/set-margin-mode  - Set margin mode
POST /api/v1/trade/order-tpsl         - Set TP/SL
GET /api/v1/market/instruments        - Market info (maxMarketSize, minSize)

Auth: ACCESS-KEY, ACCESS-SIGN, ACCESS-TIMESTAMP, ACCESS-PASSPHRASE headers
```

### Hyperliquid

```
Base: https://api.hyperliquid.xyz

POST /exchange                   - All write operations
POST /info                       - All read operations

Actions (via /exchange):
- order                          - Place order(s)
- cancel                         - Cancel order
- cancelByCloid                  - Cancel by client ID
- updateLeverage                 - Set leverage
- updateIsolatedMargin           - Adjust margin
- approveBuilderFee              - Approve builder

Info types (via /info):
- meta                           - Asset metadata + limits
- clearinghouseState             - Positions + balance
- openOrders                     - Open orders
- userFills                      - Trade history
- maxMarketOrderNtls             - Max market order sizes

Auth: EIP-712 signature (r, s, v) + nonce
```

---

## 9. Implementation Phases (Detailed)

### Phase 3.0 - WebSocket Setup

1. Create WS connection manager per exchange
2. Handle authentication per exchange type
3. Implement reconnection logic

### Phase 3.1 - WS Event Handlers

1. Map WS events to fetch triggers
2. Implement debounced fetches
3. Update store on fetch complete

---

### TODO:

1. Connect slippage value from settings to market order placement.
