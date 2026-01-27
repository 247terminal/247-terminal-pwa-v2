import type bybit from 'ccxt/js/src/pro/bybit.js';
import type { RawPosition, RawOrder, RawClosedPosition, RawFill } from '@/types/worker.types';
import { HISTORY_FETCH_CONSTANTS } from '@/config/chart.constants';
import { ORDER_BATCH_CONSTANTS } from '@/config/trading.constants';
import type {
    ClosePositionParams,
    MarketOrderParams,
    LimitOrderParams,
    BatchLimitOrderParams,
    TpSlParams,
} from '@/types/trading.types';
import { bybit as sym } from '../symbol_utils';
import { split_quantity, round_quantity_string, round_price_string } from '../../utils/format';
import { hasResultProperty } from './type_guards';

type BaseBybitExchange = InstanceType<typeof bybit>;

export interface BybitExchange extends BaseBybitExchange {
    privateGetV5PositionList(params: Record<string, unknown>): Promise<unknown>;
    privateGetV5AccountWalletBalance(params: Record<string, unknown>): Promise<unknown>;
    privateGetV5OrderRealtime(params: Record<string, unknown>): Promise<unknown>;
    privateGetV5PositionClosedPnl(params: Record<string, unknown>): Promise<unknown>;
    privateGetV5ExecutionList(params: Record<string, unknown>): Promise<unknown>;
    privatePostV5OrderCancel(params: Record<string, unknown>): Promise<unknown>;
    privatePostV5OrderCancelAll(params: Record<string, unknown>): Promise<unknown>;
    privatePostV5OrderCreate(params: Record<string, unknown>): Promise<unknown>;
    privatePostV5OrderCreateBatch(params: Record<string, unknown>): Promise<unknown>;
}

interface BybitPositionResponse {
    result?: {
        list?: Array<{
            symbol: string;
            size: string;
            side: string;
            avgPrice: string;
            markPrice: string;
            liqPrice: string;
            unrealisedPnl: string;
            leverage: string;
            tradeMode: string;
            positionIM: string;
            positionIdx: string;
        }>;
    };
}

interface BybitBalanceResponse {
    result?: {
        list?: Array<{
            totalEquity: string;
            totalAvailableBalance: string;
            totalWalletBalance: string;
            coin?: Array<{
                coin: string;
                equity: string;
                usdValue: string;
                walletBalance: string;
                availableToWithdraw: string;
                totalOrderIM: string;
                totalPositionIM: string;
            }>;
        }>;
    };
}

interface BybitOrderResponse {
    result?: {
        list?: Array<{
            symbol: string;
            orderId: string;
            side: string;
            orderType: string;
            qty: string;
            price: string;
            triggerPrice: string;
            cumExecQty: string;
            createdTime: string;
            stopOrderType?: string;
            triggerDirection?: string;
        }>;
    };
}

interface BybitClosedPnlResponse {
    result?: {
        list?: Array<{
            symbol: string;
            side: string;
            qty: string;
            avgEntryPrice: string;
            avgExitPrice: string;
            closedPnl: string;
            createdTime: string;
            updatedTime: string;
            leverage: string;
        }>;
    };
}

const is_position_response = hasResultProperty as (d: unknown) => d is BybitPositionResponse;
const is_balance_response = hasResultProperty as (d: unknown) => d is BybitBalanceResponse;
const is_order_response = hasResultProperty as (d: unknown) => d is BybitOrderResponse;

interface BybitExecutionResponse {
    result?: {
        list?: Array<{
            symbol: string;
            execId: string;
            orderId: string;
            side: string;
            execPrice: string;
            execQty: string;
            execTime: string;
            closedSize: string;
            execType: string;
        }>;
    };
}

const is_execution_response = hasResultProperty as (d: unknown) => d is BybitExecutionResponse;

export async function fetch_position_mode(exchange: BybitExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await exchange.privateGetV5PositionList({
            category: 'linear',
            settleCoin: 'USDT',
            limit: '10',
        });
        if (!is_position_response(response)) return 'one_way';
        const list = response.result?.list;
        if (!Array.isArray(list)) return 'one_way';
        const has_hedge = list.some((p) => p.positionIdx === '1' || p.positionIdx === '2');
        return has_hedge ? 'hedge' : 'one_way';
    } catch (err) {
        console.error('failed to fetch bybit position mode:', (err as Error).message);
        return 'one_way';
    }
}

