import type binanceusdm from 'ccxt/js/src/pro/binanceusdm.js';
import type { RawPosition, RawOrder, RawClosedPosition, RawFill } from '@/types/worker.types';

export type BinanceExchange = InstanceType<typeof binanceusdm>;

interface BinanceBalance {
    asset: string;
    balance: string;
    availableBalance: string;
    crossWalletBalance: string;
    crossUnPnl: string;
    maxWithdrawAmount: string;
}

interface BinancePosition {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    markPrice: string;
    liquidationPrice: string;
    unRealizedProfit: string;
    leverage: string;
    marginType: string;
    isolatedMargin: string;
    positionInitialMargin: string;
}

interface BinanceOrder {
    symbol: string;
    orderId: string;
    side: string;
    type: string;
    origQty: string;
    price: string;
    stopPrice: string;
    executedQty: string;
    time: string;
}

interface BinanceAlgoOrder {
    symbol: string;
    algoId: string;
    side: string;
    orderType: string;
    quantity: string;
    triggerPrice: string;
    price: string;
    createTime: string;
}

interface BinanceTrade {
    symbol: string;
    orderId: string;
    side: string;
    positionSide: string;
    qty: string;
    price: string;
    realizedPnl: string;
    time: number;
}

interface BinanceSymbolConfig {
    symbol: string;
    marginType: string;
    isAutoAddMargin: string;
    leverage: number;
    maxNotionalValue: string;
}

function is_balance_array(data: unknown): data is BinanceBalance[] {
    return Array.isArray(data) && (data.length === 0 || typeof data[0]?.asset === 'string');
}

function is_position_array(data: unknown): data is BinancePosition[] {
    return Array.isArray(data) && (data.length === 0 || typeof data[0]?.symbol === 'string');
}

function is_order_array(data: unknown): data is BinanceOrder[] {
    return Array.isArray(data) && (data.length === 0 || typeof data[0]?.orderId === 'string');
}

function is_trade_array(data: unknown): data is BinanceTrade[] {
    return Array.isArray(data) && (data.length === 0 || typeof data[0]?.orderId === 'string');
}

function is_symbol_config_array(data: unknown): data is BinanceSymbolConfig[] {
    return Array.isArray(data) && (data.length === 0 || typeof data[0]?.symbol === 'string');
}

