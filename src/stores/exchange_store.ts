import { signal } from '@preact/signals';
import {
    EXCHANGE_IDS,
    type ExchangeId,
    type ConnectionStatus,
    type TickerData,
    type MarketInfo,
    type ExchangeState,
} from '../services/exchange/types';

function create_initial_connections(): Record<ExchangeId, ExchangeState> {
    const result = {} as Record<ExchangeId, ExchangeState>;
    for (const id of EXCHANGE_IDS) {
        result[id] = { status: 'disconnected', error: null, last_connected: null };
    }
    return result;
}

function create_empty_exchange_map<T>(): Record<ExchangeId, Record<string, T>> {
    const result = {} as Record<ExchangeId, Record<string, T>>;
    for (const id of EXCHANGE_IDS) {
        result[id] = {};
    }
    return result;
}

export const connections = signal<Record<ExchangeId, ExchangeState>>(create_initial_connections());
export const tickers = signal<Record<ExchangeId, Record<string, TickerData>>>(
    create_empty_exchange_map()
);
export const markets = signal<Record<ExchangeId, Record<string, MarketInfo>>>(
    create_empty_exchange_map()
);

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

export function update_ticker(exchange_id: ExchangeId, ticker: TickerData) {
    const exchange_tickers = tickers.value[exchange_id];
    const current = exchange_tickers[ticker.symbol];
    const updated = { ...ticker, price_1m_ago: current?.price_1m_ago ?? ticker.last_price };

    tickers.value = {
        ...tickers.value,
        [exchange_id]: { ...exchange_tickers, [ticker.symbol]: updated },
    };
}

export function update_tickers_batch(exchange_id: ExchangeId, ticker_list: TickerData[]) {
    const exchange_tickers = tickers.value[exchange_id];
    const updated_tickers = { ...exchange_tickers };

    for (const ticker of ticker_list) {
        const current = exchange_tickers[ticker.symbol];
        updated_tickers[ticker.symbol] = {
            ...ticker,
            price_1m_ago: current?.price_1m_ago ?? ticker.last_price,
        };
    }

    tickers.value = { ...tickers.value, [exchange_id]: updated_tickers };
}

export function update_ticker_price_1m_ago(exchange_id: ExchangeId, symbol: string) {
    const exchange_tickers = tickers.value[exchange_id];
    const current = exchange_tickers[symbol];
    if (!current) return;

    tickers.value = {
        ...tickers.value,
        [exchange_id]: {
            ...exchange_tickers,
            [symbol]: { ...current, price_1m_ago: current.last_price },
        },
    };
}

export function get_ticker(exchange_id: ExchangeId, symbol: string): TickerData | null {
    return tickers.value[exchange_id][symbol] ?? null;
}

export function get_all_tickers(exchange_id: ExchangeId): Record<string, TickerData> {
    return tickers.value[exchange_id];
}

export function set_markets(exchange_id: ExchangeId, market_list: MarketInfo[]) {
    const market_map: Record<string, MarketInfo> = {};
    for (const m of market_list) {
        market_map[m.symbol] = m;
    }
    markets.value = { ...markets.value, [exchange_id]: market_map };
}

export function get_market(exchange_id: ExchangeId, symbol: string): MarketInfo | null {
    return markets.value[exchange_id][symbol] ?? null;
}

export function get_exchange_markets(exchange_id: ExchangeId): Record<string, MarketInfo> {
    return markets.value[exchange_id];
}

export function get_exchange_symbols(exchange_id: ExchangeId): string[] {
    return Object.keys(markets.value[exchange_id]).sort();
}

export function get_all_symbols(): Record<ExchangeId, string[]> {
    const result = {} as Record<ExchangeId, string[]>;
    for (const id of EXCHANGE_IDS) {
        result[id] = get_exchange_symbols(id);
    }
    return result;
}

export function has_markets(exchange_id: ExchangeId): boolean {
    return Object.keys(markets.value[exchange_id]).length > 0;
}
