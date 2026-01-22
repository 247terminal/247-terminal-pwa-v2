import binanceusdm from 'ccxt/js/src/pro/binanceusdm.js';
import blofin from 'ccxt/js/src/pro/blofin.js';
import bybit from 'ccxt/js/src/pro/bybit.js';
import hyperliquid from 'ccxt/js/src/pro/hyperliquid.js';
import { PROXY_CONFIG } from '@/config';
import {
    binance as binanceAdapter,
    bybit as bybitAdapter,
    blofin as blofinAdapter,
    hyperliquid as hyperliquidAdapter,
    type RawPosition,
    type RawOrder,
    type RawClosedPosition,
    type RawFill,
    type BinanceExchange,
    type BybitExchange,
    type BlofinExchange,
    type HyperliquidExchange,
} from './adapters';
import type { ExchangeId, CcxtExchange } from '@/types/worker.types';
import { mapPosition, mapOrder, mapClosedPosition } from './position_mappers';

export interface ExchangeAuthParams {
    api_key?: string;
    api_secret?: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
}

export interface MarketInfo {
    contract_size?: number;
}

export const authenticatedExchanges: Record<string, CcxtExchange> = {};

function getProxyOptions(exchangeId: ExchangeId): {
    proxy?: string;
    headers?: Record<string, string>;
} {
    const proxy = PROXY_CONFIG[exchangeId];
    if (!proxy) return {};
    return {
        proxy: proxy.url,
        headers: { 'x-proxy-auth': proxy.auth },
    };
}

export function createAuthenticatedExchange(
    exchangeId: ExchangeId,
    credentials: ExchangeAuthParams
): CcxtExchange {
    const proxyOptions = getProxyOptions(exchangeId);

    let instance: CcxtExchange;
    switch (exchangeId) {
        case 'binance':
            instance = new binanceusdm({
                ...proxyOptions,
                apiKey: credentials.api_key,
                secret: credentials.api_secret,
                options: { warnOnFetchOpenOrdersWithoutSymbol: false },
            }) as unknown as CcxtExchange;
            break;
        case 'bybit':
            instance = new bybit({
                apiKey: credentials.api_key,
                secret: credentials.api_secret,
            }) as unknown as CcxtExchange;
            break;
        case 'blofin':
            instance = new blofin({
                ...proxyOptions,
                apiKey: credentials.api_key,
                secret: credentials.api_secret,
                password: credentials.passphrase,
            }) as unknown as CcxtExchange;
            break;
        case 'hyperliquid':
            instance = new hyperliquid({
                walletAddress: credentials.wallet_address,
                privateKey: credentials.private_key,
            }) as unknown as CcxtExchange;
            break;
        default:
            throw new Error(`unsupported exchange: ${exchangeId}`);
    }

    instance.markets = {};
    instance.markets_by_id = {};
    return instance;
}

function getAuthenticatedExchange(exchangeId: ExchangeId): CcxtExchange {
    const instance = authenticatedExchanges[exchangeId];
    if (!instance) {
        throw new Error(`exchange ${exchangeId} not initialized`);
    }
    return instance;
}

export async function fetchAccountConfig(exchangeId: ExchangeId): Promise<{
    position_mode: 'one_way' | 'hedge';
    default_margin_mode: 'cross' | 'isolated';
}> {
    const exchange = getAuthenticatedExchange(exchangeId);
    let position_mode: 'one_way' | 'hedge' = 'one_way';

    switch (exchangeId) {
        case 'binance':
            position_mode = await binanceAdapter.fetch_position_mode(exchange as BinanceExchange);
            break;
        case 'bybit':
            position_mode = await bybitAdapter.fetch_position_mode(exchange as BybitExchange);
            break;
        case 'blofin':
            position_mode = await blofinAdapter.fetch_position_mode(exchange as BlofinExchange);
            break;
    }

    return { position_mode, default_margin_mode: 'cross' };
}

export async function fetchBalance(exchangeId: ExchangeId): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.fetch_balance(exchange as BinanceExchange);
            case 'bybit':
                return await bybitAdapter.fetch_balance(exchange as BybitExchange);
            case 'blofin':
                return await blofinAdapter.fetch_balance(exchange as BlofinExchange);
            case 'hyperliquid':
                return await hyperliquidAdapter.fetch_balance(exchange as HyperliquidExchange);
            default:
                return null;
        }
    } catch (err) {
        console.error(`failed to fetch ${exchangeId} balance:`, (err as Error).message);
        return null;
    }
}

