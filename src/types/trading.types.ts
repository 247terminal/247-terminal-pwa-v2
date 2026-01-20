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
