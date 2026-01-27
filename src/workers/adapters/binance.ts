import type binanceusdm from 'ccxt/js/src/pro/binanceusdm.js';
import type {
    RawPosition,
    RawOrder,
    RawClosedPosition,
    RawFill,
    OrderCategory,
} from '@/types/worker.types';
import type {
    ClosePositionParams,
    MarketOrderParams,
    LimitOrderParams,
    BatchLimitOrderParams,
    TpSlParams,
} from '@/types/trading.types';
import { ORDER_BATCH_CONSTANTS } from '@/config/trading.constants';
import { binance as sym } from '../symbol_utils';
import {
    split_quantity,
    round_quantity,
    round_quantity_string,
    round_price,
    round_price_string,
} from '../../utils/format';
import { isArrayWithProperty } from './type_guards';

type BaseBinanceExchange = InstanceType<typeof binanceusdm>;

export interface BinanceExchange extends BaseBinanceExchange {
    fapiPrivateGetPositionSideDual(): Promise<unknown>;
    fapiPrivateV2GetBalance(): Promise<unknown>;
    fapiPrivateV2GetPositionRisk(): Promise<unknown>;
    fapiPrivateGetOpenOrders(params?: Record<string, unknown>): Promise<unknown>;
    fapiPrivateGetOpenAlgoOrders(params?: Record<string, unknown>): Promise<unknown>;
    fapiPrivateGetUserTrades(params: Record<string, unknown>): Promise<unknown>;
    fapiPrivateGetSymbolConfig(params?: Record<string, unknown>): Promise<unknown>;
    fapiPrivateDeleteAlgoOrder(params: Record<string, unknown>): Promise<unknown>;
    fapiPrivateDeleteOrder(params: Record<string, unknown>): Promise<unknown>;
    fapiPrivateDeleteAllOpenOrders(params: Record<string, unknown>): Promise<unknown>;
    fapiPrivateDeleteAlgoOpenOrders(params: Record<string, unknown>): Promise<unknown>;
    fapiPrivatePostOrder(params: Record<string, unknown>): Promise<unknown>;
    fapiPrivatePostBatchOrders(params: Record<string, unknown>): Promise<unknown>;
}

interface BinanceBalance {
    asset: string;
    balance: string;
    availableBalance: string;
    crossWalletBalance: string;
    crossUnPnl: string;
    maxWithdrawAmount: string;
}

interface BinancePosition {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    markPrice: string;
    liquidationPrice: string;
    unRealizedProfit: string;
    leverage: string;
    marginType: string;
    isolatedMargin: string;
    positionInitialMargin: string;
}

interface BinanceOrder {
    symbol: string;
    orderId: string;
    side: string;
    type: string;
    origQty: string;
    price: string;
    stopPrice: string;
    executedQty: string;
    time: string;
}

interface BinanceAlgoOrder {
    symbol: string;
    algoId: string;
    side: string;
    orderType: string;
    quantity: string;
    triggerPrice: string;
    price: string;
    createTime: string;
}

interface BinanceTrade {
    symbol: string;
    orderId: string;
    side: string;
    positionSide: string;
    qty: string;
    price: string;
    realizedPnl: string;
    time: number;
}

interface BinanceSymbolConfig {
    symbol: string;
    marginType: string;
    isAutoAddMargin: string;
    leverage: number;
    maxNotionalValue: string;
}

interface CcxtOrder {
    symbol: string;
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    amount: number;
    price?: number;
    params: Record<string, unknown>;
}

