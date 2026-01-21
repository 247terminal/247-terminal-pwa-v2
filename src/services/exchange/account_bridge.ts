import type { ExchangeId } from '@/types/exchange.types';
import type { PositionMode, MarginMode, Balance } from '@/types/trading.types';
import type { Position, Order, TradeHistory } from '@/types/account.types';
import { getWorker, sendRequest } from './chart_data';
import { get_exchange_markets } from '@/stores/exchange_store';
import { MARKET_MAP_CACHE_TTL } from '@/config';

interface AccountConfig {
    position_mode: PositionMode;
    default_margin_mode: MarginMode;
}

interface AccountData {
    balance: Balance | null;
    positions: Position[];
    orders: Order[];
}

interface ExchangeAuthParams {
    api_key?: string;
    api_secret?: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
}

interface MarketInfo {
    contract_size?: number;
}

interface CachedMarketMap {
    data: Record<string, MarketInfo>;
    timestamp: number;
}

const initializedExchanges = new Set<ExchangeId>();
const marketMapCache = new Map<ExchangeId, CachedMarketMap>();
const inflightRequests = new Map<string, Promise<unknown>>();

function getMarketMap(exchangeId: ExchangeId): Record<string, MarketInfo> {
    const now = Date.now();
    const cached = marketMapCache.get(exchangeId);

    if (cached && now - cached.timestamp < MARKET_MAP_CACHE_TTL) {
        return cached.data;
    }

    const markets = get_exchange_markets(exchangeId);
    const result: Record<string, MarketInfo> = {};

    for (const symbol in markets) {
        result[symbol] = { contract_size: markets[symbol].contract_size };
    }

    marketMapCache.set(exchangeId, { data: result, timestamp: now });
    return result;
}

function dedupeRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflightRequests.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fn().finally(() => {
        inflightRequests.delete(key);
    });

    inflightRequests.set(key, promise);
    return promise;
}

export async function init_exchange(
    exchangeId: ExchangeId,
    credentials: ExchangeAuthParams
): Promise<void> {
    getWorker();
    await sendRequest<{ initialized: boolean }>('INIT_EXCHANGE', {
        exchangeId,
        credentials,
    });
    initializedExchanges.add(exchangeId);
    marketMapCache.delete(exchangeId);
}

export async function destroy_exchange(exchangeId: ExchangeId): Promise<void> {
    await sendRequest<{ destroyed: boolean }>('DESTROY_EXCHANGE', { exchangeId });
    initializedExchanges.delete(exchangeId);
    marketMapCache.delete(exchangeId);
}

export function destroy_all_exchanges(): void {
    for (const exchangeId of initializedExchanges) {
        sendRequest<{ destroyed: boolean }>('DESTROY_EXCHANGE', { exchangeId }).catch((err) => {
            console.error('failed to destroy exchange:', exchangeId, (err as Error).message);
        });
    }
    initializedExchanges.clear();
    marketMapCache.clear();
}

export function has_exchange(exchangeId: ExchangeId): boolean {
    return initializedExchanges.has(exchangeId);
}

export function fetch_account_config(exchangeId: ExchangeId): Promise<AccountConfig> {
    return dedupeRequest(`config:${exchangeId}`, () =>
        sendRequest<AccountConfig>('FETCH_ACCOUNT_CONFIG', { exchangeId })
    );
}

export function fetch_balance(exchangeId: ExchangeId): Promise<Balance | null> {
    return dedupeRequest(`balance:${exchangeId}`, () =>
        sendRequest<Balance | null>('FETCH_BALANCE', { exchangeId })
    );
}

export function fetch_positions(exchangeId: ExchangeId): Promise<Position[]> {
    return dedupeRequest(`positions:${exchangeId}`, () => {
        const marketMap = getMarketMap(exchangeId);
        return sendRequest<Position[]>('FETCH_POSITIONS', { exchangeId, marketMap });
    });
}

export function fetch_orders(exchangeId: ExchangeId): Promise<Order[]> {
    return dedupeRequest(`orders:${exchangeId}`, () => {
        const marketMap = getMarketMap(exchangeId);
        return sendRequest<Order[]>('FETCH_ORDERS', { exchangeId, marketMap });
    });
}

export function fetch_account_data(exchangeId: ExchangeId): Promise<AccountData> {
    return dedupeRequest(`account:${exchangeId}`, () => {
        const marketMap = getMarketMap(exchangeId);
        return sendRequest<AccountData>('FETCH_ACCOUNT_DATA', { exchangeId, marketMap });
    });
}

export function fetch_closed_positions(
    exchangeId: ExchangeId,
    limit = 50
): Promise<TradeHistory[]> {
    return dedupeRequest(`closed:${exchangeId}`, () =>
        sendRequest<TradeHistory[]>('FETCH_CLOSED_POSITIONS', { exchangeId, limit })
    );
}

export function fetch_leverage_settings(
    exchangeId: ExchangeId,
    symbols: string[]
): Promise<Record<string, number>> {
    if (symbols.length === 0) return Promise.resolve({});
    const key = `leverage:${exchangeId}:${symbols.sort().join(',')}`;
    return dedupeRequest(key, () =>
        sendRequest<Record<string, number>>('FETCH_LEVERAGE_SETTINGS', { exchangeId, symbols })
    );
}
