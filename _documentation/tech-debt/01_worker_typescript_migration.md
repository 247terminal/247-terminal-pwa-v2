# Web Worker TypeScript Migration Guide

## Overview

This guide outlines the migration of web workers from plain JavaScript in `/public` to TypeScript in `/src` using Vite's native worker bundling.

---

## What's Wrong With The Current Approach

### 1. The 5MB CCXT File

```
public/ccxt.browser.min.js - 5.0MB
```

**This is insane.** The entire CCXT library (~200 exchanges) is manually downloaded and placed in `/public`. The app only uses 4 exchanges (Binance, Bybit, BloFin, Hyperliquid).

**Problems:**
- **5MB download** for every user on first visit
- **No tree-shaking** - includes 196 exchanges we don't use
- **Manual updates** - someone has to manually download new versions
- **No versioning** - no way to track which version is deployed
- **Cache issues** - filename doesn't change, browser may cache stale version

**What should happen:** Vite bundles CCXT from `node_modules`, tree-shakes unused exchanges, and outputs a ~500KB file with proper cache-busting hashes.

### 2. `importScripts()` is Legacy

```javascript
importScripts('/ccxt.browser.min.js');
importScripts('/workers/config.js');
importScripts('/workers/utils.js');
// ...
```

This is the **2015 pattern** for web workers before ES modules existed.

**Problems:**
- **No dependency management** - order matters, no explicit imports
- **Global namespace pollution** - everything attaches to `self`
- **No static analysis** - bundler can't optimize anything
- **No TypeScript** - impossible to add types
- **No tree-shaking** - load everything or nothing

**Modern pattern:**
```typescript
import ccxt from 'ccxt';
import { config } from '@/config';
```

### 3. Duplicated Configuration

Config exists in **two places**:

| Location | Content |
|----------|---------|
| `public/workers/config.js` | Exchange URLs, proxy settings, timeframes |
| `src/config/index.ts` | API URLs, proxy settings |

The proxy URL and auth header are literally copy-pasted in both files. When one changes, you have to remember to update the other.

### 4. Fragmented Files in `/public/workers/`

```
workers/
├── config.js           # Config (duplicated)
├── exchange.worker.js  # Main entry
├── stream_utils.js     # Utilities
├── utils.js            # More utilities (11 lines lol)
└── exchanges/
    ├── binance/
    ├── blofin/
    ├── bybit/
    └── hyperliquid/
```

**10 separate JavaScript files** loaded via `importScripts()`. Each one:
- Has no types
- Cannot be imported by main thread code
- Cannot import from `src/`
- Has to be manually managed

### 5. No Type Safety

Everything is `any`. No interfaces, no type checking, no IDE support.

```javascript
// Current: No idea what 'market' contains
function isLinearSwap(market) {
    const isActive = market.active || market.info?.isPreListing;
    return isActive && market.type === 'swap' && VALID_SETTLE.has(market.settle);
}

// With TypeScript: Clear contract
function is_linear_swap(market: Market): boolean {
    const is_active = market.active || market.info?.is_pre_listing;
    return is_active && market.type === 'swap' && VALID_SETTLE.has(market.settle);
}
```

### 6. Cannot Share Code

The worker code in `/public` cannot import from `/src`, and vice versa. This means:
- Types defined in `/src/types/` can't be used in workers
- Utilities have to be duplicated
- Config has to be duplicated

### Summary: Why This Exists

This pattern was common in **2018-2019** before:
- Vite existed (2020)
- ES modules in workers were widely supported (2020+)
- CCXT had proper browser/ESM builds

It works, but it's tech debt that costs:
- **5MB extra download** per user
- **Zero type safety** in 2,200 lines of code
- **Maintenance burden** of keeping two config files in sync

---

## Current State (Legacy)

