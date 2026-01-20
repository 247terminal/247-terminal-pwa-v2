import type binanceusdm from 'ccxt/js/src/pro/binanceusdm.js';
import type { RawPosition, RawOrder } from '@/types/worker.types';

type BinanceExchange = InstanceType<typeof binanceusdm>;

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
    const response = (await exchange.fapiPrivateV2GetBalance()) as BinanceBalance[];
    if (!Array.isArray(response)) return null;

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
    const response = (await exchange.fapiPrivateV2GetPositionRisk()) as BinancePosition[];
    if (!Array.isArray(response)) return [];
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
    const [regular, algo] = await Promise.all([
        exchange.fapiPrivateGetOpenOrders() as Promise<BinanceOrder[]>,
        (exchange.fapiPrivateGetOpenAlgoOrders() as Promise<BinanceAlgoOrder[]>).catch(() => []),
    ]);
    const regularLen = Array.isArray(regular) ? regular.length : 0;
    const algoLen = Array.isArray(algo) ? algo.length : 0;
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
