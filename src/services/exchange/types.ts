export type ExchangeId = 'binance' | 'blofin' | 'hyperliquid' | 'bybit';

export const EXCHANGE_IDS: ExchangeId[] = ['binance', 'blofin', 'hyperliquid', 'bybit'];

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SymbolData {
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
    last_price: number | null;
    price_1m_ago: number | null;
    best_bid: number | null;
    best_ask: number | null;
    funding_rate: number | null;
    next_funding_time: number | null;
    price_24h: number | null;
    last_updated: number | null;
}

export interface ExchangeState {
    status: ConnectionStatus;
    error: string | null;
    last_connected: number | null;
}
