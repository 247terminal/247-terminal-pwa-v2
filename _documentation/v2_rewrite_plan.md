# 247 Terminal v2.0 - Rewrite Plan

**Date:** 2025-01-09
**Status:** Planning Phase

---

## 1. Executive Summary

This document outlines the plan to rewrite the 247 Terminal PWA from scratch, addressing the architectural issues identified in the current codebase while preserving the battle-tested trading logic and high-performance worker architecture.

### Decision: Fresh Start vs. Refactor

**Chosen Approach:** Fresh start with parallel development

**Rationale:**
- Current codebase has pervasive global state pollution (`window.X` in every module)
- No test coverage makes safe refactoring impossible
- 4000-line "God Script" requires decomposition, not modification
- Modern tooling (Vite, TypeScript) cannot be incrementally added to current structure

---

## 2. Current State Analysis

### What's Wrong

| Problem | Severity | Location |
|---------|----------|----------|
| God Script Monolith | Critical | `terminal.page.js` (~4000 lines) |
| Global State Chaos | Critical | `terminal-state.service.js` |
| No Build System | Critical | `index.html` (50+ script tags) |
| Global Pollution | High | Every module exports to `window` |
| No Tests | High | Zero test coverage |
| jQuery Dependency | Medium | Mixed with vanilla JS |
| No TypeScript | Medium | Runtime errors from typos |

### What's Good (Preserve These)

| Component | Quality | Action |
|-----------|---------|--------|
| Web Worker Architecture | Excellent | Port directly |
| Exchange WebSocket Handling | Good | Port with cleanup |
| RxJS Stream Patterns | Good | Keep using |
| Lightweight Charts Integration | Good | Keep library, rewrite integration |
| Trading Logic Core | Good | Extract and clean |

---

## 3. Target Architecture

### 3.1 Tech Stack

| Category | Technology | Rationale |
|----------|------------|-----------|
| **Framework** | Preact + Signals | 3KB bundle, React-compatible API, built-in reactive state |
| **Build Tool** | Vite | Fast HMR, proper bundling, tree-shaking |
| **Language** | TypeScript | Compile-time error catching, better DX |
| **State** | @preact/signals | Simple reactive state, no boilerplate |
| **Charts** | Lightweight Charts v5 | Already proven, good performance |
| **Data Streams** | RxJS | Keep existing patterns |
| **Styling** | Tailwind CSS v4 + DaisyUI v5 | CSS-based config, Vite plugin, colors from 247-terminal-website |
| **Testing** | Vitest + Testing Library | Fast, Vite-native |
| **Linting** | ESLint + Prettier | Code consistency |

### 3.2 Project Structure

```
247-terminal-v2/
├── public/
│   └── assets/
├── src/
│   ├── components/           # Preact UI components
│   │   ├── chart/
│   │   │   ├── trading_chart.tsx
│   │   │   ├── mini_chart.tsx
│   │   │   └── chart_controls.tsx
│   │   ├── trading/
│   │   │   ├── order_panel.tsx
│   │   │   ├── position_list.tsx
│   │   │   └── ticker_bar.tsx
│   │   ├── news/
│   │   │   ├── news_feed.tsx
│   │   │   └── news_item.tsx
│   │   ├── chat/
│   │   │   ├── chat_panel.tsx
│   │   │   └── message.tsx
│   │   └── layout/
│   │       ├── header.tsx
│   │       ├── sidebar.tsx
│   │       └── terminal_layout.tsx
│   │
│   ├── services/             # Business logic (no UI)
│   │   ├── trading/
│   │   │   ├── order.service.ts
│   │   │   ├── position.service.ts
│   │   │   └── types.ts
│   │   ├── exchange/
│   │   │   ├── binance.adapter.ts
│   │   │   ├── bybit.adapter.ts
│   │   │   └── hyperliquid.adapter.ts
│   │   ├── news/
│   │   │   └── news_stream.service.ts
│   │   └── auth/
│   │       └── auth.service.ts
│   │
│   ├── workers/              # Web Workers (off main thread)
│   │   ├── exchange.worker.ts
│   │   └── data_processor.worker.ts
│   │
│   ├── stores/               # Reactive state
│   │   ├── trading.store.ts
│   │   ├── ticker.store.ts
│   │   ├── user.store.ts
│   │   └── ui.store.ts
│   │
│   ├── hooks/                # Reusable Preact hooks
│   │   ├── use_websocket.ts
│   │   ├── use_trading.ts
│   │   └── use_chart_data.ts
│   │
│   ├── utils/                # Pure utility functions
│   │   ├── formatting.ts
│   │   ├── calculations.ts
│   │   └── validation.ts
│   │
│   ├── types/                # TypeScript type definitions
│   │   ├── trading.types.ts
│   │   ├── exchange.types.ts
│   │   └── api.types.ts
│   │
│   ├── config/               # Configuration
│   │   ├── exchanges.config.ts
│   │   └── app.config.ts
│   │
│   ├── app.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles / Tailwind
│
├── tests/                    # Test files mirror src structure
│   ├── services/
│   ├── components/
│   └── utils/
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── eslint.config.js
├── package.json
└── README.md
```

