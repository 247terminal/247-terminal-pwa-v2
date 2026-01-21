import type bybit from 'ccxt/js/src/pro/bybit.js';
import type { RawPosition, RawOrder, RawClosedPosition } from '@/types/worker.types';

export type BybitExchange = InstanceType<typeof bybit>;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_WEEKS = 5;

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

export async function fetch_closed_positions(
    exchange: BybitExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const now = Date.now();

    const promises = Array.from({ length: HISTORY_WEEKS }, (_, i) => {
        const endTime = now - i * SEVEN_DAYS_MS;
        const startTime = endTime - SEVEN_DAYS_MS;
        return exchange
            .privateGetV5PositionClosedPnl({
                category: 'linear',
                startTime,
                endTime,
                limit: Math.min(limit, 100),
            })
            .then((r) => (r as BybitClosedPnlResponse)?.result?.list ?? [])
            .catch(() => [] as NonNullable<BybitClosedPnlResponse['result']>['list']);
    });

    const results = await Promise.all(promises);
    const list = results.flat();

    if (list.length === 0) return [];

    const count = Math.min(list.length, limit);
    const result: RawClosedPosition[] = new Array(count);
    for (let i = 0; i < count; i++) {
        const p = list[i];
        result[i] = {
            symbol: p.symbol.replace(/USDT$/, '/USDT:USDT'),
            side: p.side === 'Buy' ? 'long' : 'short',
            size: Number(p.qty || 0),
            entry_price: Number(p.avgEntryPrice || 0),
            exit_price: Number(p.avgExitPrice || 0),
            realized_pnl: Number(p.closedPnl || 0),
            close_time: Number(p.createdTime || Date.now()),
        };
    }
    return result;
}
