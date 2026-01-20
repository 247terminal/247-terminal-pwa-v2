import * as ccxt from 'ccxt';
import type { Balance } from '@/types/trading.types';
import type { RawPosition, RawOrder } from './types';

export async function fetch_position_mode(exchange: ccxt.Exchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await (exchange as ccxt.blofin).privateGetAccountPositions();
        const data = response?.data;
        if (!Array.isArray(data)) return 'one_way';
        const has_hedge = data.some(
            (p: Record<string, string>) => p.positionSide === 'long' || p.positionSide === 'short'
        );
        return has_hedge ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

export async function fetch_balance(exchange: ccxt.Exchange): Promise<Balance | null> {
    const response = await (exchange as ccxt.blofin).privateGetAccountBalance();
    const data = response?.data;
    if (!Array.isArray(data) || data.length === 0) return null;
    const account = data[0];
    const total = parseFloat(account.totalEquity || '0');
    const available = parseFloat(account.availableBalance || '0');
    return {
        total,
        available,
        used: total - available,
        currency: 'USDT',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: ccxt.Exchange): Promise<RawPosition[]> {
    const response = await (exchange as ccxt.blofin).privateGetAccountPositions();
    const data = response?.data;
    if (!Array.isArray(data)) return [];
    return data.map((p: Record<string, string>) => ({
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

export async function fetch_orders(exchange: ccxt.Exchange): Promise<RawOrder[]> {
    const response = await (exchange as ccxt.blofin).privateGetTradeOrdersPending();
    const data = response?.data;
    if (!Array.isArray(data)) return [];
    return data.map((o: Record<string, string>) => ({
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