```
public/
├── ccxt.browser.min.js              # 5.0MB manual browser bundle (!!)
└── workers/
    ├── config.js                    # Duplicates src/config
    ├── exchange.worker.js           # 408 lines, plain JS
    ├── stream_utils.js              # 113 lines
    ├── utils.js                     # 11 lines
    └── exchanges/
        ├── binance/native_stream.js # 414 lines
        ├── blofin/native_stream.js  # 335 lines
        ├── blofin/rest_api.js       # 28 lines
        ├── bybit/native_stream.js   # 259 lines
        └── hyperliquid/
            ├── cex_stream.js        # 286 lines
            └── dex_stream.js        # 297 lines

Total: ~2,200 lines of untyped JavaScript
```

**Problems:**
- No TypeScript / no type safety
- No IDE intellisense
- Config duplicated between `/public/workers/config.js` and `/src/config/index.ts`
- Manual CCXT browser bundle management
- Cannot share code between worker and main thread
- No tree-shaking (loading entire 5MB CCXT)
- `importScripts()` is legacy pattern

---

## Target State (Modern)

```
src/
├── config/
│   └── index.ts                     # Single source of truth
├── workers/
│   ├── exchange.worker.ts           # Main worker entry
│   ├── types.ts                     # Shared worker types
│   ├── stream_utils.ts              # Stream utilities
│   └── streams/
│       ├── binance.ts
│       ├── blofin.ts
│       ├── bybit.ts
│       └── hyperliquid.ts
└── services/exchange/
    └── chart_data.ts                # Updated worker initialization

public/
├── favicon.svg
├── images/                          # Only static assets
└── (no JavaScript files)
```

**Benefits:**
- Full TypeScript with type safety
- IDE intellisense and error checking
- Single config source of truth
- Vite handles CCXT bundling and tree-shaking
- Shared types between worker and main thread
- Modern ES modules

---

## Prerequisites

### 1. Verify Vite Config

The `vite.config.ts` already has worker support configured:

```typescript
worker: {
    format: 'es',
}
```

### 2. Install CCXT Properly (if not already)

```bash
pnpm add ccxt
```

### 3. Configure Vite for CCXT

CCXT has some Node.js-specific code. Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [preact(), tailwindcss()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        host: true,
    },
    build: {
        target: 'es2020',
        sourcemap: true,
    },
    worker: {
        format: 'es',
    },
    optimizeDeps: {
        include: ['ccxt'],
    },
    define: {
        'process.env': {},
        global: 'globalThis',
    },
});
```

---

## Migration Steps

### Phase 1: Create Type Definitions

#### `src/workers/types.ts`

```typescript
export type ExchangeId = 'binance' | 'blofin' | 'bybit' | 'hyperliquid';

export type StreamState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface TickerEntry {
    symbol: string;
    last_price: number;
    best_bid: number;
    best_ask: number;
    price_24h: number | null;
    volume_24h: number | null;
    funding_rate: number | null;
    next_funding_time: number | null;
}

export interface OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface MarketInfo {
    symbol: string;
    base: string;
    quote: string;
    settle: string;
}

export interface WorkerMessage {
    type: string;
    payload?: unknown;
    requestId?: string;
}

export interface WorkerResponse {
    type: string;
    payload?: unknown;
    requestId?: string;
    error?: string;
}

export interface ExchangeConfig {
    ccxt_class: string;
    default_type: string;
    proxy?: string;
    headers?: Record<string, string>;
    ws_url?: string;
    ping_interval?: number;
    pool_key?: string;
}
```

---

### Phase 2: Merge Config

Update `src/config/index.ts` to include all worker config:

```typescript
interface AppConfig {
    api_base_url: string;
    ws_url: string;
    proxy_url: string;
    proxy_auth: string;
    environment: 'development' | 'production';
    is_dev: boolean;
    is_prod: boolean;
}

interface StreamConfig {
    backoff_base: number;
    backoff_max: number;
    backoff_jitter: number;
    pool_growth_factor: number;
    min_pool_size: number;
}