### 3.3 State Management with Signals

```typescript
// stores/trading.store.ts
import { signal, computed } from '@preact/signals';
import type { Position, Order } from '@/types/trading.types';

// Reactive state
export const positions = signal<Position[]>([]);
export const open_orders = signal<Order[]>([]);
export const selected_symbol = signal<string>('BTCUSDT');

// Computed values
export const total_pnl = computed(() =>
  positions.value.reduce((sum, p) => sum + p.unrealized_pnl, 0)
);

export const position_count = computed(() => positions.value.length);

// Actions
export function update_position(position: Position) {
  positions.value = positions.value.map(p =>
    p.symbol === position.symbol ? position : p
  );
}

export function close_position(symbol: string) {
  positions.value = positions.value.filter(p => p.symbol !== symbol);
}
```

### 3.4 Component Pattern

```typescript
// components/trading/position_list.tsx
import { positions, total_pnl } from '@/stores/trading.store';
import { PositionRow } from './position_row';

export function PositionList() {
  return (
    <div class="position-list">
      <header class="flex justify-between p-2 border-b">
        <span>Positions ({positions.value.length})</span>
        <span class={total_pnl.value >= 0 ? 'text-green-500' : 'text-red-500'}>
          {total_pnl.value.toFixed(2)} USDT
        </span>
      </header>

      <div class="overflow-auto">
        {positions.value.map(position => (
          <PositionRow key={position.symbol} position={position} />
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Migration Strategy

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish project structure and core infrastructure

- [ ] Initialize Vite + Preact + TypeScript project
- [ ] Configure ESLint, Prettier, Vitest
- [ ] Set up Tailwind CSS
- [ ] Create base layout components
- [ ] Implement auth service (clean rewrite)
- [ ] Set up CI/CD pipeline

### Phase 2: Data Layer (Week 3-4)

**Goal:** Port the worker architecture and establish data flow

- [ ] Port `exchange.worker.js` to TypeScript
- [ ] Create exchange adapters (Binance, Bybit, Hyperliquid)
- [ ] Implement reactive stores for ticker data
- [ ] Set up WebSocket connection management
- [ ] Add RxJS stream handling
- [ ] Write tests for data layer

### Phase 3: Trading Core (Week 5-6)

**Goal:** Extract and clean trading logic

- [ ] Define TypeScript types for orders, positions
- [ ] Implement order service (place, cancel, modify)
- [ ] Implement position tracking
- [ ] Add TP/SL logic
- [ ] Create trading hooks for components
- [ ] Comprehensive testing of trading logic

### Phase 4: Chart Integration (Week 7-8)

**Goal:** Clean Lightweight Charts integration

- [ ] Create chart wrapper component
- [ ] Implement candlestick data handling
- [ ] Add volume histogram
- [ ] Implement price lines (entry, liquidation, orders)
- [ ] Add drawing tools (simplified)
- [ ] Create mini chart component

### Phase 5: UI Components (Week 9-10)

**Goal:** Build out the interface

- [ ] Order panel component
- [ ] Position list component
- [ ] Ticker bar component
- [ ] News feed component
- [ ] Chat panel component
- [ ] Settings/preferences

### Phase 6: Polish & Migration (Week 11-12)

**Goal:** Feature parity and cutover

- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Error handling and recovery
- [ ] Analytics integration
- [ ] Documentation
- [ ] Parallel testing with v1
- [ ] Production deployment

---

## 5. Component Migration Map

| v1 File | v2 Location | Action |
|---------|-------------|--------|
| `terminal.page.js` | Multiple components | Decompose entirely |
| `terminal-state.service.js` | `stores/*.ts` | Rewrite with signals |
| `exchange.worker.js` | `workers/exchange.worker.ts` | Port to TypeScript |
| `chart.service.js` | `components/chart/` + `hooks/` | Decompose |
| `trading.service.js` | `services/trading/` | Extract, clean, test |
| `news-stream.service.js` | `services/news/` | Port with cleanup |
| `auth.service.js` | `services/auth/` | Clean rewrite |
| `chat-ui.module.js` | `components/chat/` | Rewrite in Preact |

---

## 6. TypeScript Type Definitions

A type-driven approach ensures compile-time safety and self-documenting code.

### 6.1 Core Trading Types

```typescript
// types/trading.types.ts

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entry_price: number;
  mark_price: number;
  liquidation_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  leverage: number;
  margin_type: 'cross' | 'isolated';
  created_at: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: OrderType;
  status: OrderStatus;
  price: number;
  size: number;
  filled_size: number;
  reduce_only: boolean;
  time_in_force: 'gtc' | 'ioc' | 'fok';
  created_at: number;
  updated_at: number;
}

export type OrderType = 'limit' | 'market' | 'stop_limit' | 'stop_market' | 'take_profit' | 'take_profit_market';
export type OrderStatus = 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';

export interface TpSlConfig {
  take_profit_price?: number;
  stop_loss_price?: number;
  trailing_stop_percent?: number;
}
```

### 6.2 Market Data Types

```typescript
// types/market.types.ts

export interface Ticker {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  price_change_24h: number;
  price_change_percent_24h: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  quote_volume_24h: number;
  updated_at: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export type Timeframe = '1s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
```

### 6.3 Exchange Types

```typescript
// types/exchange.types.ts

export type ExchangeId = 'binance' | 'bybit' | 'hyperliquid';

export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  ws_url: string;
  rest_url: string;
  rate_limits: RateLimits;
}

export interface RateLimits {
  orders_per_second: number;
  requests_per_minute: number;
}

export interface ExchangeCredentials {
  api_key: string;
  api_secret: string;
  passphrase?: string;
}

export interface ExchangeAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe_ticker(symbol: string): void;
  subscribe_candles(symbol: string, timeframe: Timeframe): void;
  subscribe_order_book(symbol: string): void;
  place_order(params: PlaceOrderParams): Promise<Order>;
  cancel_order(order_id: string, symbol: string): Promise<void>;
  get_positions(): Promise<Position[]>;
  get_open_orders(): Promise<Order[]>;
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: OrderType;
  size: number;
  price?: number;
  reduce_only?: boolean;
  tp_sl?: TpSlConfig;
}
```

### 6.4 WebSocket Message Types

```typescript
// types/websocket.types.ts

export type WorkerMessageType =
  | 'connect'
  | 'disconnect'
  | 'subscribe'
  | 'unsubscribe'
  | 'ticker_update'
  | 'candle_update'
  | 'order_update'
  | 'position_update'
  | 'error';

export interface WorkerMessage<T = unknown> {
  type: WorkerMessageType;
  exchange: ExchangeId;
  payload: T;
  timestamp: number;
}

export interface TickerUpdatePayload {
  symbol: string;
  ticker: Ticker;
}

export interface CandleUpdatePayload {
  symbol: string;
  timeframe: Timeframe;
  candle: Candle;
  is_closed: boolean;
}
```

### 6.5 API Response Types

```typescript
// types/api.types.ts

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
```

---

## 7. Success Criteria

### Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load (LCP) | < 2s |
| Bundle Size (gzipped) | < 200KB (excluding charts) |
| WebSocket Latency | < 50ms overhead |
| Chart Render (1000 candles) | < 100ms |
| Memory Usage | < 150MB |

### Quality Targets

| Metric | Target |
|--------|--------|
| Test Coverage | > 80% for services |
| TypeScript Strict Mode | Enabled |
| Zero ESLint Errors | Required |
| Lighthouse Score | > 90 |

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Feature parity delays | High | Prioritize core trading features |
| WebSocket edge cases | Medium | Port existing worker logic carefully |
| Chart integration issues | Medium | Prototype early |
| User migration resistance | Low | Run v1 and v2 in parallel |

---

## 9. Next Steps

1. **Create new repository:** `247-terminal-v2`
2. **Initialize project:** Vite + Preact + TypeScript
3. **Analyze exchange worker:** Document current WebSocket handling
4. **Prototype chart integration:** Verify Lightweight Charts + Preact works
5. **Begin Phase 1 implementation**

---

## Appendix: Quick Reference

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
npm run type-check   # TypeScript check
```

### Key Dependencies

```json
{
  "dependencies": {
    "preact": "^10.x",
    "@preact/signals": "^2.x",
    "lightweight-charts": "^5.x",
    "rxjs": "^7.x"
  },
  "devDependencies": {
    "vite": "^7.x",
    "typescript": "^5.x",
    "@preact/preset-vite": "^2.x",
    "@tailwindcss/vite": "^4.x",
    "tailwindcss": "^4.x",
    "daisyui": "^5.x",
    "vitest": "^4.x",
    "eslint": "^9.x",
    "prettier": "^3.x"
  }
}
```

**Note:** Tailwind CSS v4 uses the `@tailwindcss/vite` plugin instead of PostCSS. Configuration is done in CSS, not `tailwind.config.js`.
