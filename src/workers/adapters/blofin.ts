import type blofin from 'ccxt/js/src/pro/blofin.js';
import type {
    RawPosition,
    RawOrder,
    RawClosedPosition,
    RawFill,
    OrderCategory,
} from '@/types/worker.types';
import { POSITION_CONSTANTS } from '@/config/chart.constants';
import { ORDER_BATCH_CONSTANTS } from '@/config/trading.constants';
import { BROKER_CONFIG } from '@/config';
import type {
    ClosePositionParams,
    MarketOrderParams,
    LimitOrderParams,
    BatchLimitOrderParams,
    TpSlParams,
} from '@/types/trading.types';
import { blofin as sym } from '../symbol_utils';
import { split_quantity, round_quantity_string, round_price_string } from '../../utils/format';
import { hasDataProperty } from './type_guards';

type BaseBlofinExchange = InstanceType<typeof blofin>;

export interface BlofinExchange extends BaseBlofinExchange {
    privateGetAccountPositions(): Promise<unknown>;
    privateGetAccountBalance(): Promise<unknown>;
    privateGetTradeOrdersPending(params?: Record<string, unknown>): Promise<unknown>;
    privateGetTradeOrdersTpslPending(params?: Record<string, unknown>): Promise<unknown>;
    privateGetTradeOrdersAlgoPending(params?: Record<string, unknown>): Promise<unknown>;
    privateGetTradeFillsHistory(params?: Record<string, unknown>): Promise<unknown>;
    privateGetAccountBatchLeverageInfo(params: Record<string, unknown>): Promise<unknown>;
    privatePostTradeCancelOrder(params: Record<string, unknown>): Promise<unknown>;
    privatePostTradeCancelTpsl(params: unknown): Promise<unknown>;
    privatePostTradeCancelAlgo(params: unknown): Promise<unknown>;
    privatePostTradeCancelBatchOrders(params: unknown): Promise<unknown>;
    privatePostTradeOrder(params: Record<string, unknown>): Promise<unknown>;
    privatePostTradeBatchOrders(params: unknown): Promise<unknown>;
    privatePostTradeOrderTpsl(params: Record<string, unknown>): Promise<unknown>;
}

interface BlofinPositionResponse {
    data?: Array<{
        instId: string;
        positions: string;
        positionSide: string;
        averagePrice: string;
        markPrice: string;
        liquidationPrice: string;
        unrealizedPnl: string;
        leverage: string;
        marginMode: string;
        margin: string;
    }>;
}

interface BlofinBalanceResponse {
    data?: {
        totalEquity: string;
        details?: Array<{
            currency: string;
            available: string;
            equity: string;
        }>;
    };
}

interface BlofinOrderResponse {
    data?: Array<{
        instId: string;
        orderId: string;
        side: string;
        orderType: string;
        size: string;
        price: string;
        triggerPrice: string;
        filledSize: string;
        createTime: string;
    }>;
}

interface BlofinFillResponse {
    data?: Array<{
        instId: string;
        orderId: string;
        tradeId: string;
        side: string;
        positionSide: string;
        fillSize: string;
        fillPrice: string;
        fillPnl: string;
        ts: string;
    }>;
}

interface BlofinLeverageResponse {
    data?: Array<{
        instId: string;
        leverage: string;
        marginMode: string;
        positionSide: string;
    }>;
}

const is_position_response = hasDataProperty as (d: unknown) => d is BlofinPositionResponse;
const is_balance_response = hasDataProperty as (d: unknown) => d is BlofinBalanceResponse;
const is_order_response = hasDataProperty as (d: unknown) => d is BlofinOrderResponse;
const is_fill_response = hasDataProperty as (d: unknown) => d is BlofinFillResponse;
const is_leverage_response = hasDataProperty as (d: unknown) => d is BlofinLeverageResponse;