export async function fetch_balance(exchange: BybitExchange): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
    const response = await exchange.privateGetV5AccountWalletBalance({
        accountType: 'UNIFIED',
    });
    if (!is_balance_response(response)) return null;
    const list = response.result?.list;
    if (!Array.isArray(list) || list.length === 0) return null;

    const account = list[0];
    const total = parseFloat(account.totalEquity || '0');

    let available = parseFloat(account.totalAvailableBalance || '0');
    if (available === 0 && Array.isArray(account.coin)) {
        for (const c of account.coin) {
            const walletBal = parseFloat(c.walletBalance || '0');
            const orderIM = parseFloat(c.totalOrderIM || '0');
            const positionIM = parseFloat(c.totalPositionIM || '0');
            if (walletBal > 0) {
                available += walletBal - orderIM - positionIM;
            }
        }
    }

    return {
        total,
        available,
        used: total - available,
        currency: 'USD',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: BybitExchange): Promise<RawPosition[]> {
    const response = await exchange.privateGetV5PositionList({
        category: 'linear',
        settleCoin: 'USDT',
    });
    if (!is_position_response(response)) return [];
    const list = response.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((p) => ({
        symbol: sym.toUnified(p.symbol),
        contracts: Math.abs(Number(p.size || 0)),
        side: p.side === 'Buy' ? 'long' : 'short',
        entry_price: p.avgPrice,
        mark_price: p.markPrice,
        liquidation_price: p.liqPrice,
        unrealized_pnl: p.unrealisedPnl,
        leverage: p.leverage,
        margin_mode: p.tradeMode === '1' ? 'isolated' : 'cross',
        initial_margin: p.positionIM,
    }));
}

export async function fetch_orders(exchange: BybitExchange): Promise<RawOrder[]> {
    const response = await exchange.privateGetV5OrderRealtime({
        category: 'linear',
        settleCoin: 'USDT',
    });
    if (!is_order_response(response)) return [];
    const list = response.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((o) => {
        const is_buy = o.side === 'Buy';
        const trigger_above = o.triggerDirection === '1';

        let type: string;
        if (
            o.stopOrderType === 'Stop' ||
            o.stopOrderType === 'TakeProfit' ||
            o.stopOrderType === 'StopLoss'
        ) {
            if (is_buy) {
                type = trigger_above ? 'stop_loss' : 'take_profit';
            } else {
                type = trigger_above ? 'take_profit' : 'stop_loss';
            }
        } else {
            type = o.orderType.toLowerCase();
        }

        return {
            symbol: sym.toUnified(o.symbol),
            id: o.orderId,
            side: is_buy ? 'buy' : 'sell',
            type,
            amount: Number(o.qty || 0),
            price: Number(o.price || o.triggerPrice || 0),
            filled: Number(o.cumExecQty || 0),
            timestamp: Number(o.createdTime || Date.now()),
            category: 'regular',
        };
    });
}

export async function fetch_closed_positions(
    exchange: BybitExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const now = Date.now();

    const promises = Array.from({ length: HISTORY_FETCH_CONSTANTS.BYBIT_HISTORY_WEEKS }, (_, i) => {
        const endTime = now - i * HISTORY_FETCH_CONSTANTS.SEVEN_DAYS_MS;
        const startTime = endTime - HISTORY_FETCH_CONSTANTS.SEVEN_DAYS_MS;
        return exchange
            .privateGetV5PositionClosedPnl({
                category: 'linear',
                startTime,
                endTime,
                limit: Math.min(limit, 100),
            })
            .then((r: unknown) => (r as BybitClosedPnlResponse)?.result?.list ?? [])
            .catch(() => [] as NonNullable<BybitClosedPnlResponse['result']>['list']);
    });

    const results = await Promise.all(promises);
    const list = results.flat();

    if (list.length === 0) return [];

    const count = Math.min(list.length, limit);
    const result: RawClosedPosition[] = new Array(count);
    for (let i = 0; i < count; i++) {
        const p = list[i]!;
        result[i] = {
            symbol: sym.toUnified(p.symbol),
            side: p.side === 'Buy' ? 'long' : 'short',
            size: Number(p.qty || 0),
            entry_price: Number(p.avgEntryPrice || 0),
            exit_price: Number(p.avgExitPrice || 0),
            realized_pnl: Number(p.closedPnl || 0),
            close_time: Number(p.createdTime || Date.now()),
            leverage: Number(p.leverage || 1),
        };
    }
    return result;
}

