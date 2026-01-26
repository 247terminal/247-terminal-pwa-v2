import type hyperliquid from 'ccxt/js/src/pro/hyperliquid.js';
import type { RawPosition, RawOrder, RawClosedPosition, RawFill } from '@/types/worker.types';
import { HYPERLIQUID_CACHE_TTL, EXCHANGE_CONFIG } from '@/config';
import type { ClosePositionParams, MarketOrderParams } from '@/types/trading.types';
import { split_quantity, round_quantity } from '../../utils/format';
import { hyperliquid as sym } from '../symbol_utils';

type BaseHyperliquidExchange = InstanceType<typeof hyperliquid>;

export interface HyperliquidExchange extends BaseHyperliquidExchange {
    publicPostInfo(params: Record<string, unknown>): Promise<unknown>;
}

interface ClearinghouseState {
    marginSummary?: { accountValue?: string; totalMarginUsed?: string };
    withdrawable?: string;
    assetPositions?: Array<{
        position: {
            coin: string;
            szi: number;
            entryPx: string;
            markPx: string;
            liquidationPx: string | null;
            unrealizedPnl: string;
            leverage: { value?: number; type?: string };
            marginUsed: string;
        };
    }>;
}

interface OpenOrder {
    coin: string;
    oid: number;
    side: string;
    sz: number;
    limitPx: string;
    timestamp: number;
    reduceOnly?: boolean;
    orderType?: string;
    triggerPx?: string;
    triggerCondition?: string;
}

interface UserFill {
    coin: string;
    oid: number;
    side: string;
    px: string;
    sz: string;
    closedPnl: string;
    time: number;
    dir: string;
}

interface ActiveAssetData {
    leverage?: {
        type?: string;
        value?: number;
    };
}

function is_clearinghouse_state(data: unknown): data is ClearinghouseState {
    return data !== null && typeof data === 'object';
}

function is_open_orders_array(data: unknown): data is OpenOrder[] {
    return Array.isArray(data);
}

function is_user_fills_array(data: unknown): data is UserFill[] {
    return Array.isArray(data);
}

let cached_state: { wallet: string; data: ClearinghouseState; timestamp: number } | null = null;
let pending_fetch: Promise<ClearinghouseState | null> | null = null;

async function get_clearinghouse_state(
    exchange: HyperliquidExchange
): Promise<ClearinghouseState | null> {
    const wallet = exchange.walletAddress;
    if (!wallet) return null;

    const now = Date.now();
    if (
        cached_state &&
        cached_state.wallet === wallet &&
        now - cached_state.timestamp < HYPERLIQUID_CACHE_TTL
    ) {
        return cached_state.data;
    }

    if (pending_fetch) return pending_fetch;

    pending_fetch = (async () => {
        try {
            const response = await exchange.publicPostInfo({
                type: 'clearinghouseState',
                user: wallet,
            });

            if (!is_clearinghouse_state(response)) return null;
            cached_state = { wallet, data: response, timestamp: Date.now() };
            return response;
        } finally {
            pending_fetch = null;
        }
    })();

    return pending_fetch;
}

export function clear_cache(): void {
    cached_state = null;
    pending_fetch = null;
}

export async function fetch_balance(exchange: HyperliquidExchange): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
    const state = await get_clearinghouse_state(exchange);
    if (!state?.marginSummary) return null;

    const margin = state.marginSummary;
    const total = parseFloat(margin.accountValue || '0');
    const available =
        parseFloat(state.withdrawable || '0') || total - parseFloat(margin.totalMarginUsed || '0');

    return {
        total,
        available,
        used: total - available,
        currency: 'USDC',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: HyperliquidExchange): Promise<RawPosition[]> {
    const state = await get_clearinghouse_state(exchange);
    if (!state?.assetPositions) return [];
    return state.assetPositions.map((item) => {
        const p = item.position;
        const szi = p.szi ?? 0;
        const lev = p.leverage;
        return {
            symbol: sym.toUnified(p.coin),
            contracts: Math.abs(szi),
            side: szi >= 0 ? 'long' : 'short',
            entry_price: p.entryPx,
            mark_price: p.markPx,
            liquidation_price: p.liquidationPx,
            unrealized_pnl: p.unrealizedPnl,
            leverage: lev?.value || 1,
            margin_mode: lev?.type === 'isolated' ? 'isolated' : 'cross',
            initial_margin: p.marginUsed,
        };
    });
}