export async function fetch_position_mode(exchange: BlofinExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await exchange.privateGetAccountPositions();
        if (!is_position_response(response)) return 'one_way';
        const data = response.data;
        if (!Array.isArray(data)) return 'one_way';
        const has_hedge = data.some((p) => p.positionSide === 'long' || p.positionSide === 'short');
        return has_hedge ? 'hedge' : 'one_way';
    } catch (err) {
        console.error('failed to fetch blofin position mode:', (err as Error).message);
        return 'one_way';
    }
}

export async function fetch_balance(exchange: BlofinExchange): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
    const response = await exchange.privateGetAccountBalance();
    if (!is_balance_response(response)) return null;
    const data = response.data;
    if (!data) return null;

    const total = parseFloat(data.totalEquity || '0');
    let available = 0;
    if (Array.isArray(data.details)) {
        for (const detail of data.details) {
            available += parseFloat(detail.available || '0');
        }
    }

    return {
        total,
        available,
        used: total - available,
        currency: 'USDT',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: BlofinExchange): Promise<RawPosition[]> {
    const response = await exchange.privateGetAccountPositions();
    if (!is_position_response(response)) return [];
    const data = response.data;
    if (!Array.isArray(data)) return [];
    return data.map((p) => {
        const positions_value = Number(p.positions || 0);
        let side: 'long' | 'short';
        if (p.positionSide === 'long') {
            side = 'long';
        } else if (p.positionSide === 'short') {
            side = 'short';
        } else {
            side = positions_value >= 0 ? 'long' : 'short';
        }
        return {
            symbol: sym.toUnified(p.instId),
            contracts: Math.abs(positions_value),
            side,
            entry_price: p.averagePrice,
            mark_price: p.markPrice,
            liquidation_price: p.liquidationPrice,
            unrealized_pnl: p.unrealizedPnl,
            leverage: p.leverage,
            margin_mode: p.marginMode === 'isolated' ? 'isolated' : 'cross',
            initial_margin: p.margin,
        };
    });
}

interface BlofinTpslOrderResponse {
    data?: Array<{
        tpslId: string;
        instId: string;
        side: string;
        size: string;
        tpTriggerPrice: string | null;
        slTriggerPrice: string | null;
        createTime: string;
    }>;
}

interface BlofinAlgoOrderResponse {
    data?: Array<{
        algoId: string;
        instId: string;
        side: string;
        size: string;
        triggerPrice: string;
        filledSize: string;
        createTime: string;
    }>;
}

const is_tpsl_order_response = hasDataProperty as (d: unknown) => d is BlofinTpslOrderResponse;
const is_algo_order_response = hasDataProperty as (d: unknown) => d is BlofinAlgoOrderResponse;