async function execute_batch_orders(
    exchange: BinanceExchange,
    orders: CcxtOrder[],
    log_prefix: string
): Promise<{ success: number; failed: number }> {
    if (orders.length === 0) {
        return { success: 0, failed: 0 };
    }

    const batch_size = ORDER_BATCH_CONSTANTS.BINANCE_BATCH_SIZE;
    const batches: CcxtOrder[][] = [];
    for (let i = 0; i < orders.length; i += batch_size) {
        batches.push(orders.slice(i, i + batch_size));
    }

    const batch_results = await Promise.all(
        batches.map((batch) =>
            exchange
                .createOrders(batch)
                .then((results: unknown) => {
                    let success = 0;
                    let failed = 0;
                    if (Array.isArray(results)) {
                        for (const r of results) {
                            if (r && r.id && !('error' in r)) {
                                success++;
                            } else {
                                failed++;
                            }
                        }
                    } else {
                        console.warn(`${log_prefix}: unexpected response format`);
                        failed = batch.length;
                    }
                    return { success, failed };
                })
                .catch((err: unknown) => {
                    console.error(`${log_prefix}:`, (err as Error).message);
                    return { success: 0, failed: batch.length };
                })
        )
    );

    let success_count = 0;
    let failed_count = 0;
    for (const r of batch_results) {
        success_count += r.success;
        failed_count += r.failed;
    }

    return { success: success_count, failed: failed_count };
}

const is_balance_array = (data: unknown): data is BinanceBalance[] =>
    isArrayWithProperty(data, 'asset');

const is_position_array = (data: unknown): data is BinancePosition[] =>
    isArrayWithProperty(data, 'symbol');

const is_order_array = (data: unknown): data is BinanceOrder[] =>
    isArrayWithProperty(data, 'orderId');

const is_trade_array = (data: unknown): data is BinanceTrade[] =>
    isArrayWithProperty(data, 'orderId');

const is_symbol_config_array = (data: unknown): data is BinanceSymbolConfig[] =>
    isArrayWithProperty(data, 'symbol');

export async function fetch_position_mode(exchange: BinanceExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = (await exchange.fapiPrivateGetPositionSideDual()) as {
            dualSidePosition?: boolean;
        };
        return response?.dualSidePosition ? 'hedge' : 'one_way';
    } catch (err) {
        console.error('failed to fetch binance position mode:', (err as Error).message);
        return 'one_way';
    }
}

export async function fetch_balance(exchange: BinanceExchange): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
    const response = await exchange.fapiPrivateV2GetBalance();
    if (!is_balance_array(response)) return null;

    let total = 0;
    let available = 0;
    const bnfcr = response.find((b) => b.asset === 'BNFCR');

    for (const b of response) {
        const bal = parseFloat(b.balance || '0');
        const unPnl = parseFloat(b.crossUnPnl || '0');
        if (bal > 0) {
            total += bal + unPnl;
        }
    }

    if (bnfcr) {
        available = parseFloat(bnfcr.availableBalance || '0');
    } else {
        for (const b of response) {
            available += parseFloat(b.maxWithdrawAmount || '0');
        }
    }

    if (total === 0 && available === 0) return null;

    return {
        total,
        available,
        used: Math.max(0, total - available),
        currency: 'USD',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: BinanceExchange): Promise<RawPosition[]> {
    const response = await exchange.fapiPrivateV2GetPositionRisk();
    if (!is_position_array(response)) return [];
    return response.map((p) => {
        const positionAmt = Number(p.positionAmt);
        return {
            symbol: sym.toUnified(p.symbol),
            contracts: Math.abs(positionAmt),
            side: positionAmt >= 0 ? 'long' : 'short',
            entry_price: p.entryPrice,
            mark_price: p.markPrice,
            liquidation_price: p.liquidationPrice,
            unrealized_pnl: p.unRealizedProfit,
            leverage: p.leverage,
            margin_mode: p.marginType === 'isolated' ? 'isolated' : 'cross',
            initial_margin: p.isolatedMargin || p.positionInitialMargin,
        };
    });
}

