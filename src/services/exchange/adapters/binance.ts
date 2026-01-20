import * as ccxt from 'ccxt';
import type { Balance } from '@/types/trading.types';
import type { RawPosition, RawOrder } from './types';

export async function fetch_position_mode(exchange: ccxt.Exchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await (exchange as ccxt.binanceusdm).fapiPrivateGetPositionSideDual();
        return response?.dualSidePosition ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

export async function fetch_balance(exchange: ccxt.Exchange): Promise<Balance | null> {
    const response = await (exchange as ccxt.binanceusdm).fapiPrivateV2GetBalance();
    const usdt = (
        response as Array<{ asset: string; balance: string; availableBalance: string }>
    ).find((b) => b.asset === 'USDT');
    if (!usdt) return null;
    const total = parseFloat(usdt.balance);
    const available = parseFloat(usdt.availableBalance);
    return {
        total,
        available,
        used: total - available,
        currency: 'USDT',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: ccxt.Exchange): Promise<RawPosition[]> {
    const response = await (exchange as ccxt.binanceusdm).fapiPrivateV2GetPositionRisk();
    return (response as Array<Record<string, string>>).map((p) => ({
        symbol: p.symbol.replace(/USDT$/, '/USDT:USDT'),
        contracts: Math.abs(Number(p.positionAmt)),
        side: Number(p.positionAmt) >= 0 ? 'long' : 'short',
        entry_price: p.entryPrice,
        mark_price: p.markPrice,
        liquidation_price: p.liquidationPrice,
        unrealized_pnl: p.unRealizedProfit,
        leverage: p.leverage,
        margin_mode: p.marginType === 'isolated' ? 'isolated' : 'cross',
        initial_margin: p.isolatedMargin || p.positionInitialMargin,
    }));
}

export async function fetch_orders(exchange: ccxt.Exchange): Promise<RawOrder[]> {
    const ex = exchange as ccxt.binanceusdm;
    const [regular, algo] = await Promise.all([
        ex.fapiPrivateGetOpenOrders(),
        ex.fapiPrivateGetOpenAlgoOrders().catch(() => []),
    ]);
    const result: RawOrder[] = [];
    for (const o of regular as Array<Record<string, string>>) {
        result.push({
            symbol: o.symbol.replace(/USDT$/, '/USDT:USDT'),
            id: o.orderId,
            side: o.side.toLowerCase() as 'buy' | 'sell',
            type: o.type.toLowerCase(),
            amount: Number(o.origQty),
            price: Number(o.price || o.stopPrice),
            filled: Number(o.executedQty),
            timestamp: Number(o.time),
        });
    }
    for (const o of algo as Array<Record<string, string>>) {
        result.push({
            symbol: o.symbol.replace(/USDT$/, '/USDT:USDT'),
            id: o.algoId,
            side: o.side.toLowerCase() as 'buy' | 'sell',
            type: o.orderType.toLowerCase(),
            amount: Number(o.quantity),
            price: Number(o.triggerPrice || o.price),
            filled: 0,
            timestamp: Number(o.createTime),
        });
    }
    return result;
}