interface ExchangeStreamConfig {
    ccxt_class: string;
    default_type: string;
    proxy?: string;
    headers?: Record<string, string>;
    ws_urls?: Record<string, string>;
    ws_url?: string;
    ping_interval?: number;
    pool_key?: string;
    max_subs_per_connection?: number;
    subscribe_batch?: number;
}

function get_config(): AppConfig {
    const env = import.meta.env;
    const environment = env.MODE === 'production' ? 'production' : 'development';

    return {
        api_base_url: env.VITE_API_URL || '',
        ws_url: env.VITE_WS_URL || '',
        proxy_url: env.VITE_PROXY_URL || 'https://proxy2.247terminal.com/',
        proxy_auth: env.VITE_PROXY_AUTH || '5cbb9da977ea3740b4dcdfeea9b020c8f6de45c2d0314f549723e8a4207c288a',
        environment,
        is_dev: environment === 'development',
        is_prod: environment === 'production',
    };
}

export const config = get_config();

export const STREAM_CONFIG: StreamConfig = {
    backoff_base: 1000,
    backoff_max: 30000,
    backoff_jitter: 0.3,
    pool_growth_factor: 1.5,
    min_pool_size: 128,
};

export const BATCH_INTERVALS = {
    ticker: 200,
};

export const WS_STREAM_LIMIT = 200;
export const WS_RECONNECT_DELAY = 5000;
export const OHLCV_RETRY_DELAY = 2000;

export const VALID_SETTLE = new Set(['USDT', 'USDC', 'USDH', 'USDE']);
export const VALID_QUOTES = new Set(['USDT', 'USDC']);

export const EXCHANGE_STREAM_CONFIG: Record<string, ExchangeStreamConfig> = {
    binance: {
        ccxt_class: 'binanceusdm',
        default_type: 'swap',
        ws_urls: {
            ticker: 'wss://fstream.binance.com/ws/!miniTicker@arr',
            book_ticker: 'wss://fstream.binance.com/ws/!bookTicker',
            mark_price: 'wss://fstream.binance.com/ws/!markPrice@arr@1s',
            kline_base: 'wss://fstream.binance.com/stream?streams=',
        },
        pool_key: 'binance',
    },
    blofin: {
        ccxt_class: 'blofin',
        default_type: 'swap',
        proxy: config.proxy_url,
        headers: {
            'x-proxy-auth': config.proxy_auth,
        },
        ws_url: 'wss://openapi.blofin.com/ws/public',
        subscribe_batch: 100,
        ping_interval: 25000,
        pool_key: 'blofin',
    },
    hyperliquid: {
        ccxt_class: 'hyperliquid',
        default_type: 'swap',
        ws_url: 'wss://api.hyperliquid.xyz/ws',
        ping_interval: 30000,
        pool_key: 'hyperliquid',
    },
    bybit: {
        ccxt_class: 'bybit',
        default_type: 'swap',
        ws_url: 'wss://stream.bybit.com/v5/public/linear',
        max_subs_per_connection: 500,
        ping_interval: 20000,
        pool_key: 'bybit',
    },
};

export const TIMEFRAME_MAP: Record<string | number, string> = {
    1: '1m',
    5: '5m',
    15: '15m',
    30: '30m',
    60: '1h',
    120: '2h',
    240: '4h',
    480: '8h',
    720: '12h',
    D: '1d',
    W: '1w',
    M: '1M',
};
```

---

### Phase 3: Create Stream Utilities

#### `src/workers/stream_utils.ts`

```typescript
import { STREAM_CONFIG } from '@/config';
import type { TickerEntry, StreamState } from './types';

export const STREAM_STATES: Record<string, StreamState> = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
};

export function calculate_backoff(attempt: number): number {
    const { backoff_base, backoff_max, backoff_jitter } = STREAM_CONFIG;
    const delay = Math.min(backoff_base * Math.pow(2, attempt), backoff_max);
    return Math.floor(delay + delay * backoff_jitter * (Math.random() * 2 - 1));
}

