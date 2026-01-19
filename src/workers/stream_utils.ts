import { STREAM_CONFIG } from '@/config';
import type { TickerEntry, StreamState as StreamStateType } from '@/types/worker.types';

export const StreamState: Record<string, StreamStateType> = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
};

export function calculateBackoff(attempt: number): number {
    const { backoffBase, backoffMax, backoffJitter } = STREAM_CONFIG;
    const delay = Math.min(backoffBase * Math.pow(2, attempt), backoffMax);
    return Math.floor(delay + delay * backoffJitter * (Math.random() * 2 - 1));
}

const updatePoolCache = new Map<string, TickerEntry[]>();

export function getPooledUpdates(poolKey: string, size: number): TickerEntry[] {
    let pool = updatePoolCache.get(poolKey);
    const targetSize = Math.max(size, STREAM_CONFIG.minPoolSize);

    if (!pool) {
        pool = new Array(targetSize);
        for (let i = 0; i < targetSize; i++) {
            pool[i] = createTickerEntry();
        }
        updatePoolCache.set(poolKey, pool);
    } else if (pool.length < size) {
        const newSize = Math.ceil(size * STREAM_CONFIG.poolGrowthFactor);
        const oldLen = pool.length;
        pool.length = newSize;
        for (let i = oldLen; i < newSize; i++) {
            pool[i] = createTickerEntry();
        }
        updatePoolCache.set(poolKey, pool);
    }

    return pool;
}

export function createTickerEntry(symbol = ''): TickerEntry {
    return {
        symbol,
        last_price: 0,
        best_bid: 0,
        best_ask: 0,
        price_24h: null,
        volume_24h: null,
        funding_rate: null,
        next_funding_time: null,
    };
}

export function fillPooledUpdate(
    obj: TickerEntry,
    symbol: string,
    lastPrice: number,
    bestBid: number,
    bestAsk: number,
    price24h: number | null,
    volume24h: number | null,
    fundingRate: number | null,
    nextFundingTime: number | null
): TickerEntry {
    obj.symbol = symbol;
    obj.last_price = lastPrice;
    obj.best_bid = bestBid;
    obj.best_ask = bestAsk;
    obj.price_24h = price24h;
    obj.volume_24h = volume24h;
    obj.funding_rate = fundingRate ?? null;
    obj.next_funding_time = nextFundingTime ?? null;
    return obj;
}

export function createWebSocket(url: string): WebSocket | null {
    try {
        return new WebSocket(url);
    } catch (e) {
        console.error('websocket creation failed:', url, (e as Error).message);
        return null;
    }
}

export function safeClose(ws: WebSocket | null): void {
    if (!ws) return;
    try {
        ws.close();
    } catch {}
}

export function safeSend(ws: WebSocket | null, data: unknown): boolean {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('websocket send error:', (e as Error).message);
        return false;
    }
}

export function isDexSymbol(symbol: string): boolean {
    const dashIndex = symbol.indexOf('-');
    if (dashIndex <= 0) return false;
    const prefix = symbol.substring(0, dashIndex);
    return /^[A-Z]+$/.test(prefix);
}

export function getNextHourTimestamp(): number {
    const now = Date.now();
    return Math.ceil(now / 3600000) * 3600000;
}
