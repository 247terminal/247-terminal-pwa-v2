import type hyperliquid from 'ccxt/js/src/pro/hyperliquid.js';
import type { RawPosition, RawOrder, RawClosedPosition } from '@/types/worker.types';
import { HYPERLIQUID_CACHE_TTL } from '@/config';

export type HyperliquidExchange = InstanceType<typeof hyperliquid>;

interface ClearinghouseState {
    marginSummary?: { accountValue?: string; totalMarginUsed?: string };
    withdrawable?: string;
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

interface UserFill {
    coin: string;
    side: string;
    px: string;
    sz: string;
    closedPnl: string;
    time: number;
    dir: string;
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
    const available =
        parseFloat(state.withdrawable || '0') || total - parseFloat(margin.totalMarginUsed || '0');

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

export async function fetch_closed_positions(
    exchange: HyperliquidExchange,
    limit: number
): Promise<RawClosedPosition[]> {
    const wallet = exchange.walletAddress;
    if (!wallet) return [];

    const response = (await exchange.publicPostInfo({
        type: 'userFills',
        user: wallet,
    })) as UserFill[];
    if (!Array.isArray(response)) return [];

    const closed: RawClosedPosition[] = [];

    for (const fill of response) {
        const dir = fill.dir || '';

        const is_close_long = dir === 'Close Long';
        const is_close_short = dir === 'Close Short';
        if (!is_close_long && !is_close_short) continue;

        const pnl = Number(fill.closedPnl || 0);
        const price = Number(fill.px);
        const size = Number(fill.sz);
        const time = Number(fill.time) || Date.now();

        const position_side: 'long' | 'short' = is_close_long ? 'long' : 'short';

        const pnl_per_unit = size > 0 ? pnl / size : 0;
        const entry_price = position_side === 'long' ? price - pnl_per_unit : price + pnl_per_unit;

        closed.push({
            symbol: `${fill.coin}/USDC:USDC`,
            side: position_side,
            size,
            entry_price: Math.max(0, entry_price),
            exit_price: price,
            realized_pnl: pnl,
            close_time: time,
        });
    }

    return closed.sort((a, b) => b.close_time - a.close_time).slice(0, limit);
}
