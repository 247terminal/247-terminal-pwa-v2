import { signal, type Signal } from '@preact/signals';
import {
    EXCHANGE_IDS,
    type ExchangeId,
    type ConnectionStatus,
    type SymbolData,
    type ExchangeState,
} from '../services/exchange/types';
import type { MarketData } from '../services/exchange/chart_data';

export interface TickerData {
    last_price: number;
    price_1m_ago: number | null;
    best_bid: number;
    best_ask: number;
    funding_rate: number | null;
    next_funding_time: number | null;
    price_24h: number | null;
    volume_24h: number | null;
    last_updated: number;
}

export interface TickerUpdate {
    symbol: string;
    last_price: number;
    best_bid: number;
    best_ask: number;
    funding_rate: number | null;
    next_funding_time: number | null;
    price_24h: number | null;
    volume_24h: number | null;
}

type MarketMap = Record<ExchangeId, Record<string, MarketData>>;

function create_initial_connections(): Record<ExchangeId, ExchangeState> {
    const result = {} as Record<ExchangeId, ExchangeState>;
    for (const id of EXCHANGE_IDS) {
        result[id] = { status: 'disconnected', error: null, last_connected: null };
    }
    return result;
}

function create_empty_map<T>(): Record<ExchangeId, Record<string, T>> {
    const result = {} as Record<ExchangeId, Record<string, T>>;
    for (const id of EXCHANGE_IDS) {
        result[id] = {};
    }
    return result;
}

export const connections = signal<Record<ExchangeId, ExchangeState>>(create_initial_connections());
export const markets = signal<MarketMap>(create_empty_map());

const ticker_signals = new Map<string, Signal<TickerData | null>>();

function get_ticker_key(exchange_id: ExchangeId, symbol: string): string {
    return `${exchange_id}:${symbol}`;
}

export function get_ticker_signal(
    exchange_id: ExchangeId,
    symbol: string
): Signal<TickerData | null> {
    const key = get_ticker_key(exchange_id, symbol);
    let sig = ticker_signals.get(key);
    if (!sig) {
        sig = signal<TickerData | null>(null);
        ticker_signals.set(key, sig);
    }
    return sig;
}

export function set_connection_status(
    exchange_id: ExchangeId,
    status: ConnectionStatus,
    error?: string
) {
    const current = connections.value[exchange_id];
    connections.value = {
        ...connections.value,
        [exchange_id]: {
            status,
            error: error ?? null,
            last_connected: status === 'connected' ? Date.now() : current.last_connected,
        },
    };
}

export function get_connection_status(exchange_id: ExchangeId): ConnectionStatus {
    return connections.value[exchange_id].status;
}

export function is_connected(exchange_id: ExchangeId): boolean {
    return connections.value[exchange_id].status === 'connected';
}

export function set_markets(exchange_id: ExchangeId, market_list: MarketData[]) {
    const market_map: Record<string, MarketData> = {};
    for (const m of market_list) {
        market_map[m.symbol] = m;
    }
    markets.value = { ...markets.value, [exchange_id]: market_map };
}

export function update_ticker(exchange_id: ExchangeId, ticker: TickerUpdate) {
    const sig = get_ticker_signal(exchange_id, ticker.symbol);
    const current = sig.value;
    sig.value = {
        last_price: ticker.last_price,
        price_1m_ago: current?.price_1m_ago ?? ticker.last_price,
        best_bid: ticker.best_bid,
        best_ask: ticker.best_ask,
        funding_rate: ticker.funding_rate,
        next_funding_time: ticker.next_funding_time,
        price_24h: ticker.price_24h,
        volume_24h: ticker.volume_24h,
        last_updated: Date.now(),
    };
}

export function update_tickers_batch(exchange_id: ExchangeId, ticker_list: TickerUpdate[]) {
    const now = Date.now();
    for (const ticker of ticker_list) {
        const sig = get_ticker_signal(exchange_id, ticker.symbol);
        const current = sig.value;
        sig.value = {
            last_price: ticker.last_price,
            price_1m_ago: current?.price_1m_ago ?? ticker.last_price,
            best_bid: ticker.best_bid,
            best_ask: ticker.best_ask,
            funding_rate: ticker.funding_rate,
            next_funding_time: ticker.next_funding_time,
            price_24h: ticker.price_24h,
            volume_24h: ticker.volume_24h,
            last_updated: now,
        };
    }
}

export function set_initial_tickers(
    exchange_id: ExchangeId,
    tickers: Record<
        string,
        { last_price: number; price_24h: number | null; volume_24h: number | null }
    >
): void {
    const now = Date.now();
    for (const [symbol, ticker] of Object.entries(tickers)) {
        const sig = get_ticker_signal(exchange_id, symbol);
        sig.value = {
            last_price: ticker.last_price,
            price_1m_ago: ticker.last_price,
            best_bid: 0,
            best_ask: 0,
            funding_rate: null,
            next_funding_time: null,
            price_24h: ticker.price_24h,
            volume_24h: ticker.volume_24h,
            last_updated: now,
        };
    }
}

export function update_ticker_price_1m_ago(exchange_id: ExchangeId, symbol: string) {
    const key = get_ticker_key(exchange_id, symbol);
    const sig = ticker_signals.get(key);
    if (!sig?.value) return;
    sig.value = { ...sig.value, price_1m_ago: sig.value.last_price };
}

export function get_ticker(exchange_id: ExchangeId, symbol: string): TickerData | null {
    const key = get_ticker_key(exchange_id, symbol);
    return ticker_signals.get(key)?.value ?? null;
}

export function get_symbol(exchange_id: ExchangeId, symbol: string): SymbolData | null {
    const market = markets.value[exchange_id][symbol];
    if (!market) return null;

    const ticker = get_ticker(exchange_id, symbol);
    return {
        ...market,
        last_price: ticker?.last_price ?? null,
        price_1m_ago: ticker?.price_1m_ago ?? null,
        best_bid: ticker?.best_bid ?? null,
        best_ask: ticker?.best_ask ?? null,
        funding_rate: ticker?.funding_rate ?? null,
        next_funding_time: ticker?.next_funding_time ?? null,
        price_24h: ticker?.price_24h ?? null,
        volume_24h: ticker?.volume_24h ?? null,
        last_updated: ticker?.last_updated ?? null,
    };
}

export function get_market(exchange_id: ExchangeId, symbol: string): MarketData | null {
    return markets.value[exchange_id][symbol] ?? null;
}

export function get_exchange_markets(exchange_id: ExchangeId): Record<string, MarketData> {
    return markets.value[exchange_id];
}

export function get_symbol_list(exchange_id: ExchangeId): string[] {
    return Object.keys(markets.value[exchange_id]).sort();
}

export function get_all_symbol_lists(): Record<ExchangeId, string[]> {
    const result = {} as Record<ExchangeId, string[]>;
    for (const id of EXCHANGE_IDS) {
        result[id] = get_symbol_list(id);
    }
    return result;
}

export function has_markets(exchange_id: ExchangeId): boolean {
    return Object.keys(markets.value[exchange_id]).length > 0;
}

export function clear_ticker_signals() {
    ticker_signals.clear();
}
