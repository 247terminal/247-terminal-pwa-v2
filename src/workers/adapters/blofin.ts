import type blofin from 'ccxt/js/src/pro/blofin.js';
import type { RawPosition, RawOrder } from '@/types/worker.types';

type BlofinExchange = InstanceType<typeof blofin>;

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