export async function fetchPositions(
    exchangeId: ExchangeId,
    marketMap: Record<string, MarketInfo>
): Promise<ReturnType<typeof mapPosition>[]> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        let raw: RawPosition[] = [];

        switch (exchangeId) {
            case 'binance':
                raw = await binanceAdapter.fetch_positions(exchange as BinanceExchange);
                break;
            case 'bybit':
                raw = await bybitAdapter.fetch_positions(exchange as BybitExchange);
                break;
            case 'blofin':
                raw = await blofinAdapter.fetch_positions(exchange as BlofinExchange);
                break;
            case 'hyperliquid':
                raw = await hyperliquidAdapter.fetch_positions(exchange as HyperliquidExchange);
                break;
        }

        let count = 0;
        for (let i = 0; i < raw.length; i++) {
            if (Math.abs(raw[i].contracts) > 0) count++;
        }
        const result: ReturnType<typeof mapPosition>[] = new Array(count);
        let idx = 0;
        for (let i = 0; i < raw.length; i++) {
            if (Math.abs(raw[i].contracts) > 0) {
                result[idx++] = mapPosition(raw[i], exchangeId, marketMap);
            }
        }
        return result;
    } catch (err) {
        console.error(`failed to fetch ${exchangeId} positions:`, (err as Error).message);
        return [];
    }
}

export async function fetchOrders(
    exchangeId: ExchangeId,
    marketMap: Record<string, MarketInfo>
): Promise<ReturnType<typeof mapOrder>[]> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        let raw: RawOrder[] = [];

        switch (exchangeId) {
            case 'binance':
                raw = await binanceAdapter.fetch_orders(exchange as BinanceExchange);
                break;
            case 'bybit':
                raw = await bybitAdapter.fetch_orders(exchange as BybitExchange);
                break;
            case 'blofin':
                raw = await blofinAdapter.fetch_orders(exchange as BlofinExchange);
                break;
            case 'hyperliquid':
                raw = await hyperliquidAdapter.fetch_orders(exchange as HyperliquidExchange);
                break;
        }

        const result = new Array<ReturnType<typeof mapOrder>>(raw.length);
        for (let i = 0; i < raw.length; i++) {
            result[i] = mapOrder(raw[i], exchangeId, marketMap);
        }
        return result;
    } catch (err) {
        console.error(`failed to fetch ${exchangeId} orders:`, (err as Error).message);
        return [];
    }
}

export async function fetchAccountData(
    exchangeId: ExchangeId,
    marketMap: Record<string, MarketInfo>
): Promise<{
    balance: Awaited<ReturnType<typeof fetchBalance>>;
    positions: Awaited<ReturnType<typeof fetchPositions>>;
    orders: Awaited<ReturnType<typeof fetchOrders>>;
}> {
    const [balance, positions, orders] = await Promise.all([
        fetchBalance(exchangeId),
        fetchPositions(exchangeId, marketMap),
        fetchOrders(exchangeId, marketMap),
    ]);

    return { balance, positions, orders };
}

export async function fetchClosedPositions(
    exchangeId: ExchangeId,
    limit: number
): Promise<ReturnType<typeof mapClosedPosition>[]> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        let raw: RawClosedPosition[] = [];

        switch (exchangeId) {
            case 'binance':
                raw = await binanceAdapter.fetch_closed_positions(
                    exchange as BinanceExchange,
                    limit
                );
                break;
            case 'bybit':
                raw = await bybitAdapter.fetch_closed_positions(exchange as BybitExchange, limit);
                break;
            case 'blofin':
                raw = await blofinAdapter.fetch_closed_positions(exchange as BlofinExchange, limit);
                break;
            case 'hyperliquid':
                raw = await hyperliquidAdapter.fetch_closed_positions(
                    exchange as HyperliquidExchange,
                    limit
                );
                break;
        }

        const result = new Array<ReturnType<typeof mapClosedPosition>>(raw.length);
        for (let i = 0; i < raw.length; i++) {
            result[i] = mapClosedPosition(raw[i], exchangeId, i);
        }
        return result;
    } catch (err) {
        console.error(`failed to fetch ${exchangeId} closed positions:`, (err as Error).message);
        return [];
    }
}

export async function fetchLeverageSettings(
    exchangeId: ExchangeId,
    symbols: string[]
): Promise<Record<string, number>> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.fetch_leverage_settings(
                    exchange as BinanceExchange,
                    symbols
                );
            case 'blofin':
                return await blofinAdapter.fetch_leverage_settings(
                    exchange as BlofinExchange,
                    symbols
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.fetch_leverage_settings(
                    exchange as HyperliquidExchange,
                    symbols
                );
            case 'bybit':
                return {};
            default:
                return {};
        }
    } catch (err) {
        console.error(`failed to fetch ${exchangeId} leverage settings:`, (err as Error).message);
        return {};
    }
}

export async function fetchSymbolFills(
    exchangeId: ExchangeId,
    symbol: string,
    limit: number
): Promise<RawFill[]> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.fetch_symbol_fills(
                    exchange as BinanceExchange,
                    symbol,
                    limit
                );
            case 'bybit':
                return await bybitAdapter.fetch_symbol_fills(
                    exchange as BybitExchange,
                    symbol,
                    limit
                );
            case 'blofin':
                return await blofinAdapter.fetch_symbol_fills(
                    exchange as BlofinExchange,
                    symbol,
                    limit
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.fetch_symbol_fills(
                    exchange as HyperliquidExchange,
                    symbol,
                    limit
                );
            default:
                return [];
        }
    } catch (err) {
        console.error(`failed to fetch ${exchangeId} symbol fills:`, (err as Error).message);
        return [];
    }
}

export { hyperliquidAdapter };