const update_pool_cache = new Map<string, TickerEntry[]>();

export function get_pooled_updates(pool_key: string, size: number): TickerEntry[] {
    let pool = update_pool_cache.get(pool_key);
    const target_size = Math.max(size, STREAM_CONFIG.min_pool_size);

    if (!pool) {
        pool = new Array(target_size);
        for (let i = 0; i < target_size; i++) {
            pool[i] = create_ticker_entry();
        }
        update_pool_cache.set(pool_key, pool);
    } else if (pool.length < size) {
        const new_size = Math.ceil(size * STREAM_CONFIG.pool_growth_factor);
        const old_len = pool.length;
        pool.length = new_size;
        for (let i = old_len; i < new_size; i++) {
            pool[i] = create_ticker_entry();
        }
        update_pool_cache.set(pool_key, pool);
    }

    return pool;
}

export function create_ticker_entry(symbol = ''): TickerEntry {
    return {
        symbol,
        last_price: 0,
        best_bid: 0,
        best_ask: 0,
        price_24h: null,
        volume_24h: null,
        funding_rate: null,
        next_funding_time: null,
    };
}

export function fill_pooled_update(
    obj: TickerEntry,
    symbol: string,
    last_price: number,
    best_bid: number,
    best_ask: number,
    price_24h: number | null,
    volume_24h: number | null,
    funding_rate: number | null,
    next_funding_time: number | null
): TickerEntry {
    obj.symbol = symbol;
    obj.last_price = last_price;
    obj.best_bid = best_bid;
    obj.best_ask = best_ask;
    obj.price_24h = price_24h;
    obj.volume_24h = volume_24h;
    obj.funding_rate = funding_rate;
    obj.next_funding_time = next_funding_time;
    return obj;
}

export function create_websocket(url: string): WebSocket | null {
    try {
        return new WebSocket(url);
    } catch (e) {
        console.error('websocket creation failed:', url, (e as Error).message);
        return null;
    }
}

export function safe_close(ws: WebSocket | null): void {
    if (!ws) return;
    try {
        ws.close();
    } catch (e) {
        // Ignore close errors
    }
}

export function safe_send(ws: WebSocket | null, data: unknown): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('websocket send error:', (e as Error).message);
        return false;
    }
}

export function is_dex_symbol(symbol: string): boolean {
    const dash_index = symbol.indexOf('-');
    if (dash_index <= 0) return false;
    const prefix = symbol.substring(0, dash_index);
    return /^[A-Z]+$/.test(prefix);
}

export function get_next_hour_timestamp(): number {
    const now = Date.now();
    return Math.ceil(now / 3600000) * 3600000;
}
```

---

### Phase 4: Create Main Worker

#### `src/workers/exchange.worker.ts`

```typescript
import ccxt from 'ccxt';
import {
    EXCHANGE_STREAM_CONFIG,
    VALID_SETTLE,
    BATCH_INTERVALS,
} from '@/config';
import type { WorkerMessage, WorkerResponse, MarketInfo, ExchangeId } from './types';

const ccxt_pro = (ccxt as any).pro || ccxt;

const exchanges: Record<string, any> = {};
const active_streams = new Map<string, any>();
const ticker_streams = new Map<string, any>();

function get_exchange(exchange_id: ExchangeId): any {
    if (exchanges[exchange_id]) return exchanges[exchange_id];

    const config = EXCHANGE_STREAM_CONFIG[exchange_id];
    if (!config) throw new Error(`unknown exchange: ${exchange_id}`);

    const ExchangeClass = (ccxt_pro as any)[config.ccxt_class];
    if (!ExchangeClass) throw new Error(`ccxt class not found: ${config.ccxt_class}`);

    const exchange_options: any = {
        enableRateLimit: false,
        options: { defaultType: config.default_type },
    };

    if (config.proxy) exchange_options.proxy = config.proxy;
    if (config.headers) exchange_options.headers = config.headers;

    exchanges[exchange_id] = new ExchangeClass(exchange_options);
    return exchanges[exchange_id];
}

