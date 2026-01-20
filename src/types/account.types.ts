import type { ExchangeId } from './exchange.types';

export interface Position {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entry_price: number;
    last_price: number;
    liquidation_price: number | null;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    margin: number;
    leverage: number;
    margin_mode: 'cross' | 'isolated';
    updated_at: number;
}

export interface Order {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market' | 'stop' | 'take_profit' | 'stop_loss';
    size: number;
    price: number;
    filled: number;
    status: 'open' | 'partial' | 'closed' | 'canceled';
    created_at: number;
}

export interface TradeHistory {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    entry_price: number;
    close_price: number;
    realized_pnl: number;
    realized_pnl_pct: number;
    closed_at: number;
}

export type AccountTab = 'positions' | 'orders' | 'history';
