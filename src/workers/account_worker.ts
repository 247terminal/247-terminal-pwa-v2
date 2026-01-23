import {
    getExchange,
    setExchangeAuth,
    clearExchangeAuth,
    isExchangeAuthenticated,
    type ExchangeAuthParams,
} from './data_fetchers';
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
    type ClosePositionParams,
} from './adapters';
import type { ExchangeId, CcxtExchange, OrderCategory } from '@/types/worker.types';
import { mapPosition, mapOrder, mapClosedPosition } from './position_mappers';

export type { ExchangeAuthParams };

export interface MarketInfo {
    contract_size?: number;
}

const positionModeCache = new Map<ExchangeId, 'one_way' | 'hedge'>();

export function getPositionMode(exchangeId: ExchangeId): 'one_way' | 'hedge' {
    return positionModeCache.get(exchangeId) ?? 'one_way';
}

export function createAuthenticatedExchange(
    exchangeId: ExchangeId,
    credentials: ExchangeAuthParams
): CcxtExchange {
    setExchangeAuth(exchangeId, credentials);
    return getExchange(exchangeId);
}

export function destroyAuthenticatedExchange(exchangeId: ExchangeId): void {
    clearExchangeAuth(exchangeId);
    positionModeCache.delete(exchangeId);
}

function getAuthenticatedExchange(exchangeId: ExchangeId): CcxtExchange {
    if (!isExchangeAuthenticated(exchangeId)) {
        throw new Error(`exchange ${exchangeId} not initialized`);
    }
    return getExchange(exchangeId);
}

export async function fetchAccountConfig(exchangeId: ExchangeId): Promise<{
    position_mode: 'one_way' | 'hedge';
    default_margin_mode: 'cross' | 'isolated';
}> {
    const exchange = getAuthenticatedExchange(exchangeId);
    let position_mode: 'one_way' | 'hedge' = 'one_way';

    switch (exchangeId) {
        case 'binance':
            position_mode = await binanceAdapter.fetch_position_mode(
                exchange as unknown as BinanceExchange
            );
            break;
        case 'bybit':
            position_mode = await bybitAdapter.fetch_position_mode(
                exchange as unknown as BybitExchange
            );
            break;
        case 'blofin':
            position_mode = await blofinAdapter.fetch_position_mode(
                exchange as unknown as BlofinExchange
            );
            break;
    }

    positionModeCache.set(exchangeId, position_mode);
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
                return await binanceAdapter.fetch_balance(exchange as unknown as BinanceExchange);
            case 'bybit':
                return await bybitAdapter.fetch_balance(exchange as unknown as BybitExchange);
            case 'blofin':
                return await blofinAdapter.fetch_balance(exchange as unknown as BlofinExchange);
            case 'hyperliquid':
                return await hyperliquidAdapter.fetch_balance(
                    exchange as unknown as HyperliquidExchange
                );
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
                raw = await binanceAdapter.fetch_positions(exchange as unknown as BinanceExchange);
                break;
            case 'bybit':
                raw = await bybitAdapter.fetch_positions(exchange as unknown as BybitExchange);
                break;
            case 'blofin':
                raw = await blofinAdapter.fetch_positions(exchange as unknown as BlofinExchange);
                break;
            case 'hyperliquid':
                raw = await hyperliquidAdapter.fetch_positions(
                    exchange as unknown as HyperliquidExchange
                );
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
                raw = await binanceAdapter.fetch_orders(exchange as unknown as BinanceExchange);
                break;
            case 'bybit':
                raw = await bybitAdapter.fetch_orders(exchange as unknown as BybitExchange);
                break;
            case 'blofin':
                raw = await blofinAdapter.fetch_orders(exchange as unknown as BlofinExchange);
                break;
            case 'hyperliquid':
                raw = await hyperliquidAdapter.fetch_orders(
                    exchange as unknown as HyperliquidExchange
                );
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
    limit: number,
    marketMap?: Record<string, MarketInfo>
): Promise<ReturnType<typeof mapClosedPosition>[]> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        let raw: RawClosedPosition[] = [];

        switch (exchangeId) {
            case 'binance':
                raw = await binanceAdapter.fetch_closed_positions(
                    exchange as unknown as BinanceExchange,
                    limit
                );
                break;
            case 'bybit':
                raw = await bybitAdapter.fetch_closed_positions(
                    exchange as unknown as BybitExchange,
                    limit
                );
                break;
            case 'blofin': {
                let contract_values: Record<string, number> | undefined;
                if (marketMap) {
                    contract_values = {};
                    for (const symbol in marketMap) {
                        const cs = marketMap[symbol].contract_size;
                        if (cs && cs > 0) contract_values[symbol] = cs;
                    }
                }
                raw = await blofinAdapter.fetch_closed_positions(
                    exchange as unknown as BlofinExchange,
                    limit,
                    contract_values
                );
                break;
            }
            case 'hyperliquid':
                raw = await hyperliquidAdapter.fetch_closed_positions(
                    exchange as unknown as HyperliquidExchange,
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
                    exchange as unknown as BinanceExchange,
                    symbols
                );
            case 'blofin':
                return await blofinAdapter.fetch_leverage_settings(
                    exchange as unknown as BlofinExchange,
                    symbols
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.fetch_leverage_settings(
                    exchange as unknown as HyperliquidExchange,
                    symbols
                );
            case 'bybit':
                return await bybitAdapter.fetch_leverage_settings(
                    exchange as unknown as BybitExchange,
                    symbols
                );
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
    limit: number,
    marketMap?: Record<string, MarketInfo>
): Promise<RawFill[]> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.fetch_symbol_fills(
                    exchange as unknown as BinanceExchange,
                    symbol,
                    limit
                );
            case 'bybit':
                return await bybitAdapter.fetch_symbol_fills(
                    exchange as unknown as BybitExchange,
                    symbol,
                    limit
                );
            case 'blofin': {
                const contract_size = marketMap?.[symbol]?.contract_size;
                return await blofinAdapter.fetch_symbol_fills(
                    exchange as unknown as BlofinExchange,
                    symbol,
                    limit,
                    contract_size
                );
            }
            case 'hyperliquid':
                return await hyperliquidAdapter.fetch_symbol_fills(
                    exchange as unknown as HyperliquidExchange,
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

export async function setLeverage(
    exchangeId: ExchangeId,
    symbol: string,
    leverage: number
): Promise<number> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.set_leverage(
                    exchange as unknown as BinanceExchange,
                    symbol,
                    leverage
                );
            case 'bybit':
                return await bybitAdapter.set_leverage(
                    exchange as unknown as BybitExchange,
                    symbol,
                    leverage
                );
            case 'blofin':
                return await blofinAdapter.set_leverage(
                    exchange as unknown as BlofinExchange,
                    symbol,
                    leverage
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.set_leverage(
                    exchange as unknown as HyperliquidExchange,
                    symbol,
                    leverage
                );
            default:
                return leverage;
        }
    } catch (err) {
        console.error(`failed to set ${exchangeId} leverage:`, (err as Error).message);
        throw err;
    }
}