function is_linear_swap(market: any, exchange_id: ExchangeId): boolean {
    const is_active = market.active || market.info?.isPreListing;
    return is_active && market.type === 'swap' && VALID_SETTLE.has(market.settle);
}

async function load_markets(exchange_id: ExchangeId): Promise<Record<string, any>> {
    const exchange = get_exchange(exchange_id);
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
        await exchange.loadMarkets();
    }
    return exchange.markets;
}

async function fetch_markets(exchange_id: ExchangeId): Promise<MarketInfo[]> {
    const markets = await load_markets(exchange_id);
    return Object.values(markets)
        .filter((m: any) => is_linear_swap(m, exchange_id))
        .map((market: any) => ({
            symbol: market.symbol,
            base: market.base || '',
            quote: market.quote || '',
            settle: market.settle || market.quote || '',
        }));
}

function send_response(response: WorkerResponse): void {
    self.postMessage(response);
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload, requestId } = event.data;

    try {
        switch (type) {
            case 'fetchMarkets': {
                const { exchangeId } = payload as { exchangeId: ExchangeId };
                const markets = await fetch_markets(exchangeId);
                send_response({ type: 'markets', payload: markets, requestId });
                break;
            }

            // Add other message handlers...

            default:
                send_response({ type: 'error', error: `unknown message type: ${type}`, requestId });
        }
    } catch (error) {
        send_response({
            type: 'error',
            error: error instanceof Error ? error.message : 'unknown error',
            requestId,
        });
    }
};
```

---

### Phase 5: Update Worker Initialization

#### `src/services/exchange/chart_data.ts`

Change from:
```typescript
worker = new Worker('/workers/exchange.worker.js');
```

To:
```typescript
worker = new Worker(
    new URL('../../workers/exchange.worker.ts', import.meta.url),
    { type: 'module' }
);
```

---

### Phase 6: Migrate Stream Files

Each stream file (binance, blofin, bybit, hyperliquid) needs to be converted:

1. Convert to TypeScript with proper types
2. Import from `@/config` instead of relying on globals
3. Import stream utilities from `./stream_utils`
4. Export functions instead of attaching to `self`

Example structure for `src/workers/streams/binance.ts`:

```typescript
import {
    EXCHANGE_STREAM_CONFIG,
    VALID_QUOTES,
    BATCH_INTERVALS,
} from '@/config';
import {
    create_websocket,
    safe_close,
    safe_send,
    create_ticker_entry,
    calculate_backoff,
    STREAM_STATES,
} from '../stream_utils';
import type { TickerEntry, StreamState } from '../types';

interface BinanceStreamState {
    ticker: WebSocket | null;
    book_ticker: WebSocket | null;
    mark_price: WebSocket | null;
    kline_connections: WebSocket[];
    state: StreamState;
    reconnect_attempts: Record<string, number>;
    ticker_data: Map<string, TickerEntry>;
    pending: Set<string>;
    flush_timeout: number | null;
    post_update: ((updates: TickerEntry[]) => void) | null;
    batch_interval: number;
}

const binance_streams: BinanceStreamState = {
    ticker: null,
    book_ticker: null,
    mark_price: null,
    kline_connections: [],
    state: 'disconnected',
    reconnect_attempts: { ticker: 0, book_ticker: 0, mark_price: 0 },
    ticker_data: new Map(),
    pending: new Set(),
    flush_timeout: null,
    post_update: null,
    batch_interval: BATCH_INTERVALS.ticker,
};

function parse_symbol(raw_symbol: string): string | null {
    const quote = raw_symbol.slice(-4);
    if (!VALID_QUOTES.has(quote)) return null;
    const base = raw_symbol.slice(0, -4);
    return `${base}/${quote}:${quote}`;
}