export async function fetch_orders(exchange: HyperliquidExchange): Promise<RawOrder[]> {
    const wallet = exchange.walletAddress;
    if (!wallet) return [];
    const response = await exchange.publicPostInfo({
        type: 'openOrders',
        user: wallet,
    });
    if (!is_open_orders_array(response)) return [];
    return response.map((o) => {
        const is_sell = o.side === 'A';
        const has_trigger = o.triggerPx && Number(o.triggerPx) > 0;
        const trigger_above = o.triggerCondition === 'gt';

        let type: string;
        if (has_trigger || o.reduceOnly) {
            if (is_sell) {
                type = trigger_above ? 'take_profit' : 'stop_loss';
            } else {
                type = trigger_above ? 'stop_loss' : 'take_profit';
            }
        } else if (o.limitPx && Number(o.limitPx) > 0) {
            type = 'limit';
        } else {
            type = 'market';
        }

        return {
            symbol: sym.toUnified(o.coin),
            id: String(o.oid),
            side: o.side === 'B' ? 'buy' : 'sell',
            type,
            amount: Number(o.sz || 0),
            price: Number(o.triggerPx || o.limitPx || 0),
            filled: 0,
            timestamp: Number(o.timestamp || Date.now()),
            category: 'regular',
        };
    });
}

export async function fetch_closed_positions(
    exchange: HyperliquidExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const wallet = exchange.walletAddress;
    if (!wallet) return [];

    const response = await exchange.publicPostInfo({
        type: 'userFills',
        user: wallet,
    });
    if (!is_user_fills_array(response)) return [];

    const closed: RawClosedPosition[] = [];

    for (const fill of response) {
        const dir = fill.dir || '';

        const is_close_long = dir === 'Close Long';
        const is_close_short = dir === 'Close Short';
        if (!is_close_long && !is_close_short) continue;

        const pnl = Number(fill.closedPnl || 0);
        const price = Number(fill.px);
        const size = Number(fill.sz);
        const time = Number(fill.time) || Date.now();

        const position_side: 'long' | 'short' = is_close_long ? 'long' : 'short';

        const pnl_per_unit = size > 0 ? pnl / size : 0;
        const entry_price = position_side === 'long' ? price - pnl_per_unit : price + pnl_per_unit;

        closed.push({
            symbol: sym.toUnified(fill.coin),
            side: position_side,
            size,
            entry_price: Math.max(0, entry_price),
            exit_price: price,
            realized_pnl: pnl,
            close_time: time,
            leverage: 1,
        });
    }

    return closed.sort((a, b) => b.close_time - a.close_time).slice(0, limit);
}

const HYPERLIQUID_INFO_URL = `${EXCHANGE_CONFIG.hyperliquid.restUrl}/info`;

export async function set_leverage(
    exchange: HyperliquidExchange,
    symbol: string,
    leverage: number
): Promise<number> {
    await exchange.setLeverage(leverage, symbol);
    return leverage;
}

export async function fetch_leverage_settings(
    exchange: HyperliquidExchange,
    symbols: string[]
): Promise<Record<string, number>> {
    const wallet = exchange.walletAddress;
    if (!wallet || symbols.length === 0) return {};

    const leverages: Record<string, number> = {};

    const requests = symbols.map(async (symbol) => {
        const coin = sym.fromUnified(symbol);
        const response = await fetch(HYPERLIQUID_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'activeAssetData', user: wallet, coin }),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as ActiveAssetData;
        return { symbol, leverage: data?.leverage?.value };
    });

    const results = await Promise.allSettled(requests);

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.leverage) {
            leverages[result.value.symbol] = result.value.leverage;
        }
    }

    return leverages;
}

export async function fetch_symbol_fills(
    exchange: HyperliquidExchange,
    symbol: string,
    limit: number
): Promise<RawFill[]> {
    const wallet = exchange.walletAddress;
    if (!wallet) return [];

    const coin = sym.fromUnified(symbol);
    const response = await exchange.publicPostInfo({
        type: 'userFills',
        user: wallet,
    });
    if (!is_user_fills_array(response)) return [];

    const filtered = response.filter((f) => f.coin === coin).slice(0, limit);

    return filtered.map((f, idx) => {
        const is_buy = f.side === 'B';
        const dir = f.dir || '';
        const is_close = dir.startsWith('Close');
        return {
            id: `${f.time}-${idx}`,
            order_id: String(f.oid || `${f.time}-${idx}`),
            symbol: sym.toUnified(f.coin),
            side: is_buy ? 'buy' : 'sell',
            price: Number(f.px || 0),
            size: Number(f.sz || 0),
            time: Number(f.time || Date.now()),
            closed_pnl: Number(f.closedPnl || 0),
            direction: is_close ? 'close' : 'open',
        };
    });
}

