import type blofin from 'ccxt/js/src/pro/blofin.js';
import type { RawPosition, RawOrder, RawClosedPosition, RawFill } from '@/types/worker.types';
import { POSITION_CONSTANTS } from '@/config/chart.constants';

export type BlofinExchange = InstanceType<typeof blofin>;

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

function is_position_response(data: unknown): data is BlofinPositionResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

function is_balance_response(data: unknown): data is BlofinBalanceResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

function is_order_response(data: unknown): data is BlofinOrderResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

function is_fill_response(data: unknown): data is BlofinFillResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

function is_leverage_response(data: unknown): data is BlofinLeverageResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

export async function fetch_position_mode(exchange: BlofinExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await exchange.privateGetAccountPositions();
        if (!is_position_response(response)) return 'one_way';
        const data = response.data;
        if (!Array.isArray(data)) return 'one_way';
        const has_hedge = data.some((p) => p.positionSide === 'long' || p.positionSide === 'short');
        return has_hedge ? 'hedge' : 'one_way';
    } catch {
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
    return data.map((p) => ({
        symbol: p.instId.replace(/-/g, '/') + ':USDT',
        contracts: Math.abs(Number(p.positions || 0)),
        side: p.positionSide === 'long' ? 'long' : 'short',
        entry_price: p.averagePrice,
        mark_price: p.markPrice,
        liquidation_price: p.liquidationPrice,
        unrealized_pnl: p.unrealizedPnl,
        leverage: p.leverage,
        margin_mode: p.marginMode === 'isolated' ? 'isolated' : 'cross',
        initial_margin: p.margin,
    }));
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

function is_tpsl_order_response(data: unknown): data is BlofinTpslOrderResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

function is_algo_order_response(data: unknown): data is BlofinAlgoOrderResponse {
    return data !== null && typeof data === 'object' && 'data' in data;
}

export async function fetch_orders(exchange: BlofinExchange): Promise<RawOrder[]> {
    const [pending_result, tpsl_result, trigger_result] = await Promise.all([
        exchange.privateGetTradeOrdersPending().catch(() => null),
        exchange.privateGetTradeOrdersTpslPending().catch(() => null),
        exchange.privateGetTradeOrdersAlgoPending({ orderType: 'trigger' }).catch(() => null),
    ]);

    const orders: RawOrder[] = [];

    if (is_order_response(pending_result) && Array.isArray(pending_result.data)) {
        for (const o of pending_result.data) {
            orders.push({
                symbol: o.instId.replace(/-/g, '/') + ':USDT',
                id: o.orderId,
                side: o.side === 'buy' ? 'buy' : 'sell',
                type: o.orderType.toLowerCase(),
                amount: Number(o.size || 0),
                price: Number(o.price || o.triggerPrice || 0),
                filled: Number(o.filledSize || 0),
                timestamp: Number(o.createTime || Date.now()),
            });
        }
    }

    if (is_tpsl_order_response(tpsl_result) && Array.isArray(tpsl_result.data)) {
        for (const o of tpsl_result.data) {
            const has_tp = o.tpTriggerPrice && Number(o.tpTriggerPrice) > 0;
            const has_sl = o.slTriggerPrice && Number(o.slTriggerPrice) > 0;

            orders.push({
                symbol: o.instId.replace(/-/g, '/') + ':USDT',
                id: o.tpslId,
                side: o.side === 'buy' ? 'buy' : 'sell',
                type: has_tp ? 'take_profit' : 'stop_loss',
                amount: Number(o.size || 0),
                price: has_tp ? Number(o.tpTriggerPrice) : Number(o.slTriggerPrice),
                filled: 0,
                timestamp: Number(o.createTime || Date.now()),
            });
        }
    }

    if (is_algo_order_response(trigger_result) && Array.isArray(trigger_result.data)) {
        for (const o of trigger_result.data) {
            orders.push({
                symbol: o.instId.replace(/-/g, '/') + ':USDT',
                id: o.algoId,
                side: o.side === 'buy' ? 'buy' : 'sell',
                type: 'stop',
                amount: Number(o.size || 0),
                price: Number(o.triggerPrice || 0),
                filled: Number(o.filledSize || 0),
                timestamp: Number(o.createTime || Date.now()),
            });
        }
    }

    return orders;
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
        const sym = f.instId.replace(/-/g, '/') + ':USDT';
        if (!by_symbol[sym]) by_symbol[sym] = [];
        by_symbol[sym].push(f);
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

function from_blofin_inst_id(instId: string): string {
    return instId.replace(/-/g, '/') + ':USDT';
}

export async function set_leverage(
    exchange: BlofinExchange,
    symbol: string,
    leverage: number
): Promise<number> {
    const inst_id = symbol.replace(/\//, '-').replace(/:USDT$/, '');
    await exchange.setLeverage(leverage, inst_id);
    return leverage;
}

export async function fetch_leverage_settings(
    exchange: BlofinExchange,
    symbols: string[]
): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};

    const result: Record<string, number> = {};
    const batch_size = 20;

    try {
        for (let i = 0; i < symbols.length; i += batch_size) {
            const batch = symbols.slice(i, i + batch_size);
            const inst_ids = batch.map((s) => {
                const base = s.split('/')[0];
                return `${base}-USDT`;
            });

            const response = await exchange.privateGetAccountBatchLeverageInfo({
                instId: inst_ids.join(','),
                marginMode: 'cross',
            });

            if (is_leverage_response(response) && Array.isArray(response.data)) {
                for (const item of response.data) {
                    const symbol = from_blofin_inst_id(item.instId);
                    result[symbol] = parseFloat(item.leverage) || 1;
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
    limit: number
): Promise<RawFill[]> {
    const inst_id = symbol.replace(/\//, '-').replace(/:USDT$/, '');
    const response = await exchange.privateGetTradeFillsHistory({
        instId: inst_id,
        limit: String(limit),
    });
    if (!is_fill_response(response)) return [];
    const data = response.data;
    if (!Array.isArray(data)) return [];

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
            symbol: f.instId.replace(/-/g, '/') + ':USDT',
            side: is_buy ? 'buy' : 'sell',
            price: Number(f.fillPrice || 0),
            size: Number(f.fillSize || 0),
            time: Number(f.ts || Date.now()),
            closed_pnl: Number(f.fillPnl || 0),
            direction,
        };
    });
}