export async function fetch_orders(exchange: BinanceExchange): Promise<RawOrder[]> {
    const [regularRaw, algoRaw] = await Promise.all([
        exchange.fapiPrivateGetOpenOrders(),
        exchange.fapiPrivateGetOpenAlgoOrders().catch(() => []),
    ]);
    const regular = is_order_array(regularRaw) ? regularRaw : [];
    const algo = Array.isArray(algoRaw) ? (algoRaw as BinanceAlgoOrder[]) : [];
    const regularLen = regular.length;
    const algoLen = algo.length;
    const result: RawOrder[] = new Array(regularLen + algoLen);
    let idx = 0;
    for (let i = 0; i < regularLen; i++) {
        const o = regular[i];
        result[idx++] = {
            symbol: sym.toUnified(o.symbol),
            id: o.orderId,
            side: o.side.toLowerCase() as 'buy' | 'sell',
            type: o.type.toLowerCase(),
            amount: Number(o.origQty),
            price: Number(o.price || o.stopPrice),
            filled: Number(o.executedQty),
            timestamp: Number(o.time),
            category: 'regular',
        };
    }
    for (let i = 0; i < algoLen; i++) {
        const o = algo[i];
        result[idx++] = {
            symbol: sym.toUnified(o.symbol),
            id: o.algoId,
            side: o.side.toLowerCase() as 'buy' | 'sell',
            type: o.orderType.toLowerCase(),
            amount: Number(o.quantity),
            price: Number(o.triggerPrice || o.price),
            filled: 0,
            timestamp: Number(o.createTime),
            category: 'algo',
        };
    }
    return result;
}

const normalize_symbol = sym.toUnified;

export async function fetch_closed_positions(
    exchange: BinanceExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const tradesRaw = await exchange.fapiPrivateGetUserTrades({
        limit: Math.min(limit * 10, ORDER_BATCH_CONSTANTS.BINANCE_TRADE_LIMIT),
    });
    if (!is_trade_array(tradesRaw)) return [];

    const order_map: Record<
        string,
        {
            symbol: string;
            side: string;
            pos_side: string;
            total_qty: number;
            total_value: number;
            total_pnl: number;
            time: number;
            is_closing: boolean;
        }
    > = {};

    for (const t of tradesRaw) {
        const pnl = Number(t.realizedPnl) || 0;
        const order_id = t.orderId;
        const qty = Number(t.qty) || 0;
        const price = Number(t.price) || 0;
        const side = t.side?.toUpperCase() || '';
        const pos_side = t.positionSide?.toUpperCase() || 'BOTH';

        const is_closing =
            pos_side === 'LONG'
                ? side === 'SELL'
                : pos_side === 'SHORT'
                  ? side === 'BUY'
                  : pnl !== 0;

        if (!order_map[order_id]) {
            order_map[order_id] = {
                symbol: normalize_symbol(t.symbol),
                side,
                pos_side,
                total_qty: 0,
                total_value: 0,
                total_pnl: 0,
                time: Number(t.time) || Date.now(),
                is_closing,
            };
        }
        order_map[order_id].total_qty += qty;
        order_map[order_id].total_value += qty * price;
        order_map[order_id].total_pnl += pnl;
    }

    const closed: RawClosedPosition[] = [];
    const order_values = Object.values(order_map);

    for (let i = 0; i < order_values.length; i++) {
        const o = order_values[i];

        if (!o.is_closing) continue;

        const exit_price = o.total_qty > 0 ? o.total_value / o.total_qty : 0;

        let position_side: 'long' | 'short';
        if (o.pos_side === 'LONG') {
            position_side = 'long';
        } else if (o.pos_side === 'SHORT') {
            position_side = 'short';
        } else {
            position_side = o.side === 'SELL' ? 'long' : 'short';
        }

        const pnl_per_unit = o.total_qty > 0 ? o.total_pnl / o.total_qty : 0;
        const entry_price =
            position_side === 'long' ? exit_price - pnl_per_unit : exit_price + pnl_per_unit;

        closed.push({
            symbol: o.symbol,
            side: position_side,
            size: o.total_qty,
            entry_price: Math.max(0, entry_price),
            exit_price,
            realized_pnl: o.total_pnl,
            close_time: o.time,
            leverage: 1,
        });
    }

    return closed.sort((a, b) => b.close_time - a.close_time).slice(0, limit);
}

