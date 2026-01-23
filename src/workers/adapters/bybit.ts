import type bybit from 'ccxt/js/src/pro/bybit.js';
import type { RawPosition, RawOrder, RawClosedPosition, RawFill } from '@/types/worker.types';
import { HISTORY_FETCH_CONSTANTS } from '@/config/chart.constants';

export type BybitExchange = InstanceType<typeof bybit>;

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
            stopOrderType?: string;
            triggerDirection?: string;
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

function is_position_response(data: unknown): data is BybitPositionResponse {
    return data !== null && typeof data === 'object' && 'result' in data;
}

function is_balance_response(data: unknown): data is BybitBalanceResponse {
    return data !== null && typeof data === 'object' && 'result' in data;
}

function is_order_response(data: unknown): data is BybitOrderResponse {
    return data !== null && typeof data === 'object' && 'result' in data;
}

interface BybitExecutionResponse {
    result?: {
        list?: Array<{
            symbol: string;
            execId: string;
            orderId: string;
            side: string;
            execPrice: string;
            execQty: string;
            execTime: string;
            closedSize: string;
            execType: string;
        }>;
    };
}

function is_execution_response(data: unknown): data is BybitExecutionResponse {
    return data !== null && typeof data === 'object' && 'result' in data;
}

export async function fetch_position_mode(exchange: BybitExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await exchange.privateGetV5PositionList({
            category: 'linear',
            settleCoin: 'USDT',
            limit: '10',
        });
        if (!is_position_response(response)) return 'one_way';
        const list = response.result?.list;
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
    const response = await exchange.privateGetV5AccountWalletBalance({
        accountType: 'UNIFIED',
    });
    if (!is_balance_response(response)) return null;
    const list = response.result?.list;
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
    const response = await exchange.privateGetV5PositionList({
        category: 'linear',
        settleCoin: 'USDT',
    });
    if (!is_position_response(response)) return [];
    const list = response.result?.list;
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
    const response = await exchange.privateGetV5OrderRealtime({
        category: 'linear',
        settleCoin: 'USDT',
    });
    if (!is_order_response(response)) return [];
    const list = response.result?.list;
    if (!Array.isArray(list)) return [];
    return list.map((o) => {
        const is_buy = o.side === 'Buy';
        const trigger_above = o.triggerDirection === '1';

        let type: string;
        if (
            o.stopOrderType === 'Stop' ||
            o.stopOrderType === 'TakeProfit' ||
            o.stopOrderType === 'StopLoss'
        ) {
            if (is_buy) {
                type = trigger_above ? 'stop_loss' : 'take_profit';
            } else {
                type = trigger_above ? 'take_profit' : 'stop_loss';
            }
        } else {
            type = o.orderType.toLowerCase();
        }

        return {
            symbol: o.symbol.replace(/USDT$/, '/USDT:USDT'),
            id: o.orderId,
            side: is_buy ? 'buy' : 'sell',
            type,
            amount: Number(o.qty || 0),
            price: Number(o.price || o.triggerPrice || 0),
            filled: Number(o.cumExecQty || 0),
            timestamp: Number(o.createdTime || Date.now()),
        };
    });
}

export async function fetch_closed_positions(
    exchange: BybitExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const now = Date.now();

    const promises = Array.from({ length: HISTORY_FETCH_CONSTANTS.BYBIT_HISTORY_WEEKS }, (_, i) => {
        const endTime = now - i * HISTORY_FETCH_CONSTANTS.SEVEN_DAYS_MS;
        const startTime = endTime - HISTORY_FETCH_CONSTANTS.SEVEN_DAYS_MS;
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
            leverage: Number(p.leverage || 1),
        };
    }
    return result;
}

export async function fetch_symbol_fills(
    exchange: BybitExchange,
    symbol: string,
    limit: number
): Promise<RawFill[]> {
    const bybit_symbol = symbol.replace(/\/USDT:USDT$/, 'USDT');
    const response = await exchange.privateGetV5ExecutionList({
        category: 'linear',
        symbol: bybit_symbol,
        limit: String(limit),
    });
    if (!is_execution_response(response)) return [];
    const list = response.result?.list;
    if (!Array.isArray(list)) return [];

    const trades = list.filter((f) => f.execType === 'Trade');

    return trades.map((f) => {
        const is_buy = f.side === 'Buy';
        const closed_size = Number(f.closedSize || 0);
        const is_close = closed_size > 0;
        return {
            id: f.execId,
            order_id: f.orderId,
            symbol: f.symbol.replace(/USDT$/, '/USDT:USDT'),
            side: is_buy ? 'buy' : 'sell',
            price: Number(f.execPrice || 0),
            size: Number(f.execQty || 0),
            time: Number(f.execTime || Date.now()),
            closed_pnl: 0,
            direction: is_close ? 'close' : 'open',
        };
    });
}

export async function fetch_leverage_settings(
    exchange: BybitExchange,
    symbols: string[]
): Promise<Record<string, number>> {
    const results = await Promise.all(
        symbols.map(async (symbol) => {
            try {
                const bybit_symbol = symbol.replace(/\/USDT:USDT$/, 'USDT');
                const response = await exchange.privateGetV5PositionList({
                    category: 'linear',
                    symbol: bybit_symbol,
                });
                if (!is_position_response(response)) return null;
                const list = response.result?.list;
                if (!Array.isArray(list) || list.length === 0) return null;
                const leverage = Number(list[0].leverage || 0);
                if (leverage > 0) return { symbol, leverage };
                return null;
            } catch {
                return null;
            }
        })
    );

    const result: Record<string, number> = {};
    for (const item of results) {
        if (item) result[item.symbol] = item.leverage;
    }
    return result;
}
