import type blofin from 'ccxt/js/src/pro/blofin.js';
import type { RawPosition, RawOrder, RawClosedPosition } from '@/types/worker.types';

export type BlofinExchange = InstanceType<typeof blofin>;

const POSITION_SIZE_THRESHOLD = 0.00001;

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
        side: string;
        positionSide: string;
        fillSize: string;
        fillPrice: string;
        fillPnl: string;
        ts: string;
    }>;
}

export async function fetch_position_mode(exchange: BlofinExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = (await exchange.privateGetAccountPositions()) as BlofinPositionResponse;
        const data = response?.data;
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
    const response = (await exchange.privateGetAccountBalance()) as BlofinBalanceResponse;
    const data = response?.data;
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
    const response = (await exchange.privateGetAccountPositions()) as BlofinPositionResponse;
    const data = response?.data;
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

export async function fetch_orders(exchange: BlofinExchange): Promise<RawOrder[]> {
    const response = (await exchange.privateGetTradeOrdersPending()) as BlofinOrderResponse;
    const data = response?.data;
    if (!Array.isArray(data)) return [];
    return data.map((o) => ({
        symbol: o.instId.replace(/-/g, '/') + ':USDT',
        id: o.orderId,
        side: o.side === 'buy' ? 'buy' : 'sell',
        type: o.orderType.toLowerCase(),
        amount: Number(o.size || 0),
        price: Number(o.price || o.triggerPrice || 0),
        filled: Number(o.filledSize || 0),
        timestamp: Number(o.createTime || Date.now()),
    }));
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
    const response = (await exchange.privateGetTradeFillsHistory({
        limit: String(limit * 5),
    })) as BlofinFillResponse;
    const data = response?.data;
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

                if (pos.size <= POSITION_SIZE_THRESHOLD) {
                    closed.push({
                        symbol,
                        side: pos.side,
                        size: close_size,
                        entry_price: pos.entry_price,
                        exit_price: fill_price,
                        realized_pnl: pos.total_pnl,
                        close_time: fill_time,
                    });

                    const excess = fill_amount - close_size;
                    if (excess > POSITION_SIZE_THRESHOLD) {
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