export function start_binance_native_stream(
    symbols: string[],
    batch_interval: number,
    post_update: (updates: TickerEntry[]) => void
): void {
    if (binance_streams.state !== 'disconnected') return;

    binance_streams.state = STREAM_STATES.CONNECTING;
    binance_streams.post_update = post_update;
    binance_streams.batch_interval = batch_interval;

    connect_ticker_stream();
    connect_book_ticker_stream();
    connect_mark_price_stream();
    connect_kline_streams(symbols);
}

export function stop_binance_native_stream(): void {
    binance_streams.state = 'disconnected';
    safe_close(binance_streams.ticker);
    safe_close(binance_streams.book_ticker);
    safe_close(binance_streams.mark_price);
    binance_streams.kline_connections.forEach(safe_close);
    binance_streams.kline_connections = [];
    binance_streams.ticker_data.clear();
    binance_streams.pending.clear();
}

function connect_ticker_stream(): void {
    const config = EXCHANGE_STREAM_CONFIG.binance;
    safe_close(binance_streams.ticker);

    const ws = create_websocket(config.ws_urls!.ticker);
    if (!ws) {
        schedule_reconnect('ticker', connect_ticker_stream);
        return;
    }

    binance_streams.ticker = ws;

    ws.onopen = () => {
        binance_streams.reconnect_attempts.ticker = 0;
        update_state();
    };

    ws.onmessage = (event) => {
        if (binance_streams.state === 'disconnected') return;
        handle_ticker_message(event.data);
    };

    ws.onclose = (event) => {
        if (binance_streams.state === 'disconnected') return;
        console.error('binance ticker closed:', event.code, event.reason);
        schedule_reconnect('ticker', connect_ticker_stream);
    };

    ws.onerror = (error) => {
        console.error('binance ticker error:', error);
    };
}

// ... continue with other functions
```

---

## Phase 7: Cleanup

After migration is complete and tested:

### Delete from `/public`:

```bash
rm public/ccxt.browser.min.js
rm -rf public/workers/
```

### Keep in `/public`:

```
public/
├── favicon.svg
├── full-logo.svg
├── blocks-group-svgrepo-com.svg
├── oil-well.svg
└── images/
    └── exchanges/
        ├── binance.svg
        ├── blofin.svg
        ├── bybit.svg
        └── hyperliquid.svg
```

---

## Testing Checklist

- [ ] Worker initializes without errors
- [ ] Markets load for all exchanges
- [ ] Ticker streams connect and receive data
- [ ] Kline/OHLCV streams work
- [ ] Reconnection logic works after disconnect
- [ ] No console errors in production build
- [ ] Bundle size is reduced (tree-shaking working)
- [ ] TypeScript compilation passes
- [ ] All existing functionality preserved

---

## Rollback Plan

If issues arise:

1. Keep the original `/public/workers/` as `/public/workers-backup/`
2. Revert `chart_data.ts` worker initialization
3. Test thoroughly before deleting backup

---

## Estimated Effort

| Task | Lines | Complexity |
|------|-------|------------|
| Types | ~80 | Low |
| Config merge | ~100 | Low |
| Stream utils | ~120 | Low |
| Main worker | ~200 | Medium |
| Binance stream | ~400 | Medium |
| Blofin stream | ~350 | Medium |
| Bybit stream | ~260 | Medium |
| Hyperliquid streams | ~580 | Medium |
| Testing & debugging | - | High |

**Total: ~2,100 lines to migrate**

---

## Sources

- [Vite Web Workers Documentation](https://vite.dev/guide/features.html#web-workers)
- [CCXT Browser Usage](https://docs.ccxt.com/#/README?id=javascript-es6)
- [TypeScript Web Workers](https://www.typescriptlang.org/docs/handbook/modules.html)