export async function fetch_leverage_settings(
    exchange: BinanceExchange,
    symbols?: string[]
): Promise<Record<string, number>> {
    try {
        const response = await exchange.fapiPrivateGetSymbolConfig();
        if (!is_symbol_config_array(response)) return {};

        const result: Record<string, number> = {};
        for (const item of response) {
            const symbol = normalize_symbol(item.symbol);
            if (!symbols || symbols.includes(symbol)) {
                result[symbol] = item.leverage || 1;
            }
        }
        return result;
    } catch (err) {
        console.error('failed to fetch binance leverage settings:', (err as Error).message);
        return {};
    }
}

export async function set_leverage(
    exchange: BinanceExchange,
    symbol: string,
    leverage: number
): Promise<number> {
    const binance_symbol = sym.fromUnified(symbol);
    await exchange.setLeverage(leverage, binance_symbol);
    return leverage;
}

export async function fetch_symbol_fills(
    exchange: BinanceExchange,
    symbol: string,
    limit: number
): Promise<RawFill[]> {
    const binance_symbol = sym.fromUnified(symbol);
    const tradesRaw = await exchange.fapiPrivateGetUserTrades({
        symbol: binance_symbol,
        limit: Math.min(limit, ORDER_BATCH_CONSTANTS.BINANCE_TRADE_LIMIT),
    });
    if (!is_trade_array(tradesRaw)) return [];

    return tradesRaw.map((t, idx) => {
        const is_buy = t.side?.toUpperCase() === 'BUY';
        const pos_side = t.positionSide?.toUpperCase() || 'BOTH';
        const pnl = Number(t.realizedPnl) || 0;

        let direction: 'open' | 'close';
        if (pos_side === 'LONG') {
            direction = is_buy ? 'open' : 'close';
        } else if (pos_side === 'SHORT') {
            direction = is_buy ? 'close' : 'open';
        } else {
            direction = pnl !== 0 ? 'close' : 'open';
        }

        return {
            id: `${t.orderId}-${idx}`,
            order_id: t.orderId,
            symbol: normalize_symbol(t.symbol),
            side: is_buy ? 'buy' : 'sell',
            price: Number(t.price || 0),
            size: Number(t.qty || 0),
            time: Number(t.time || Date.now()),
            closed_pnl: pnl,
            direction,
        };
    });
}

export async function cancel_order(
    exchange: BinanceExchange,
    order_id: string,
    symbol: string,
    category: OrderCategory
): Promise<boolean> {
    const binance_symbol = sym.fromUnified(symbol);

    if (category === 'algo') {
        await exchange.fapiPrivateDeleteAlgoOrder({
            symbol: binance_symbol,
            algoId: order_id,
        });
    } else {
        await exchange.fapiPrivateDeleteOrder({
            symbol: binance_symbol,
            orderId: order_id,
        });
    }
    return true;
}

export async function cancel_all_orders(
    exchange: BinanceExchange,
    symbol?: string
): Promise<number> {
    if (symbol) {
        const binance_symbol = sym.fromUnified(symbol);
        const [regular, algo] = await Promise.all([
            exchange.fapiPrivateDeleteAllOpenOrders({ symbol: binance_symbol }).catch((err) => {
                console.error('failed to cancel regular orders:', (err as Error).message);
                return null;
            }),
            exchange.fapiPrivateDeleteAlgoOpenOrders({ symbol: binance_symbol }).catch((err) => {
                console.error('failed to cancel algo orders:', (err as Error).message);
                return null;
            }),
        ]);
        const regular_count = Array.isArray(regular) ? regular.length : 0;
        const algo_count = Array.isArray(algo) ? algo.length : 0;
        return regular_count + algo_count;
    }

    const [orders_raw, algo_raw] = await Promise.all([
        exchange.fapiPrivateGetOpenOrders(),
        exchange.fapiPrivateGetOpenAlgoOrders().catch(() => []),
    ]);

    const orders = is_order_array(orders_raw) ? orders_raw : [];
    const algo = Array.isArray(algo_raw) ? (algo_raw as BinanceAlgoOrder[]) : [];

    const symbols = new Set<string>();
    for (const o of orders) symbols.add(o.symbol);
    for (const o of algo) symbols.add(o.symbol);

    const promises = Array.from(symbols).map((s) =>
        Promise.all([
            exchange.fapiPrivateDeleteAllOpenOrders({ symbol: s }).catch((err) => {
                console.error('failed to cancel regular orders:', (err as Error).message);
                return null;
            }),
            exchange.fapiPrivateDeleteAlgoOpenOrders({ symbol: s }).catch((err) => {
                console.error('failed to cancel algo orders:', (err as Error).message);
                return null;
            }),
        ])
    );

    await Promise.all(promises);
    return orders.length + algo.length;
}