export async function fetch_orders(exchange: BlofinExchange): Promise<RawOrder[]> {
    const [pending_result, tpsl_result, trigger_result] = await Promise.all([
        exchange.privateGetTradeOrdersPending().catch(() => null),
        exchange.privateGetTradeOrdersTpslPending().catch(() => null),
        exchange.privateGetTradeOrdersAlgoPending({ orderType: 'trigger' }).catch(() => null),
    ]);

    const pending =
        is_order_response(pending_result) && Array.isArray(pending_result.data)
            ? pending_result.data
            : [];
    const tpsl =
        is_tpsl_order_response(tpsl_result) && Array.isArray(tpsl_result.data)
            ? tpsl_result.data
            : [];
    const algo =
        is_algo_order_response(trigger_result) && Array.isArray(trigger_result.data)
            ? trigger_result.data
            : [];

    let tpsl_entries = 0;
    for (let i = 0; i < tpsl.length; i++) {
        const o = tpsl[i];
        const has_tp = o.tpTriggerPrice && Number(o.tpTriggerPrice) > 0;
        const has_sl = o.slTriggerPrice && Number(o.slTriggerPrice) > 0;
        if (has_tp) tpsl_entries++;
        if (has_sl) tpsl_entries++;
    }

    const totalLen = pending.length + tpsl_entries + algo.length;
    if (totalLen === 0) return [];

    const result: RawOrder[] = new Array(totalLen);
    let idx = 0;

    for (let i = 0; i < pending.length; i++) {
        const o = pending[i];
        result[idx++] = {
            symbol: sym.toUnified(o.instId),
            id: o.orderId,
            side: o.side === 'buy' ? 'buy' : 'sell',
            type: o.orderType.toLowerCase(),
            amount: Number(o.size || 0),
            price: Number(o.price || o.triggerPrice || 0),
            filled: Number(o.filledSize || 0),
            timestamp: Number(o.createTime || Date.now()),
            category: 'regular',
        };
    }

    for (let i = 0; i < tpsl.length; i++) {
        const o = tpsl[i];
        const has_tp = o.tpTriggerPrice && Number(o.tpTriggerPrice) > 0;
        const has_sl = o.slTriggerPrice && Number(o.slTriggerPrice) > 0;
        const is_combined = has_tp && has_sl;

        if (has_tp) {
            result[idx++] = {
                symbol: sym.toUnified(o.instId),
                id: is_combined ? `${o.tpslId}_tp` : o.tpslId,
                side: o.side === 'buy' ? 'buy' : 'sell',
                type: 'take_profit',
                amount: Number(o.size || 0),
                price: Number(o.tpTriggerPrice),
                filled: 0,
                timestamp: Number(o.createTime || Date.now()),
                category: 'tpsl',
            };
        }
        if (has_sl) {
            result[idx++] = {
                symbol: sym.toUnified(o.instId),
                id: is_combined ? `${o.tpslId}_sl` : o.tpslId,
                side: o.side === 'buy' ? 'buy' : 'sell',
                type: 'stop_loss',
                amount: Number(o.size || 0),
                price: Number(o.slTriggerPrice),
                filled: 0,
                timestamp: Number(o.createTime || Date.now()),
                category: 'tpsl',
            };
        }
    }

    for (let i = 0; i < algo.length; i++) {
        const o = algo[i];
        result[idx++] = {
            symbol: sym.toUnified(o.instId),
            id: o.algoId,
            side: o.side === 'buy' ? 'buy' : 'sell',
            type: 'stop',
            amount: Number(o.size || 0),
            price: Number(o.triggerPrice || 0),
            filled: Number(o.filledSize || 0),
            timestamp: Number(o.createTime || Date.now()),
            category: 'algo',
        };
    }

    return result;
}

interface PositionState {
    side: 'long' | 'short';
    size: number;
    entry_price: number;
    total_pnl: number;
    last_time: number;
}

export async function fetch_closed_positions(
    exchange: BlofinExchange,
    limit: number,
    contract_values?: Record<string, number>
): Promise<RawClosedPosition[]> {
    const response = await exchange.privateGetTradeFillsHistory({
        limit: String(limit * 5),
    });
    if (!is_fill_response(response)) return [];
    const data = response.data;
    if (!Array.isArray(data)) return [];

    const sorted_fills = [...data].sort((a, b) => Number(a.ts) - Number(b.ts));
    const by_symbol: Record<string, typeof sorted_fills> = {};

    for (const f of sorted_fills) {
        const s = sym.toUnified(f.instId);
        if (!by_symbol[s]) by_symbol[s] = [];
        by_symbol[s].push(f);
    }

    const closed: RawClosedPosition[] = [];

    for (const symbol in by_symbol) {
        const symbol_fills = by_symbol[symbol];
        const contract_value = contract_values?.[symbol] || 1;
        let pos: PositionState | null = null;

        for (const f of symbol_fills) {
            const fill_side = f.side?.toLowerCase() || '';
            const pos_side = f.positionSide?.toLowerCase() || 'net';
            const fill_price = Number(f.fillPrice);
            const fill_amount = Number(f.fillSize) * contract_value;
            const fill_pnl = Number(f.fillPnl || 0);
            const fill_time = Number(f.ts);

            let trade_side: 'long' | 'short';
            let is_opening: boolean;

            if (pos_side === 'long') {
                trade_side = 'long';
                is_opening = fill_side === 'buy';
            } else if (pos_side === 'short') {
                trade_side = 'short';
                is_opening = fill_side === 'sell';
            } else {
                trade_side = fill_side === 'buy' ? 'long' : 'short';
                is_opening = !pos || pos.side === trade_side;
            }

            if (!pos) {
                pos = {
                    side: trade_side,
                    size: fill_amount,
                    entry_price: fill_price,
                    total_pnl: fill_pnl,
                    last_time: fill_time,
                };
            } else if (is_opening) {
                const new_size = pos.size + fill_amount;
                pos.entry_price =
                    (pos.entry_price * pos.size + fill_price * fill_amount) / new_size;
                pos.size = new_size;
                pos.total_pnl += fill_pnl;
                pos.last_time = fill_time;
            } else {
                pos.total_pnl += fill_pnl;
                const close_size = Math.min(fill_amount, pos.size);
                pos.size -= close_size;

                if (pos.size <= POSITION_CONSTANTS.SIZE_THRESHOLD) {
                    closed.push({
                        symbol,
                        side: pos.side,
                        size: close_size,
                        entry_price: pos.entry_price,
                        exit_price: fill_price,
                        realized_pnl: pos.total_pnl,
                        close_time: fill_time,
                        leverage: 1,
                    });

                    const excess = fill_amount - close_size;
                    if (excess > POSITION_CONSTANTS.SIZE_THRESHOLD) {
                        pos = {
                            side: trade_side,
                            size: excess,
                            entry_price: fill_price,
                            total_pnl: 0,
                            last_time: fill_time,
                        };
                    } else {
                        pos = null;
                    }
                }
            }
        }
    }

    return closed.sort((a, b) => b.close_time - a.close_time).slice(0, limit);
}