export async function fetch_symbol_fills(
    exchange: BybitExchange,
    symbol: string,
    limit: number
): Promise<RawFill[]> {
    const bybit_symbol = sym.fromUnified(symbol);
    const response = await exchange.privateGetV5ExecutionList({
        category: 'linear',
        symbol: bybit_symbol,
        limit: String(limit),
    });
    if (!is_execution_response(response)) return [];
    const list = response.result?.list;
    if (!Array.isArray(list)) return [];

    const trades = list.filter((f) => f.execType === 'Trade');

    return trades.map((f) => {
        const is_buy = f.side === 'Buy';
        const closed_size = Number(f.closedSize || 0);
        const is_close = closed_size > 0;
        return {
            id: f.execId,
            order_id: f.orderId,
            symbol: sym.toUnified(f.symbol),
            side: is_buy ? 'buy' : 'sell',
            price: Number(f.execPrice || 0),
            size: Number(f.execQty || 0),
            time: Number(f.execTime || Date.now()),
            closed_pnl: 0,
            direction: is_close ? 'close' : 'open',
        };
    });
}

export async function set_leverage(
    exchange: BybitExchange,
    symbol: string,
    leverage: number
): Promise<number> {
    const bybit_symbol = sym.fromUnified(symbol);
    await exchange.setLeverage(leverage, bybit_symbol);
    return leverage;
}

export async function fetch_leverage_settings(
    exchange: BybitExchange,
    symbols: string[]
): Promise<Record<string, number>> {
    const results = await Promise.all(
        symbols.map(async (symbol) => {
            try {
                const bybit_symbol = sym.fromUnified(symbol);
                const response = await exchange.privateGetV5PositionList({
                    category: 'linear',
                    symbol: bybit_symbol,
                });
                if (!is_position_response(response)) return null;
                const list = response.result?.list;
                if (!Array.isArray(list) || list.length === 0) return null;
                const leverage = Number(list[0].leverage || 0);
                if (leverage > 0) return { symbol, leverage };
                return null;
            } catch (err) {
                console.error('failed to fetch bybit leverage:', (err as Error).message);
                return null;
            }
        })
    );

    const result: Record<string, number> = {};
    for (const item of results) {
        if (item) result[item.symbol] = item.leverage;
    }
    return result;
}

export async function cancel_order(
    exchange: BybitExchange,
    order_id: string,
    symbol: string
): Promise<boolean> {
    const bybit_symbol = sym.fromUnified(symbol);
    await exchange.privatePostV5OrderCancel({
        category: 'linear',
        symbol: bybit_symbol,
        orderId: order_id,
    });
    return true;
}

export async function cancel_all_orders(exchange: BybitExchange, symbol?: string): Promise<number> {
    const params: Record<string, string> = { category: 'linear' };
    if (symbol) {
        params.symbol = sym.fromUnified(symbol);
    } else {
        params.settleCoin = 'USDT';
    }

    const response = await exchange.privatePostV5OrderCancelAll(params);
    const list = (response as { result?: { list?: unknown[] } })?.result?.list;
    return Array.isArray(list) ? list.length : 0;
}

export async function close_position(
    exchange: BybitExchange,
    params: ClosePositionParams
): Promise<boolean> {
    const bybit_symbol = sym.fromUnified(params.symbol);
    const close_size = params.size * (params.percentage / 100);
    const order_side = params.side === 'long' ? 'Sell' : 'Buy';

    if (!close_size || close_size <= 0 || !isFinite(close_size)) {
        throw new Error('invalid close size');
    }

    const max_qty =
        params.max_market_qty && params.max_market_qty > 0 ? params.max_market_qty : close_size;
    const quantities = split_quantity(close_size, max_qty);

    if (quantities.length === 0) {
        throw new Error('no quantities to close');
    }

    const orders = quantities.map((qty) => {
        const order: Record<string, string | number | boolean> = {
            symbol: bybit_symbol,
            side: order_side,
            orderType: params.order_type === 'market' ? 'Market' : 'Limit',
            qty: round_quantity_string(qty, params.qty_step),
            reduceOnly: true,
            timeInForce: params.order_type === 'market' ? 'IOC' : 'GTC',
        };

        if (params.order_type === 'limit' && params.limit_price) {
            order.price = String(params.limit_price);
        }

        if (params.position_mode === 'hedge') {
            order.positionIdx = params.side === 'long' ? 1 : 2;
            delete order.reduceOnly;
        } else {
            order.positionIdx = 0;
        }

        return order;
    });

    let first_error: Error | null = null;

    if (orders.length === 1) {
        try {
            await exchange.privatePostV5OrderCreate({ category: 'linear', ...orders[0] });
        } catch (err) {
            console.error('bybit order failed:', (err as Error).message);
            first_error = err as Error;
        }
    } else {
        const batch_size = ORDER_BATCH_CONSTANTS.BYBIT_BATCH_SIZE;
        const batches: (typeof orders)[] = [];
        for (let i = 0; i < orders.length; i += batch_size) {
            batches.push(orders.slice(i, i + batch_size));
        }
        const results = await Promise.all(
            batches.map((batch) =>
                exchange
                    .privatePostV5OrderCreateBatch({ category: 'linear', request: batch })
                    .catch((err) => {
                        console.error('bybit batch order failed:', (err as Error).message);
                        return err as Error;
                    })
            )
        );
        first_error = results.find((r) => r instanceof Error) as Error | null;
    }

    if (first_error) {
        throw first_error;
    }

    return true;
}