export async function close_position(
    exchange: BinanceExchange,
    params: ClosePositionParams
): Promise<boolean> {
    const binance_symbol = sym.fromUnified(params.symbol);
    const close_size = params.size * (params.percentage / 100);

    if (!close_size || close_size <= 0 || !isFinite(close_size)) {
        throw new Error('invalid close size');
    }

    const max_qty =
        params.max_market_qty && params.max_market_qty > 0 ? params.max_market_qty : close_size;
    const quantities = split_quantity(close_size, max_qty);

    if (quantities.length === 0) {
        throw new Error('no quantities to close');
    }

    const order_params: Record<string, unknown> = {
        reduceOnly: true,
    };

    if (params.order_type === 'limit') {
        order_params.timeInForce = 'GTC';
    }

    if (params.position_mode === 'hedge') {
        order_params.positionSide = params.side === 'long' ? 'LONG' : 'SHORT';
        delete order_params.reduceOnly;
    }

    const order_type = params.order_type === 'market' ? 'market' : 'limit';
    const order_side = params.side === 'long' ? 'sell' : 'buy';

    const ccxt_orders = quantities.map((qty) => {
        const order: CcxtOrder = {
            symbol: binance_symbol,
            type: order_type,
            side: order_side,
            amount: round_quantity(qty, params.qty_step),
            params: order_params,
        };

        if (params.order_type === 'limit' && params.limit_price) {
            order.price = params.limit_price;
        }

        return order;
    });

    const { failed } = await execute_batch_orders(
        exchange,
        ccxt_orders,
        'binance close order failed'
    );

    if (failed > 0) {
        throw new Error(`${failed}/${ccxt_orders.length} orders failed`);
    }

    return true;
}

