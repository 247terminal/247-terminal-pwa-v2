import type { ExchangeId } from './exchange.types';
import type { MarginMode } from './trading.types';

export type TwapStatus = 'active' | 'completed' | 'cancelled' | 'error';

export interface TwapOrder {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    total_size_usd: number;
    orders_count: number;
    duration_minutes: number;
    interval_ms: number;
    size_per_order_usd: number;
    status: TwapStatus;
    orders_placed: number;
    orders_failed: number;
    started_at: number;
}

export interface TwapStartParams {
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    total_size_usd: number;
    orders_count: number;
    duration_minutes: number;
}

export interface TwapProgressUpdate {
    id: string;
    orders_placed: number;
    orders_failed: number;
    status: TwapStatus;
}

export interface TwapWorkerParams extends TwapStartParams {
    leverage: number;
    margin_mode: MarginMode;
    current_price: number;
    max_market_qty?: number;
    qty_step?: number;
    contract_size?: number;
    slippage?: number | 'MARKET';
}