export async function place_market_order(
    exchange: BybitExchange,
    params: MarketOrderParams
): Promise<boolean> {
    const bybit_symbol = sym.fromUnified(params.symbol);
    const order_side = params.side === 'buy' ? 'Buy' : 'Sell';

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

    const orders = quantities.map((qty) => {
        const order: Record<string, string | number | boolean> = {
            symbol: bybit_symbol,
            side: order_side,
            orderType: is_limit_ioc ? 'Limit' : 'Market',
            qty: round_quantity_string(qty, params.qty_step),
            timeInForce: 'IOC',
        };

        if (is_limit_ioc && limit_price) {
            order.price = String(limit_price);
        }

        if (params.reduce_only) {
            order.reduceOnly = true;
        }

        if (params.position_mode === 'hedge') {
            order.positionIdx = params.side === 'buy' ? 1 : 2;
            if (params.reduce_only) {
                order.positionIdx = params.side === 'buy' ? 2 : 1;
            }
            delete order.reduceOnly;
        } else {
            order.positionIdx = 0;
        }

        return order;
    });

    let first_error: Error | null = null;

    if (orders.length === 1) {
        try {
            await exchange.privatePostV5OrderCreate({ category: 'linear', ...orders[0] });
        } catch (err) {
            console.error('bybit order failed:', (err as Error).message);
            first_error = err as Error;
        }
    } else {
        const batch_size = ORDER_BATCH_CONSTANTS.BYBIT_BATCH_SIZE;
        const batches: (typeof orders)[] = [];
        for (let i = 0; i < orders.length; i += batch_size) {
            batches.push(orders.slice(i, i + batch_size));
        }
        const results = await Promise.all(
            batches.map((batch) =>
                exchange
                    .privatePostV5OrderCreateBatch({ category: 'linear', request: batch })
                    .catch((err) => {
                        console.error('bybit batch order failed:', (err as Error).message);
                        return err as Error;
                    })
            )
        );
        first_error = results.find((r) => r instanceof Error) as Error | null;
    }

    if (first_error) {
        throw first_error;
    }

    return true;
}

interface BuildLimitOrderOptions {
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    position_mode: 'one_way' | 'hedge';
    qty_step?: number;
    tick_size?: number;
    post_only?: boolean;
    reduce_only?: boolean;
}

function build_limit_order(
    options: BuildLimitOrderOptions
): Record<string, string | number | boolean> {
    const bybit_symbol = sym.fromUnified(options.symbol);
    const order_side = options.side === 'buy' ? 'Buy' : 'Sell';

    const order: Record<string, string | number | boolean> = {
        symbol: bybit_symbol,
        side: order_side,
        orderType: 'Limit',
        qty: round_quantity_string(options.size, options.qty_step),
        price: round_price_string(options.price, options.tick_size),
        timeInForce: options.post_only ? 'PostOnly' : 'GTC',
    };

    if (options.reduce_only) {
        order.reduceOnly = true;
    }

    if (options.position_mode === 'hedge') {
        order.positionIdx = options.side === 'buy' ? 1 : 2;
        if (options.reduce_only) {
            order.positionIdx = options.side === 'buy' ? 2 : 1;
        }
        delete order.reduceOnly;
    } else {
        order.positionIdx = 0;
    }

    return order;
}