export async function fetch_position_mode(exchange: BinanceExchange): Promise<'hedge' | 'one_way'> {
    try {
        const response = await exchange.fapiPrivateGetPositionSideDual();
        return response?.dualSidePosition ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

export async function fetch_balance(exchange: BinanceExchange): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
    const response = await exchange.fapiPrivateV2GetBalance();
    if (!is_balance_array(response)) return null;

    let total = 0;
    let available = 0;
    const bnfcr = response.find((b) => b.asset === 'BNFCR');

    for (const b of response) {
        const bal = parseFloat(b.balance || '0');
        const unPnl = parseFloat(b.crossUnPnl || '0');
        if (bal > 0) {
            total += bal + unPnl;
        }
    }

    if (bnfcr) {
        available = parseFloat(bnfcr.availableBalance || '0');
    } else {
        for (const b of response) {
            available += parseFloat(b.maxWithdrawAmount || '0');
        }
    }

    if (total === 0 && available === 0) return null;

    return {
        total,
        available,
        used: Math.max(0, total - available),
        currency: 'USD',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: BinanceExchange): Promise<RawPosition[]> {
    const response = await exchange.fapiPrivateV2GetPositionRisk();
    if (!is_position_array(response)) return [];
    return response.map((p) => {
        const positionAmt = Number(p.positionAmt);
        return {
            symbol: p.symbol.replace(/USDT$/, '/USDT:USDT'),
            contracts: Math.abs(positionAmt),
            side: positionAmt >= 0 ? 'long' : 'short',
            entry_price: p.entryPrice,
            mark_price: p.markPrice,
            liquidation_price: p.liquidationPrice,
            unrealized_pnl: p.unRealizedProfit,
            leverage: p.leverage,
            margin_mode: p.marginType === 'isolated' ? 'isolated' : 'cross',
            initial_margin: p.isolatedMargin || p.positionInitialMargin,
        };
    });
}

export async function fetch_orders(exchange: BinanceExchange): Promise<RawOrder[]> {
    const [regularRaw, algoRaw] = await Promise.all([
        exchange.fapiPrivateGetOpenOrders(),
        exchange.fapiPrivateGetOpenAlgoOrders().catch(() => []),
    ]);
    const regular = is_order_array(regularRaw) ? regularRaw : [];
    const algo = Array.isArray(algoRaw) ? (algoRaw as BinanceAlgoOrder[]) : [];
    const regularLen = regular.length;
    const algoLen = algo.length;
    const result: RawOrder[] = new Array(regularLen + algoLen);
    let idx = 0;
    for (let i = 0; i < regularLen; i++) {
        const o = regular[i];
        result[idx++] = {
            symbol: o.symbol.replace(/USDT$/, '/USDT:USDT'),
            id: o.orderId,
            side: o.side.toLowerCase() as 'buy' | 'sell',
            type: o.type.toLowerCase(),
            amount: Number(o.origQty),
            price: Number(o.price || o.stopPrice),
            filled: Number(o.executedQty),
            timestamp: Number(o.time),
        };
    }
    for (let i = 0; i < algoLen; i++) {
        const o = algo[i];
        result[idx++] = {
            symbol: o.symbol.replace(/USDT$/, '/USDT:USDT'),
            id: o.algoId,
            side: o.side.toLowerCase() as 'buy' | 'sell',
            type: o.orderType.toLowerCase(),
            amount: Number(o.quantity),
            price: Number(o.triggerPrice || o.price),
            filled: 0,
            timestamp: Number(o.createTime),
        };
    }
    return result;
}

function normalize_symbol(symbol: string): string {
    return symbol.replace(/USDT$/, '/USDT:USDT');
}

export async function fetch_closed_positions(
    exchange: BinanceExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const tradesRaw = await exchange.fapiPrivateGetUserTrades({
        limit: Math.min(limit * 10, 1000),
    });
    if (!is_trade_array(tradesRaw)) return [];
    const trades = tradesRaw;

    const order_map: Record<
        string,
        {
            symbol: string;
            side: string;
            pos_side: string;
            total_qty: number;
            total_value: number;
            total_pnl: number;
            time: number;
            is_closing: boolean;
        }
    > = {};

    for (const t of trades) {
        const pnl = Number(t.realizedPnl) || 0;
        const order_id = t.orderId;
        const qty = Number(t.qty) || 0;
        const price = Number(t.price) || 0;
        const side = t.side?.toUpperCase() || '';
        const pos_side = t.positionSide?.toUpperCase() || 'BOTH';

        const is_closing =
            pos_side === 'LONG'
                ? side === 'SELL'
                : pos_side === 'SHORT'
                  ? side === 'BUY'
                  : pnl !== 0;

        if (!order_map[order_id]) {
            order_map[order_id] = {
                symbol: normalize_symbol(t.symbol),
                side,
                pos_side,
                total_qty: 0,
                total_value: 0,
                total_pnl: 0,
                time: Number(t.time) || Date.now(),
                is_closing,
            };
        }
        order_map[order_id].total_qty += qty;
        order_map[order_id].total_value += qty * price;
        order_map[order_id].total_pnl += pnl;
    }

    const closed: RawClosedPosition[] = [];
    const order_values = Object.values(order_map);

    for (let i = 0; i < order_values.length; i++) {
        const o = order_values[i];

        if (!o.is_closing) continue;

        const exit_price = o.total_qty > 0 ? o.total_value / o.total_qty : 0;

        let position_side: 'long' | 'short';
        if (o.pos_side === 'LONG') {
            position_side = 'long';
        } else if (o.pos_side === 'SHORT') {
            position_side = 'short';
        } else {
            position_side = o.side === 'SELL' ? 'long' : 'short';
        }

        const pnl_per_unit = o.total_qty > 0 ? o.total_pnl / o.total_qty : 0;
        const entry_price =
            position_side === 'long' ? exit_price - pnl_per_unit : exit_price + pnl_per_unit;

        closed.push({
            symbol: o.symbol,
            side: position_side,
            size: o.total_qty,
            entry_price: Math.max(0, entry_price),
            exit_price,
            realized_pnl: o.total_pnl,
            close_time: o.time,
            leverage: 1,
        });
    }

    return closed.sort((a, b) => b.close_time - a.close_time).slice(0, limit);
}

export async function fetch_leverage_settings(
    exchange: BinanceExchange,
    symbols?: string[]
): Promise<Record<string, number>> {
    try {
        const response = await exchange.fapiPrivateGetSymbolConfig();
        if (!is_symbol_config_array(response)) return {};

        const result: Record<string, number> = {};
        for (const item of response) {
            const symbol = normalize_symbol(item.symbol);
            if (!symbols || symbols.includes(symbol)) {
                result[symbol] = item.leverage || 1;
            }
        }
        return result;
    } catch (err) {
        console.error('failed to fetch binance leverage settings:', (err as Error).message);
        return {};
    }
}

export async function fetch_symbol_fills(
    exchange: BinanceExchange,
    symbol: string,
    limit: number
): Promise<RawFill[]> {
    const binance_symbol = symbol.replace(/\/USDT:USDT$/, 'USDT');
    const tradesRaw = await exchange.fapiPrivateGetUserTrades({
        symbol: binance_symbol,
        limit: Math.min(limit, 1000),
    });
    if (!is_trade_array(tradesRaw)) return [];

    return tradesRaw.map((t, idx) => {
        const is_buy = t.side?.toUpperCase() === 'BUY';
        const pos_side = t.positionSide?.toUpperCase() || 'BOTH';
        const pnl = Number(t.realizedPnl) || 0;

        let direction: 'open' | 'close';
        if (pos_side === 'LONG') {
            direction = is_buy ? 'open' : 'close';
        } else if (pos_side === 'SHORT') {
            direction = is_buy ? 'close' : 'open';
        } else {
            direction = pnl !== 0 ? 'close' : 'open';
        }

        return {
            id: `${t.orderId}-${idx}`,
            order_id: t.orderId,
            symbol: normalize_symbol(t.symbol),
            side: is_buy ? 'buy' : 'sell',
            price: Number(t.price || 0),
            size: Number(t.qty || 0),
            time: Number(t.time || Date.now()),
            closed_pnl: pnl,
            direction,
        };
    });
}