const to_blofin_inst_id = sym.fromUnified;

export async function set_leverage(
    exchange: BlofinExchange,
    symbol: string,
    leverage: number
): Promise<number> {
    await exchange.setLeverage(leverage, to_blofin_inst_id(symbol));
    return leverage;
}

export async function fetch_leverage_settings(
    exchange: BlofinExchange,
    symbols: string[]
): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};

    const result: Record<string, number> = {};
    const batch_size = ORDER_BATCH_CONSTANTS.BLOFIN_BATCH_SIZE;

    try {
        for (let i = 0; i < symbols.length; i += batch_size) {
            const batch = symbols.slice(i, i + batch_size);
            const inst_ids = batch.map((s) => sym.fromUnified(s));

            const response = await exchange.privateGetAccountBatchLeverageInfo({
                instId: inst_ids.join(','),
                marginMode: 'cross',
            });

            if (is_leverage_response(response) && Array.isArray(response.data)) {
                for (const item of response.data) {
                    result[sym.toUnified(item.instId)] = parseFloat(item.leverage) || 1;
                }
            }
        }
    } catch (err) {
        console.error('failed to fetch blofin leverage settings:', (err as Error).message);
    }

    return result;
}

export async function fetch_symbol_fills(
    exchange: BlofinExchange,
    symbol: string,
    limit: number,
    contract_size?: number
): Promise<RawFill[]> {
    const response = await exchange.privateGetTradeFillsHistory({
        instId: to_blofin_inst_id(symbol),
        limit: String(limit),
    });
    if (!is_fill_response(response)) return [];
    const data = response.data;
    if (!Array.isArray(data)) return [];

    const cs = contract_size && contract_size > 0 ? contract_size : 1;

    return data.map((f, idx) => {
        const is_buy = f.side?.toLowerCase() === 'buy';
        const pos_side = f.positionSide?.toLowerCase() || 'net';
        let direction: 'open' | 'close';

        if (pos_side === 'long') {
            direction = is_buy ? 'open' : 'close';
        } else if (pos_side === 'short') {
            direction = is_buy ? 'close' : 'open';
        } else {
            direction = 'open';
        }

        return {
            id: f.tradeId || `${f.ts}-${idx}`,
            order_id: f.orderId || `${f.ts}-${idx}`,
            symbol: sym.toUnified(f.instId),
            side: is_buy ? 'buy' : 'sell',
            price: Number(f.fillPrice || 0),
            size: Number(f.fillSize || 0) * cs,
            time: Number(f.ts || Date.now()),
            closed_pnl: Number(f.fillPnl || 0),
            direction,
        };
    });
}