export async function place_limit_order(
    exchange: BybitExchange,
    params: LimitOrderParams
): Promise<boolean> {
    if (!params.size || params.size <= 0 || !isFinite(params.size)) {
        throw new Error('invalid order size');
    }

    if (!params.price || params.price <= 0 || !isFinite(params.price)) {
        throw new Error('invalid order price');
    }

    const order = build_limit_order({
        symbol: params.symbol,
        side: params.side,
        size: params.size,
        price: params.price,
        position_mode: params.position_mode,
        qty_step: params.qty_step,
        tick_size: params.tick_size,
        post_only: params.post_only,
        reduce_only: params.reduce_only,
    });

    await exchange.privatePostV5OrderCreate({ category: 'linear', ...order });
    return true;
}

export async function place_batch_limit_orders(
    exchange: BybitExchange,
    params: BatchLimitOrderParams
): Promise<{ success: number; failed: number }> {
    if (!params.orders || params.orders.length === 0) {
        return { success: 0, failed: 0 };
    }

    const orders = params.orders.map((o) =>
        build_limit_order({
            symbol: params.symbol,
            side: params.side,
            size: o.size,
            price: o.price,
            position_mode: params.position_mode,
            qty_step: params.qty_step,
            tick_size: params.tick_size,
        })
    );

    const batch_size = ORDER_BATCH_CONSTANTS.BYBIT_BATCH_SIZE;
    const batches: (typeof orders)[] = [];
    for (let i = 0; i < orders.length; i += batch_size) {
        batches.push(orders.slice(i, i + batch_size));
    }

    const results = await Promise.all(
        batches.map((batch) =>
            exchange
                .privatePostV5OrderCreateBatch({ category: 'linear', request: batch })
                .then((response) => {
                    const res = response as { result?: { list?: Array<{ orderId?: string }> } };
                    const list = res?.result?.list;
                    let batch_success = 0;
                    let batch_failed = 0;
                    if (Array.isArray(list)) {
                        for (const r of list) {
                            if (r.orderId) {
                                batch_success++;
                            } else {
                                batch_failed++;
                            }
                        }
                    } else {
                        batch_success = batch.length;
                    }
                    return { success: batch_success, failed: batch_failed };
                })
                .catch((err) => {
                    console.error('bybit batch order failed:', (err as Error).message);
                    return { success: 0, failed: batch.length, error: err as Error };
                })
        )
    );

    let success_count = 0;
    let failed_count = 0;
    let first_error: Error | undefined;

    for (const r of results) {
        success_count += r.success;
        failed_count += r.failed;
        if ('error' in r && !first_error) {
            first_error = r.error;
        }
    }

    if (first_error && success_count === 0) {
        throw first_error;
    }

    return { success: success_count, failed: failed_count };
}

export async function set_tpsl(exchange: BybitExchange, params: TpSlParams): Promise<boolean> {
    const bybit_symbol = sym.fromUnified(params.symbol);
    const is_long = params.side === 'long';
    const close_side = is_long ? 'Sell' : 'Buy';
    const is_tp_limit = params.tp_order_type === 'limit';

    const orders: Record<string, string | number | boolean>[] = [];

    if (params.tp_price && params.tp_price > 0) {
        const tp_order: Record<string, string | number | boolean> = {
            symbol: bybit_symbol,
            side: close_side,
            orderType: is_tp_limit ? 'Limit' : 'Market',
            qty: round_quantity_string(params.size, params.qty_step),
            triggerPrice: round_price_string(params.tp_price, params.tick_size),
            triggerDirection: is_long ? 1 : 2,
            triggerBy: 'MarkPrice',
            reduceOnly: true,
            timeInForce: is_tp_limit ? 'GTC' : 'IOC',
            positionIdx: params.position_mode === 'hedge' ? (is_long ? 1 : 2) : 0,
        };
        if (is_tp_limit) {
            tp_order.price = round_price_string(params.tp_price, params.tick_size);
        }
        orders.push(tp_order);
    }

    if (params.sl_price && params.sl_price > 0) {
        orders.push({
            symbol: bybit_symbol,
            side: close_side,
            orderType: 'Market',
            qty: round_quantity_string(params.size, params.qty_step),
            triggerPrice: round_price_string(params.sl_price, params.tick_size),
            triggerDirection: is_long ? 2 : 1,
            triggerBy: 'MarkPrice',
            reduceOnly: true,
            timeInForce: 'IOC',
            positionIdx: params.position_mode === 'hedge' ? (is_long ? 1 : 2) : 0,
        });
    }

    if (orders.length === 0) {
        throw new Error('no tp or sl price provided');
    }

    await Promise.all(
        orders.map((order) => exchange.privatePostV5OrderCreate({ category: 'linear', ...order }))
    );

    return true;
}
