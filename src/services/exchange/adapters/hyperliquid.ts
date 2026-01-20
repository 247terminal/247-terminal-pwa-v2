import * as ccxt from 'ccxt';
import type { Balance } from '@/types/trading.types';
import type { RawPosition, RawOrder } from './types';

interface ClearinghouseState {
    marginSummary?: { accountValue?: string; availableBalance?: string };
    assetPositions?: Array<{ position: Record<string, unknown> }>;
}

let cached_state: { wallet: string; data: ClearinghouseState; timestamp: number } | null = null;
const CACHE_TTL = 100;

async function get_clearinghouse_state(
    exchange: ccxt.Exchange
): Promise<ClearinghouseState | null> {
    const wallet = (exchange as ccxt.hyperliquid).walletAddress;
    if (!wallet) return null;

    const now = Date.now();
    if (
        cached_state &&
        cached_state.wallet === wallet &&
        now - cached_state.timestamp < CACHE_TTL
    ) {
        return cached_state.data;
    }

    const response = await (exchange as ccxt.hyperliquid).publicPostInfo({
        type: 'clearinghouseState',
        user: wallet,
    });

    cached_state = { wallet, data: response, timestamp: now };
    return response;
}

export function clear_cache(): void {
    cached_state = null;
}

export async function fetch_balance(exchange: ccxt.Exchange): Promise<Balance | null> {
    const state = await get_clearinghouse_state(exchange);
    if (!state?.marginSummary) return null;
    const margin = state.marginSummary;
    const total = parseFloat(margin.accountValue || '0');
    const available = parseFloat(margin.availableBalance || '0');
    return {
        total,
        available,
        used: total - available,
        currency: 'USDC',
        last_updated: Date.now(),
    };
}

export async function fetch_positions(exchange: ccxt.Exchange): Promise<RawPosition[]> {
    const state = await get_clearinghouse_state(exchange);
    if (!state?.assetPositions) return [];
    return state.assetPositions.map((item) => {
        const p = item.position;
        const szi = Number(p.szi || 0);
        const lev = p.leverage as { value?: number; type?: string } | undefined;
        return {
            symbol: `${p.coin}/USDC:USDC`,
            contracts: Math.abs(szi),
            side: szi >= 0 ? 'long' : 'short',
            entry_price: p.entryPx as string,
            mark_price: p.markPx as string,
            liquidation_price: p.liquidationPx as string | null,
            unrealized_pnl: p.unrealizedPnl as string,
            leverage: lev?.value || 1,
            margin_mode: lev?.type === 'isolated' ? 'isolated' : 'cross',
            initial_margin: p.marginUsed as string,
        };
    });
}

export async function fetch_orders(exchange: ccxt.Exchange): Promise<RawOrder[]> {
    const wallet = (exchange as ccxt.hyperliquid).walletAddress;
    if (!wallet) return [];
    const response = await (exchange as ccxt.hyperliquid).publicPostInfo({
        type: 'openOrders',
        user: wallet,
    });
    if (!Array.isArray(response)) return [];
    return response.map((o: Record<string, unknown>) => ({
        symbol: `${o.coin}/USDC:USDC`,
        id: String(o.oid),
        side: o.side === 'B' ? 'buy' : 'sell',
        type: o.orderType === 'Limit' ? 'limit' : 'market',
        amount: Number(o.sz || 0),
        price: Number(o.limitPx || 0),
        filled: 0,
        timestamp: Number(o.timestamp || Date.now()),
    }));
}