export async function cancel_order(
    exchange: HyperliquidExchange,
    order_id: string,
    symbol: string
): Promise<boolean> {
    await exchange.cancelOrder(order_id, symbol);
    return true;
}

export async function cancel_all_orders(
    exchange: HyperliquidExchange,
    symbol?: string
): Promise<number> {
    const wallet = exchange.walletAddress;
    if (!wallet) return 0;

    const response = await exchange.publicPostInfo({
        type: 'openOrders',
        user: wallet,
    });
    if (!is_open_orders_array(response)) return 0;

    const orders_to_cancel = symbol
        ? response.filter((o) => o.coin === sym.fromUnified(symbol))
        : response;

    if (orders_to_cancel.length === 0) return 0;

    const by_coin: Record<string, string[]> = {};
    for (const o of orders_to_cancel) {
        if (!by_coin[o.coin]) by_coin[o.coin] = [];
        by_coin[o.coin].push(String(o.oid));
    }

    await Promise.all(
        Object.entries(by_coin).map(([coin, ids]) =>
            exchange.cancelOrders(ids, sym.toUnified(coin)).catch((err) => {
                console.error('failed to cancel orders:', (err as Error).message);
                return null;
            })
        )
    );

    return orders_to_cancel.length;
}

export async function close_position(
    exchange: HyperliquidExchange,
    params: ClosePositionParams
): Promise<boolean> {
    const close_size = round_quantity(params.size * (params.percentage / 100), params.qty_step);
    const order_side = params.side === 'long' ? 'sell' : 'buy';

    if (!close_size || close_size <= 0 || !isFinite(close_size)) {
        throw new Error('invalid close size');
    }

    const order_params: Record<string, unknown> = {
        reduceOnly: true,
    };

    const price = params.order_type === 'market' ? params.mark_price : params.limit_price;

    await exchange.createOrder(
        params.symbol,
        params.order_type,
        order_side,
        close_size,
        price,
        order_params
    );

    return true;
}

export async function place_market_order(
    exchange: HyperliquidExchange,
    params: MarketOrderParams
): Promise<boolean> {
    if (!params.size || params.size <= 0 || !isFinite(params.size)) {
        throw new Error('invalid order size');
    }

    const max_qty =
        params.max_market_qty && params.max_market_qty > 0 ? params.max_market_qty : params.size;
    const quantities = split_quantity(params.size, max_qty);

    if (quantities.length === 0) {
        throw new Error('no quantities to place');
    }

    const is_limit_ioc = params.slippage !== 'MARKET' && params.slippage && params.current_price;

    let limit_price: number | undefined;
    if (is_limit_ioc && params.current_price && typeof params.slippage === 'number') {
        const slippage_multiplier =
            params.side === 'buy' ? 1 + params.slippage / 100 : 1 - params.slippage / 100;
        limit_price = params.current_price * slippage_multiplier;
    }

    const order_type = is_limit_ioc ? 'limit' : 'market';
    const price = is_limit_ioc ? limit_price : params.current_price;

    const order_params: Record<string, unknown> = {};
    if (params.reduce_only) {
        order_params.reduceOnly = true;
    }
    if (is_limit_ioc) {
        order_params.timeInForce = 'Ioc';
    }

    const results = await Promise.all(
        quantities.map((qty) =>
            exchange
                .createOrder(
                    params.symbol,
                    order_type,
                    params.side,
                    round_quantity(qty, params.qty_step),
                    price,
                    order_params
                )
                .then(() => ({ success: true, error: null }))
                .catch((err) => {
                    console.error('hyperliquid order failed:', (err as Error).message);
                    return { success: false, error: err as Error };
                })
        )
    );

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
        const first_error = failed.find((r) => r.error)?.error;
        if (first_error) throw first_error;
        throw new Error(`${failed.length}/${quantities.length} orders failed`);
    }

    return true;
}