export async function cancelOrder(
    exchangeId: ExchangeId,
    orderId: string,
    symbol: string,
    category: OrderCategory
): Promise<boolean> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.cancel_order(
                    exchange as unknown as BinanceExchange,
                    orderId,
                    symbol,
                    category
                );
            case 'bybit':
                return await bybitAdapter.cancel_order(
                    exchange as unknown as BybitExchange,
                    orderId,
                    symbol,
                    category
                );
            case 'blofin':
                return await blofinAdapter.cancel_order(
                    exchange as unknown as BlofinExchange,
                    orderId,
                    symbol,
                    category
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.cancel_order(
                    exchange as unknown as HyperliquidExchange,
                    orderId,
                    symbol,
                    category
                );
            default:
                return false;
        }
    } catch (err) {
        console.error(`failed to cancel ${exchangeId} order:`, (err as Error).message);
        throw err;
    }
}

export async function cancelAllOrders(exchangeId: ExchangeId, symbol?: string): Promise<number> {
    const exchange = getAuthenticatedExchange(exchangeId);

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.cancel_all_orders(
                    exchange as unknown as BinanceExchange,
                    symbol
                );
            case 'bybit':
                return await bybitAdapter.cancel_all_orders(
                    exchange as unknown as BybitExchange,
                    symbol
                );
            case 'blofin':
                return await blofinAdapter.cancel_all_orders(
                    exchange as unknown as BlofinExchange,
                    symbol
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.cancel_all_orders(
                    exchange as unknown as HyperliquidExchange,
                    symbol
                );
            default:
                return 0;
        }
    } catch (err) {
        console.error(`failed to cancel all ${exchangeId} orders:`, (err as Error).message);
        throw err;
    }
}

export async function closePosition(
    exchangeId: ExchangeId,
    params: Omit<ClosePositionParams, 'position_mode'>
): Promise<boolean> {
    const exchange = getAuthenticatedExchange(exchangeId);
    const fullParams: ClosePositionParams = {
        ...params,
        position_mode: getPositionMode(exchangeId),
    };

    try {
        switch (exchangeId) {
            case 'binance':
                return await binanceAdapter.close_position(
                    exchange as unknown as BinanceExchange,
                    fullParams
                );
            case 'bybit':
                return await bybitAdapter.close_position(
                    exchange as unknown as BybitExchange,
                    fullParams
                );
            case 'blofin':
                return await blofinAdapter.close_position(
                    exchange as unknown as BlofinExchange,
                    fullParams
                );
            case 'hyperliquid':
                return await hyperliquidAdapter.close_position(
                    exchange as unknown as HyperliquidExchange,
                    fullParams
                );
            default:
                return false;
        }
    } catch (err) {
        console.error(`failed to close ${exchangeId} position:`, (err as Error).message);
        throw err;
    }
}

export { hyperliquidAdapter };