export async function cancel_order(
    exchange: BlofinExchange,
    order_id: string,
    symbol: string,
    category: OrderCategory
): Promise<boolean> {
    const i = to_blofin_inst_id(symbol);
    switch (category) {
        case 'tpsl': {
            const tpsl_id = order_id.replace(/_tp$|_sl$/, '');
            await exchange.privatePostTradeCancelTpsl([{ instId: i, tpslId: tpsl_id }]);
            break;
        }
        case 'algo':
            await exchange.privatePostTradeCancelAlgo([{ instId: i, algoId: order_id }]);
            break;
        default:
            await exchange.privatePostTradeCancelOrder({ instId: i, orderId: order_id });
    }
    return true;
}

export async function cancel_all_orders(
    exchange: BlofinExchange,
    symbol?: string
): Promise<number> {
    const params = symbol ? { instId: to_blofin_inst_id(symbol) } : {};
    const [pending, tpsl, algo] = await Promise.all([
        exchange.privateGetTradeOrdersPending(params).catch(() => null),
        exchange.privateGetTradeOrdersTpslPending(params).catch(() => null),
        exchange
            .privateGetTradeOrdersAlgoPending({ ...params, orderType: 'trigger' })
            .catch(() => null),
    ]);

    const p = is_order_response(pending) ? pending.data || [] : [];
    const t = is_tpsl_order_response(tpsl) ? tpsl.data || [] : [];
    const a = is_algo_order_response(algo) ? algo.data || [] : [];

    await Promise.all([
        p.length > 0
            ? exchange
                  .privatePostTradeCancelBatchOrders(
                      p.map((o) => ({ instId: o.instId, orderId: o.orderId }))
                  )
                  .catch((err) => {
                      console.error('failed to cancel batch orders:', (err as Error).message);
                      return null;
                  })
            : null,
        ...t.map((o) =>
            exchange
                .privatePostTradeCancelTpsl({ instId: o.instId, tpslId: o.tpslId })
                .catch((err) => {
                    console.error('failed to cancel tpsl:', (err as Error).message);
                    return null;
                })
        ),
        ...a.map((o) =>
            exchange
                .privatePostTradeCancelAlgo({ instId: o.instId, algoId: o.algoId })
                .catch((err) => {
                    console.error('failed to cancel algo:', (err as Error).message);
                    return null;
                })
        ),
    ]);
    return p.length + t.length + a.length;
}

