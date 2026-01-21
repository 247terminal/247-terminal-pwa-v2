import { signal, batch, type Signal } from '@preact/signals';
import {
    EXCHANGE_IDS,
    type ExchangeId,
    type ConnectionStatus,
    type SymbolData,
    type ExchangeState,
    type TickerData,
    type TickerUpdate,
    type StreamTickerUpdate,
    type BidAskUpdate,
    type PriceUpdate,
    type FundingInfo,
} from '../types/exchange.types';
import type { MarketData } from '../services/exchange/chart_data';
import type { MarketCapData } from '../types/chart.types';
import { get_token } from '../services/auth/session.service';
import { config } from '../config';
import { MARKET_CAP_CONSTANTS } from '../config/chart.constants';

export type { TickerData, TickerUpdate, StreamTickerUpdate, BidAskUpdate, PriceUpdate };

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
    const current = connections.value;
    const prev = current[exchange_id];
    const next: ExchangeState = {
        status,
        error: error ?? null,
        last_connected: status === 'connected' ? Date.now() : prev.last_connected,
    };

    if (
        prev.status === next.status &&
        prev.error === next.error &&
        prev.last_connected === next.last_connected
    ) {
        return;
    }

    const updated = Object.assign({}, current);
    updated[exchange_id] = next;
    connections.value = updated;
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
    batch(() => {
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
    });
}

export function update_ticker_stream_batch(
    exchange_id: ExchangeId,
    ticker_list: StreamTickerUpdate[],
    count?: number
) {
    const now = Date.now();
    const len = count ?? ticker_list.length;
    batch(() => {
        for (let i = 0; i < len; i++) {
            const ticker = ticker_list[i];
            const sig = get_ticker_signal(exchange_id, ticker.symbol);
            const current = sig.value;
            const last_price = ticker.last_price ?? current?.last_price ?? 0;
            sig.value = {
                last_price,
                price_1m_ago: current?.price_1m_ago ?? last_price,
                best_bid: ticker.best_bid ?? current?.best_bid ?? 0,
                best_ask: ticker.best_ask ?? current?.best_ask ?? 0,
                funding_rate: ticker.funding_rate ?? current?.funding_rate ?? null,
                next_funding_time: ticker.next_funding_time ?? current?.next_funding_time ?? null,
                price_24h: ticker.price_24h ?? current?.price_24h ?? null,
                volume_24h: ticker.volume_24h ?? current?.volume_24h ?? null,
                last_updated: now,
            };
        }
    });
}

export function update_bidask_batch(exchange_id: ExchangeId, bidask_list: BidAskUpdate[]) {
    batch(() => {
        for (const bidask of bidask_list) {
            const sig = get_ticker_signal(exchange_id, bidask.symbol);
            const current = sig.value;
            if (!current) continue;
            sig.value = {
                ...current,
                best_bid: bidask.best_bid,
                best_ask: bidask.best_ask,
            };
        }
    });
}

export function update_price_batch(exchange_id: ExchangeId, price_list: PriceUpdate[]) {
    const now = Date.now();
    batch(() => {
        for (const price of price_list) {
            const sig = get_ticker_signal(exchange_id, price.symbol);
            const current = sig.value;
            if (!current) continue;
            sig.value = {
                ...current,
                last_price: price.last_price,
                last_updated: now,
            };
        }
    });
}

export function set_initial_tickers(
    exchange_id: ExchangeId,
    tickers: Record<
        string,
        { last_price: number; price_24h: number | null; volume_24h: number | null }
    >
): void {
    const now = Date.now();
    batch(() => {
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
    });
}

export function update_initial_funding(
    exchange_id: ExchangeId,
    funding_rates: Record<string, FundingInfo>
): void {
    batch(() => {
        for (const [symbol, funding] of Object.entries(funding_rates)) {
            const sig = get_ticker_signal(exchange_id, symbol);
            const current = sig.value;
            if (!current) continue;
            sig.value = {
                ...current,
                funding_rate: funding.funding_rate,
                next_funding_time: funding.next_funding_time,
            };
        }
    });
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

export function clear_exchange_ticker_signals(exchange_id: ExchangeId) {
    const prefix = `${exchange_id}:`;
    for (const key of ticker_signals.keys()) {
        if (key.startsWith(prefix)) {
            ticker_signals.delete(key);
        }
    }
}

export const circulating_supply = signal<Record<string, number>>({});

let market_cap_last_fetch = 0;
let market_cap_fetch_promise: Promise<void> | null = null;
let market_cap_abort_controller: AbortController | null = null;

async function fetch_circulating_supply(): Promise<void> {
    const token = get_token();
    if (!token) return;

    if (market_cap_abort_controller) {
        market_cap_abort_controller.abort();
    }
    market_cap_abort_controller = new AbortController();

    try {
        const response = await fetch(`${config.api_base_url}/v1/data/market-caps`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept-Encoding': 'gzip',
            },
            signal: market_cap_abort_controller.signal,
        });

        if (!response.ok) return;

        const data: MarketCapData[] = await response.json();
        const supply_map: Record<string, number> = {};

        for (const item of data) {
            supply_map[item.symbol] = item.circulatingSupply;
        }

        circulating_supply.value = supply_map;
        market_cap_last_fetch = Date.now();
    } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('failed to fetch circulating supply:', (err as Error).message);
    } finally {
        market_cap_abort_controller = null;
    }
}

export function get_circulating_supply(base_symbol: string): number | null {
    return circulating_supply.value[base_symbol] ?? null;
}

export function ensure_circulating_supply_loaded(): void {
    const now = Date.now();
    if (now - market_cap_last_fetch < MARKET_CAP_CONSTANTS.CACHE_TTL_MS) return;
    if (market_cap_fetch_promise) return;

    market_cap_fetch_promise = fetch_circulating_supply().finally(() => {
        market_cap_fetch_promise = null;
    });
}

export const symbol_leverage =
    signal<Record<ExchangeId, Record<string, number>>>(create_empty_map());

export function set_symbol_leverages(
    exchange_id: ExchangeId,
    leverages: Record<string, number>
): void {
    const current = symbol_leverage.value[exchange_id];
    symbol_leverage.value = {
        ...symbol_leverage.value,
        [exchange_id]: { ...current, ...leverages },
    };
}

export function get_symbol_leverage(exchange_id: ExchangeId, symbol: string): number | null {
    return symbol_leverage.value[exchange_id]?.[symbol] ?? null;
}

export function get_missing_leverage_symbols(exchange_id: ExchangeId, symbols: string[]): string[] {
    const cached = symbol_leverage.value[exchange_id] ?? {};
    return symbols.filter((s) => !(s in cached));
}
