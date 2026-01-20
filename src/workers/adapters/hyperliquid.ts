import type hyperliquid from 'ccxt/js/src/pro/hyperliquid.js';
import type { RawPosition, RawOrder } from '@/types/worker.types';
import { HYPERLIQUID_CACHE_TTL } from '@/config';

type HyperliquidExchange = InstanceType<typeof hyperliquid>;

interface ClearinghouseState {
    marginSummary?: { accountValue?: string; availableBalance?: string };
    assetPositions?: Array<{
        position: {
            coin: string;
            szi: number;
            entryPx: string;
            markPx: string;
            liquidationPx: string | null;
            unrealizedPnl: string;
            leverage: { value?: number; type?: string };
            marginUsed: string;
        };
    }>;
}

interface OpenOrder {
    coin: string;
    oid: number;
    side: string;
    orderType: string;
    sz: number;
    limitPx: number;
    timestamp: number;
}

let cached_state: { wallet: string; data: ClearinghouseState; timestamp: number } | null = null;
let pending_fetch: Promise<ClearinghouseState | null> | null = null;

async function get_clearinghouse_state(
    exchange: HyperliquidExchange
): Promise<ClearinghouseState | null> {
    const wallet = exchange.walletAddress;
    if (!wallet) return null;

    const now = Date.now();
    if (
        cached_state &&
        cached_state.wallet === wallet &&
        now - cached_state.timestamp < HYPERLIQUID_CACHE_TTL
    ) {
        return cached_state.data;
    }

    if (pending_fetch) return pending_fetch;

    pending_fetch = (async () => {
        try {
            const response = (await exchange.publicPostInfo({
                type: 'clearinghouseState',
                user: wallet,
            })) as ClearinghouseState;

            cached_state = { wallet, data: response, timestamp: Date.now() };
            return response;
        } finally {
            pending_fetch = null;
        }
    })();

    return pending_fetch;
}

export function clear_cache(): void {
    cached_state = null;
    pending_fetch = null;
}

export async function fetch_balance(exchange: HyperliquidExchange): Promise<{
    total: number;
    available: number;
    used: number;
    currency: string;
    last_updated: number;
} | null> {
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

export async function fetch_positions(exchange: HyperliquidExchange): Promise<RawPosition[]> {
    const state = await get_clearinghouse_state(exchange);
    if (!state?.assetPositions) return [];
    return state.assetPositions.map((item) => {
        const p = item.position;
        const szi = p.szi ?? 0;
        const lev = p.leverage;
        return {
            symbol: `${p.coin}/USDC:USDC`,
            contracts: Math.abs(szi),
            side: szi >= 0 ? 'long' : 'short',
            entry_price: p.entryPx,
            mark_price: p.markPx,
            liquidation_price: p.liquidationPx,
            unrealized_pnl: p.unrealizedPnl,
            leverage: lev?.value || 1,
            margin_mode: lev?.type === 'isolated' ? 'isolated' : 'cross',
            initial_margin: p.marginUsed,
        };
    });
}

export async function fetch_orders(exchange: HyperliquidExchange): Promise<RawOrder[]> {
    const wallet = exchange.walletAddress;
    if (!wallet) return [];
    const response = (await exchange.publicPostInfo({
        type: 'openOrders',
        user: wallet,
    })) as OpenOrder[];
    if (!Array.isArray(response)) return [];
    return response.map((o) => ({
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
