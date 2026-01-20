import * as ccxt from 'ccxt';
import type { Balance } from '@/types/trading.types';
import type { RawPosition, RawOrder } from './types';

export async function fetch_position_mode(exchange: ccxt.Exchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await (exchange as ccxt.bybit).privateGetV5PositionList({
            category: 'linear',
            settleCoin: 'USDT',
            limit: '10',
        });
        const list = response?.result?.list;
        if (!Array.isArray(list)) return 'one_way';
        const has_hedge = list.some(
            (p: Record<string, string>) => p.positionIdx === '1' || p.positionIdx === '2'
        );
        return has_hedge ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

export async function fetch_balance(exchange: ccxt.Exchange): Promise<Balance | null> {
    const response = await (exchange as ccxt.bybit).privateGetV5AccountWalletBalance({
        accountType: 'UNIFIED',
    });
    const list = response?.result?.list;
    if (!Array.isArray(list) || list.length === 0) return null;
    const account = list[0];
    const total = parseFloat(account.totalEquity || '0');
    const available = parseFloat(account.totalAvailableBalance || '0');
    return {
        total,
        available,
        used: total - available,
        currency: 'USDT',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: ccxt.Exchange): Promise<RawPosition[]> {
    const response = await (exchange as ccxt.bybit).privateGetV5PositionList({
        category: 'linear',
        settleCoin: 'USDT',
    });
    const list = response?.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((p: Record<string, string>) => ({
        symbol: p.symbol.replace(/USDT$/, '/USDT:USDT'),
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

export async function fetch_orders(exchange: ccxt.Exchange): Promise<RawOrder[]> {
    const response = await (exchange as ccxt.bybit).privateGetV5OrderRealtime({
        category: 'linear',
        settleCoin: 'USDT',
    });
    const list = response?.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((o: Record<string, string>) => ({
        symbol: o.symbol.replace(/USDT$/, '/USDT:USDT'),
        id: o.orderId,
        side: o.side === 'Buy' ? 'buy' : 'sell',
        type: o.orderType.toLowerCase(),
        amount: Number(o.qty || 0),
        price: Number(o.price || o.triggerPrice || 0),
        filled: Number(o.cumExecQty || 0),
        timestamp: Number(o.createdTime || Date.now()),
    }));
}