export async function place_market_order(
    exchange: BinanceExchange,
    params: MarketOrderParams
): Promise<boolean> {
    const binance_symbol = sym.fromUnified(params.symbol);

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

    const order_params: Record<string, unknown> = {};

    if (is_limit_ioc) {
        order_params.timeInForce = 'IOC';
    }

    if (params.reduce_only) {
        order_params.reduceOnly = true;
    }

    if (params.position_mode === 'hedge') {
        order_params.positionSide = params.side === 'buy' ? 'LONG' : 'SHORT';
        if (params.reduce_only) {
            order_params.positionSide = params.side === 'buy' ? 'SHORT' : 'LONG';
        }
        delete order_params.reduceOnly;
    }

    const order_type = is_limit_ioc ? 'limit' : 'market';

    const ccxt_orders = quantities.map((qty) => {
        const order: CcxtOrder = {
            symbol: binance_symbol,
            type: order_type,
            side: params.side,
            amount: round_quantity(qty, params.qty_step),
            params: order_params,
        };

        if (is_limit_ioc && limit_price) {
            order.price = limit_price;
        }

        return order;
    });

    const { failed } = await execute_batch_orders(
        exchange,
        ccxt_orders,
        'binance market order failed'
    );

    if (failed > 0) {
        throw new Error(`${failed}/${ccxt_orders.length} orders failed`);
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

function build_limit_order(options: BuildLimitOrderOptions): Record<string, string> {
    const binance_symbol = sym.fromUnified(options.symbol);
    const order_side = options.side === 'buy' ? 'BUY' : 'SELL';

    const order: Record<string, string> = {
        symbol: binance_symbol,
        side: order_side,
        type: 'LIMIT',
        quantity: round_quantity_string(options.size, options.qty_step),
        price: round_price_string(options.price, options.tick_size),
        timeInForce: options.post_only ? 'GTX' : 'GTC',
    };

    if (options.reduce_only) {
        order.reduceOnly = 'true';
    }

    if (options.position_mode === 'hedge') {
        order.positionSide = options.side === 'buy' ? 'LONG' : 'SHORT';
        if (options.reduce_only) {
            order.positionSide = options.side === 'buy' ? 'SHORT' : 'LONG';
        }
        delete order.reduceOnly;
    }

    return order;
}

export async function place_limit_order(
    exchange: BinanceExchange,
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

    await exchange.fapiPrivatePostOrder(order);
    return true;
}

export async function place_batch_limit_orders(
    exchange: BinanceExchange,
    params: BatchLimitOrderParams
): Promise<{ success: number; failed: number }> {
    if (!params.orders || params.orders.length === 0) {
        return { success: 0, failed: 0 };
    }

    const ccxt_symbol = sym.fromUnified(params.symbol);
    const order_params: Record<string, unknown> = {};

    if (params.position_mode === 'hedge') {
        order_params.positionSide = params.side === 'buy' ? 'LONG' : 'SHORT';
    }

    const ccxt_orders = params.orders.map((o) => ({
        symbol: ccxt_symbol,
        type: 'limit' as const,
        side: params.side,
        amount: round_quantity(o.size, params.qty_step),
        price: round_price(o.price, params.tick_size),
        params: order_params,
    }));

    return execute_batch_orders(exchange, ccxt_orders, 'binance batch limit order failed');
}

export async function set_tpsl(exchange: BinanceExchange, params: TpSlParams): Promise<boolean> {
    const is_long = params.side === 'long';
    const close_side: 'buy' | 'sell' = is_long ? 'sell' : 'buy';
    const is_tp_limit = params.tp_order_type === 'limit';

    const orders: Promise<unknown>[] = [];

    if (params.tp_price && params.tp_price > 0) {
        const tp_price_rounded = round_price(params.tp_price, params.tick_size);
        const order_params: Record<string, unknown> = {
            stopPrice: tp_price_rounded,
            reduceOnly: true,
            workingType: 'MARK_PRICE',
        };
        if (is_tp_limit) {
            order_params.timeInForce = 'GTC';
        }
        if (params.position_mode === 'hedge') {
            order_params.positionSide = is_long ? 'LONG' : 'SHORT';
            delete order_params.reduceOnly;
        }
        orders.push(
            exchange.createOrder(
                params.symbol,
                is_tp_limit ? 'TAKE_PROFIT' : 'TAKE_PROFIT_MARKET',
                close_side,
                round_quantity(params.size, params.qty_step),
                is_tp_limit ? tp_price_rounded : undefined,
                order_params
            )
        );
    }

    if (params.sl_price && params.sl_price > 0) {
        const sl_price_rounded = round_price(params.sl_price, params.tick_size);
        const order_params: Record<string, unknown> = {
            stopPrice: sl_price_rounded,
            reduceOnly: true,
            workingType: 'MARK_PRICE',
        };
        if (params.position_mode === 'hedge') {
            order_params.positionSide = is_long ? 'LONG' : 'SHORT';
            delete order_params.reduceOnly;
        }
        orders.push(
            exchange.createOrder(
                params.symbol,
                'STOP_MARKET',
                close_side,
                round_quantity(params.size, params.qty_step),
                undefined,
                order_params
            )
        );
    }

    if (orders.length === 0) {
        throw new Error('no tp or sl price provided');
    }

    await Promise.all(orders);
    return true;
}
