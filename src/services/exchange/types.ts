export type ExchangeId = 'binance' | 'blofin' | 'hyperliquid' | 'bybit';

export const EXCHANGE_IDS: ExchangeId[] = ['binance', 'blofin', 'hyperliquid', 'bybit'];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MarketInfo {
    symbol: string;
    base: string;
    quote: string;
    settle: string;
    active: boolean;
    type: string;
    tick_size: number;
    min_qty: number;
    max_qty: number;
    qty_step: number;
    contract_size: number;
    max_leverage: number | null;
}

export interface TickerData {
    symbol: string;
    last_price: number;
    price_1m_ago: number | null;
    best_bid: number;
    best_ask: number;
    funding_rate: number | null;
    next_funding_time: number | null;
    price_24h: number | null;
    timestamp: number;
}

export interface ExchangeState {
    status: ConnectionStatus;
    error: string | null;
    last_connected: number | null;
}
