import type bybit from 'ccxt/js/src/pro/bybit.js';
import type { RawPosition, RawOrder } from '@/types/worker.types';

type BybitExchange = InstanceType<typeof bybit>;

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
        }>;
    };
}

export async function fetch_position_mode(exchange: BybitExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = (await exchange.privateGetV5PositionList({
            category: 'linear',
            settleCoin: 'USDT',
            limit: '10',
        })) as BybitPositionResponse;
        const list = response?.result?.list;
        if (!Array.isArray(list)) return 'one_way';
        const has_hedge = list.some((p) => p.positionIdx === '1' || p.positionIdx === '2');
        return has_hedge ? 'hedge' : 'one_way';
    } catch {
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
    const response = (await exchange.privateGetV5AccountWalletBalance({
        accountType: 'UNIFIED',
    })) as BybitBalanceResponse;
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

export async function fetch_positions(exchange: BybitExchange): Promise<RawPosition[]> {
    const response = (await exchange.privateGetV5PositionList({
        category: 'linear',
        settleCoin: 'USDT',
    })) as BybitPositionResponse;
    const list = response?.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((p) => ({
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

export async function fetch_orders(exchange: BybitExchange): Promise<RawOrder[]> {
    const response = (await exchange.privateGetV5OrderRealtime({
        category: 'linear',
        settleCoin: 'USDT',
    })) as BybitOrderResponse;
    const list = response?.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((o) => ({
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
