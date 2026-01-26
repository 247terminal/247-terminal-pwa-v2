import type { ExchangeId } from './exchange.types';
import type { Position, Order } from './account.types';

export type PositionMode = 'one_way' | 'hedge';
export type MarginMode = 'cross' | 'isolated';

export interface ExchangeConfig {
    position_mode: PositionMode;
    default_margin_mode: MarginMode;
}

export interface SymbolSettings {
    leverage: number;
    margin_mode: MarginMode;
    max_market_qty: number;
    min_qty: number;
    qty_step: number;
}

export interface Balance {
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
}

export interface ExchangeAccountState {
    exchange_id: ExchangeId;
    connected: boolean;
    config: ExchangeConfig;
    symbol_settings: Record<string, SymbolSettings>;
    balance: Balance | null;
    positions: Position[];
    open_orders: Order[];
    ws_connected: boolean;
    ws_last_ping: number;
}

export type TradingAccounts = Partial<Record<ExchangeId, ExchangeAccountState>>;

export interface ClosePositionParams {
    symbol: string;
    side: 'long' | 'short';
    size: number;
    percentage: number;
    order_type: 'market' | 'limit';
    margin_mode: MarginMode;
    position_mode: PositionMode;
    limit_price?: number;
    mark_price?: number;
    max_market_qty?: number;
    qty_step?: number;
    contract_size?: number;
}

export interface MarketOrderParams {
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    margin_mode: MarginMode;
    position_mode: PositionMode;
    leverage: number;
    reduce_only?: boolean;
    slippage?: number | 'MARKET';
    current_price?: number;
    max_market_qty?: number;
    qty_step?: number;
    contract_size?: number;
}

export interface LimitOrderParams {
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    margin_mode: MarginMode;
    position_mode: PositionMode;
    leverage: number;
    post_only?: boolean;
    reduce_only?: boolean;
    qty_step?: number;
    tick_size?: number;
    contract_size?: number;
}