export async function close_position(
    exchange: BlofinExchange,
    params: ClosePositionParams
): Promise<boolean> {
    const blofin_inst_id = to_blofin_inst_id(params.symbol);
    const contract_size =
        params.contract_size && params.contract_size > 0 ? params.contract_size : 1;
    const close_size_base = params.size * (params.percentage / 100);
    const close_size = close_size_base / contract_size;
    const order_side = params.side === 'long' ? 'sell' : 'buy';

    if (!close_size || close_size <= 0 || !isFinite(close_size)) {
        throw new Error('invalid close size');
    }

    const max_qty =
        params.max_market_qty && params.max_market_qty > 0
            ? params.max_market_qty / contract_size
            : close_size;
    const quantities = split_quantity(close_size, max_qty);

    if (quantities.length === 0) {
        throw new Error('no quantities to close');
    }

    const orders = quantities.map((qty) => {
        const order: Record<string, string | number> = {
            instId: blofin_inst_id,
            marginMode: params.margin_mode,
            side: order_side,
            orderType: params.order_type,
            size: round_quantity_string(qty, params.qty_step),
            reduceOnly: 'true',
            brokerId: BROKER_CONFIG.blofin.brokerId,
        };

        if (params.order_type === 'limit' && params.limit_price) {
            order.price = String(params.limit_price);
        }

        if (params.position_mode === 'hedge') {
            order.positionSide = params.side;
            delete order.reduceOnly;
        } else {
            order.positionSide = 'net';
        }

        return order;
    });

    let first_error: Error | null = null;

    if (orders.length === 1) {
        try {
            await exchange.privatePostTradeOrder(orders[0]);
        } catch (err) {
            console.error('blofin order failed:', (err as Error).message);
            first_error = err as Error;
        }
    } else {
        const batch_size = ORDER_BATCH_CONSTANTS.BLOFIN_BATCH_SIZE;
        const batches: (typeof orders)[] = [];
        for (let i = 0; i < orders.length; i += batch_size) {
            batches.push(orders.slice(i, i + batch_size));
        }
        const results = await Promise.all(
            batches.map((batch) =>
                exchange.privatePostTradeBatchOrders(batch).catch((err) => {
                    console.error('blofin batch order failed:', (err as Error).message);
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
    exchange: BlofinExchange,
    params: MarketOrderParams
): Promise<boolean> {
    const blofin_inst_id = to_blofin_inst_id(params.symbol);
    const order_side = params.side;
    const contract_size =
        params.contract_size && params.contract_size > 0 ? params.contract_size : 1;
    const size_in_contracts = params.size / contract_size;

    if (!size_in_contracts || size_in_contracts <= 0 || !isFinite(size_in_contracts)) {
        throw new Error('invalid order size');
    }

    const max_qty =
        params.max_market_qty && params.max_market_qty > 0
            ? params.max_market_qty / contract_size
            : size_in_contracts;
    const quantities = split_quantity(size_in_contracts, max_qty);

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
        const order: Record<string, string | number> = {
            instId: blofin_inst_id,
            marginMode: params.margin_mode,
            side: order_side,
            orderType: is_limit_ioc ? 'limit' : 'market',
            size: round_quantity_string(qty, params.qty_step),
            brokerId: BROKER_CONFIG.blofin.brokerId,
        };

        if (is_limit_ioc && limit_price) {
            order.price = String(limit_price);
        }

        if (params.reduce_only) {
            order.reduceOnly = 'true';
        }

        if (params.position_mode === 'hedge') {
            order.positionSide = params.side === 'buy' ? 'long' : 'short';
            if (params.reduce_only) {
                order.positionSide = params.side === 'buy' ? 'short' : 'long';
            }
            delete order.reduceOnly;
        } else {
            order.positionSide = 'net';
        }

        return order;
    });

    let first_error: Error | null = null;

    if (orders.length === 1) {
        try {
            await exchange.privatePostTradeOrder(orders[0]);
        } catch (err) {
            console.error('blofin order failed:', (err as Error).message);
            first_error = err as Error;
        }
    } else {
        const batch_size = ORDER_BATCH_CONSTANTS.BLOFIN_BATCH_SIZE;
        const batches: (typeof orders)[] = [];
        for (let i = 0; i < orders.length; i += batch_size) {
            batches.push(orders.slice(i, i + batch_size));
        }
        const results = await Promise.all(
            batches.map((batch) =>
                exchange.privatePostTradeBatchOrders(batch).catch((err) => {
                    console.error('blofin batch order failed:', (err as Error).message);
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
    margin_mode: 'cross' | 'isolated';
    position_mode: 'one_way' | 'hedge';
    qty_step?: number;
    tick_size?: number;
    contract_size?: number;
    post_only?: boolean;
    reduce_only?: boolean;
}

function build_limit_order(options: BuildLimitOrderOptions): Record<string, string | number> {
    const blofin_inst_id = to_blofin_inst_id(options.symbol);
    const contract_size =
        options.contract_size && options.contract_size > 0 ? options.contract_size : 1;
    const size_in_contracts = options.size / contract_size;

    const order: Record<string, string | number> = {
        instId: blofin_inst_id,
        marginMode: options.margin_mode,
        side: options.side,
        orderType: options.post_only ? 'post_only' : 'limit',
        size: round_quantity_string(size_in_contracts, options.qty_step),
        price: round_price_string(options.price, options.tick_size),
        brokerId: BROKER_CONFIG.blofin.brokerId,
    };

    if (options.reduce_only) {
        order.reduceOnly = 'true';
    }

    if (options.position_mode === 'hedge') {
        order.positionSide = options.side === 'buy' ? 'long' : 'short';
        if (options.reduce_only) {
            order.positionSide = options.side === 'buy' ? 'short' : 'long';
        }
        delete order.reduceOnly;
    } else {
        order.positionSide = 'net';
    }

    return order;
}

export async function place_limit_order(
    exchange: BlofinExchange,
    params: LimitOrderParams
): Promise<boolean> {
    const contract_size =
        params.contract_size && params.contract_size > 0 ? params.contract_size : 1;
    const size_in_contracts = params.size / contract_size;

    if (!size_in_contracts || size_in_contracts <= 0 || !isFinite(size_in_contracts)) {
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
        margin_mode: params.margin_mode,
        position_mode: params.position_mode,
        qty_step: params.qty_step,
        tick_size: params.tick_size,
        contract_size: params.contract_size,
        post_only: params.post_only,
        reduce_only: params.reduce_only,
    });

    await exchange.privatePostTradeOrder(order);
    return true;
}

export async function place_batch_limit_orders(
    exchange: BlofinExchange,
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
            margin_mode: params.margin_mode,
            position_mode: params.position_mode,
            qty_step: params.qty_step,
            tick_size: params.tick_size,
            contract_size: params.contract_size,
        })
    );

    const batch_size = ORDER_BATCH_CONSTANTS.BLOFIN_BATCH_SIZE;
    const batches: (typeof orders)[] = [];
    for (let i = 0; i < orders.length; i += batch_size) {
        batches.push(orders.slice(i, i + batch_size));
    }

    const results = await Promise.all(
        batches.map((batch) =>
            exchange
                .privatePostTradeBatchOrders(batch)
                .then((response) => {
                    const res = response as { data?: Array<{ orderId?: string; code?: string }> };
                    let batch_success = 0;
                    let batch_failed = 0;
                    if (Array.isArray(res?.data)) {
                        for (const r of res.data) {
                            if (r.orderId && r.code === '0') {
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
                    console.error('blofin batch order failed:', (err as Error).message);
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

export async function set_tpsl(exchange: BlofinExchange, params: TpSlParams): Promise<boolean> {
    const blofin_inst_id = sym.fromUnified(params.symbol);
    const is_long = params.side === 'long';
    const close_side = is_long ? 'sell' : 'buy';
    const contract_size =
        params.contract_size && params.contract_size > 0 ? params.contract_size : 1;
    const size_in_contracts = params.size / contract_size;
    const is_tp_limit = params.tp_order_type === 'limit';
    const size_str = round_quantity_string(size_in_contracts, params.qty_step);
    const position_side = params.position_mode === 'hedge' ? params.side : 'net';

    const has_tp = params.tp_price && params.tp_price > 0;
    const has_sl = params.sl_price && params.sl_price > 0;

    if (!has_tp && !has_sl) {
        throw new Error('no tp or sl price provided');
    }

    const orders: Promise<unknown>[] = [];

    if (has_tp) {
        orders.push(
            exchange.privatePostTradeOrderTpsl({
                instId: blofin_inst_id,
                marginMode: params.margin_mode,
                side: close_side,
                size: size_str,
                positionSide: position_side,
                tpTriggerPrice: round_price_string(params.tp_price!, params.tick_size),
                tpOrderPrice: is_tp_limit
                    ? round_price_string(params.tp_price!, params.tick_size)
                    : '-1',
                brokerId: BROKER_CONFIG.blofin.brokerId,
            })
        );
    }

    if (has_sl) {
        orders.push(
            exchange.privatePostTradeOrderTpsl({
                instId: blofin_inst_id,
                marginMode: params.margin_mode,
                side: close_side,
                size: size_str,
                positionSide: position_side,
                slTriggerPrice: round_price_string(params.sl_price!, params.tick_size),
                slOrderPrice: '-1',
                brokerId: BROKER_CONFIG.blofin.brokerId,
            })
        );
    }

    await Promise.all(orders);
    return true;
}
