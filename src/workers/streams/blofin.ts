import { EXCHANGE_CONFIG, VALID_QUOTES } from '@/config';
import {
    StreamState,
    calculateBackoff,
    getPooledUpdates,
    fillPooledUpdate,
    createTickerEntry,
    createWebSocket,
    safeClose,
    safeSend,
} from '../stream_utils';
import type { PostUpdateFn, CcxtExchange, BlofinStreamsState } from '@/types/worker.types';

const blofinStreams: BlofinStreamsState = {
    ws: null,
    fundingWs: null,
    state: 'disconnected',
    symbols: [],
    tickerData: new Map(),
    pending: new Set(),
    flushTimeout: null,
    reconnectAttempt: 0,
    reconnectTimeout: null,
    fundingReconnectTimeout: null,
    pingInterval: null,
    fundingPingInterval: null,
    postUpdate: null,
    batchInterval: 200,
    tickerBuffer: new Map(),
    fundingBuffer: new Map(),
};

export function startBlofinNativeStream(
    symbols: string[],
    batchInterval: number,
    postUpdate: PostUpdateFn
): void {
    if (blofinStreams.state !== 'disconnected') return;

    blofinStreams.state = StreamState.CONNECTING;
    blofinStreams.symbols = symbols;
    blofinStreams.batchInterval = batchInterval;
    blofinStreams.postUpdate = postUpdate;
    blofinStreams.reconnectAttempt = 0;

    connectBlofinStream();
    connectBlofinFundingStream();
}

function connectBlofinStream(): void {
    const config = EXCHANGE_CONFIG.blofin;
    safeClose(blofinStreams.ws);

    const ws = createWebSocket(config.wsUrl!);
    if (!ws) {
        scheduleBlofinReconnect();
        return;
    }

    blofinStreams.ws = ws;

    ws.onopen = () => {
        blofinStreams.reconnectAttempt = 0;
        blofinStreams.state = StreamState.CONNECTED;
        subscribeBlofinSymbols();
        if (blofinStreams.pingInterval) clearInterval(blofinStreams.pingInterval);
        blofinStreams.pingInterval = setInterval(() => {
            if (blofinStreams.ws?.readyState === WebSocket.OPEN) {
                blofinStreams.ws.send('ping');
            }
        }, config.pingInterval!);
    };

    ws.onmessage = (event) => {
        if (blofinStreams.state === 'disconnected') return;

        try {
            if (event.data === 'pong') return;

            const msg = JSON.parse(event.data);
            if (msg.event === 'subscribe') return;
            if (msg.event === 'error') {
                console.error('blofin subscribe error:', msg.msg);
                return;
            }
            if (!msg.arg?.channel || msg.arg.channel !== 'tickers') return;
            if (!msg.data || !Array.isArray(msg.data)) return;

            for (const ticker of msg.data) {
                if (ticker.instId) {
                    blofinStreams.tickerBuffer.set(ticker.instId, ticker);
                }
            }

            scheduleBlofinFlush();
        } catch (e) {
            console.error('blofin message parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (blofinStreams.state === 'disconnected') return;
        console.error('blofin closed:', event.code, event.reason);
        scheduleBlofinReconnect();
    };

    ws.onerror = () => {
        console.error('blofin error: connection error');
    };
}

function subscribeBlofinSymbols(): void {
    const config = EXCHANGE_CONFIG.blofin;
    const args = blofinStreams.symbols.map((s) => ({
        channel: 'tickers',
        instId: toBlofinInstId(s),
    }));

    for (let i = 0; i < args.length; i += config.subscribeBatch!) {
        const batch = args.slice(i, i + config.subscribeBatch!);
        safeSend(blofinStreams.ws, { op: 'subscribe', args: batch });
    }
}

function connectBlofinFundingStream(): void {
    const config = EXCHANGE_CONFIG.blofin;
    safeClose(blofinStreams.fundingWs);

    const ws = createWebSocket(config.wsUrl!);
    if (!ws) {
        scheduleBlofinFundingReconnect();
        return;
    }

    blofinStreams.fundingWs = ws;

    ws.onopen = () => {
        subscribeBlofinFundingSymbols();
        if (blofinStreams.fundingPingInterval) clearInterval(blofinStreams.fundingPingInterval);
        blofinStreams.fundingPingInterval = setInterval(() => {
            if (blofinStreams.fundingWs?.readyState === WebSocket.OPEN) {
                blofinStreams.fundingWs.send('ping');
            }
        }, config.pingInterval!);
    };

    ws.onmessage = (event) => {
        if (blofinStreams.state === 'disconnected') return;

        try {
            if (event.data === 'pong') return;

            const msg = JSON.parse(event.data);
            if (msg.event === 'subscribe') return;
            if (msg.event === 'error') {
                console.error('blofin funding subscribe error:', msg.msg);
                return;
            }
            if (!msg.arg?.channel || msg.arg.channel !== 'funding-rate') return;
            if (!msg.data || !Array.isArray(msg.data)) return;

            for (const funding of msg.data) {
                if (funding.instId) {
                    blofinStreams.fundingBuffer.set(funding.instId, funding);
                }
            }

            scheduleBlofinFlush();
        } catch (e) {
            console.error('blofin funding message parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (blofinStreams.state === 'disconnected') return;
        console.error('blofin funding closed:', event.code, event.reason);
        scheduleBlofinFundingReconnect();
    };

    ws.onerror = () => {
        console.error('blofin funding error: connection error');
    };
}

function subscribeBlofinFundingSymbols(): void {
    const config = EXCHANGE_CONFIG.blofin;
    const args = blofinStreams.symbols.map((s) => ({
        channel: 'funding-rate',
        instId: toBlofinInstId(s),
    }));

    for (let i = 0; i < args.length; i += config.subscribeBatch!) {
        const batch = args.slice(i, i + config.subscribeBatch!);
        safeSend(blofinStreams.fundingWs, { op: 'subscribe', args: batch });
    }
}

function scheduleBlofinFundingReconnect(): void {
    if (blofinStreams.fundingReconnectTimeout) return;

    const delay = calculateBackoff(blofinStreams.reconnectAttempt++);

    blofinStreams.fundingReconnectTimeout = setTimeout(() => {
        blofinStreams.fundingReconnectTimeout = null;
        if (blofinStreams.state !== 'disconnected') {
            connectBlofinFundingStream();
        }
    }, delay);
}

function toBlofinInstId(symbol: string): string {
    const parts = symbol.split('/');
    if (parts.length < 2) return symbol;
    const base = parts[0];
    const quote = parts[1].split(':')[0];
    return `${base}-${quote}`;
}

export function convertBlofinSymbol(instId: string): string | null {
    const parts = instId.split('-');
    if (parts.length < 2) return null;
    const base = parts[0];
    const quote = parts[1];
    if (!VALID_QUOTES.has(quote)) return null;
    return `${base}/${quote}:${quote}`;
}

function scheduleBlofinReconnect(): void {
    if (blofinStreams.reconnectTimeout) return;

    const delay = calculateBackoff(blofinStreams.reconnectAttempt++);
    blofinStreams.state = StreamState.RECONNECTING;

    blofinStreams.reconnectTimeout = setTimeout(() => {
        blofinStreams.reconnectTimeout = null;
        if (blofinStreams.state !== 'disconnected') {
            connectBlofinStream();
        }
    }, delay);
}

function scheduleBlofinFlush(): void {
    if (blofinStreams.flushTimeout) return;
    blofinStreams.flushTimeout = setTimeout(flushBlofinBatch, blofinStreams.batchInterval);
}

function flushBlofinBatch(): void {
    blofinStreams.flushTimeout = null;

    for (const ticker of blofinStreams.tickerBuffer.values()) {
        const symbol = convertBlofinSymbol(ticker.instId);
        if (!symbol) continue;

        const lastPrice = parseFloat(ticker.last);
        if (!lastPrice || lastPrice <= 0) continue;

        let entry = blofinStreams.tickerData.get(symbol);
        if (!entry) {
            entry = createTickerEntry(symbol);
            blofinStreams.tickerData.set(symbol, entry);
        }

        entry.last_price = lastPrice;
        if (ticker.bidPrice) entry.best_bid = parseFloat(ticker.bidPrice);
        if (ticker.askPrice) entry.best_ask = parseFloat(ticker.askPrice);
        if (ticker.open24h) entry.price_24h = parseFloat(ticker.open24h);
        if (ticker.volCurrency24h) entry.volume_24h = parseFloat(ticker.volCurrency24h) * lastPrice;
        if (ticker.fundingRate) entry.funding_rate = parseFloat(ticker.fundingRate);
        if (ticker.nextFundingTs) entry.next_funding_time = parseInt(ticker.nextFundingTs, 10);

        blofinStreams.pending.add(symbol);
    }
    blofinStreams.tickerBuffer.clear();

    for (const funding of blofinStreams.fundingBuffer.values()) {
        const symbol = convertBlofinSymbol(funding.instId);
        if (!symbol) continue;

        let entry = blofinStreams.tickerData.get(symbol);
        if (!entry) {
            entry = createTickerEntry(symbol);
            blofinStreams.tickerData.set(symbol, entry);
        }

        if (funding.fundingRate) entry.funding_rate = parseFloat(funding.fundingRate);
        if (funding.fundingTime) entry.next_funding_time = parseInt(funding.fundingTime, 10);

        if (entry.last_price > 0) {
            blofinStreams.pending.add(symbol);
        }
    }
    blofinStreams.fundingBuffer.clear();

    if (blofinStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.blofin;
    const size = blofinStreams.pending.size;
    const pooled = getPooledUpdates(config.poolKey!, size);
    let idx = 0;

    for (const symbol of blofinStreams.pending) {
        const entry = blofinStreams.tickerData.get(symbol);
        if (entry && entry.last_price > 0) {
            fillPooledUpdate(
                pooled[idx++],
                entry.symbol,
                entry.last_price,
                entry.best_bid,
                entry.best_ask,
                entry.price_24h,
                entry.volume_24h,
                entry.funding_rate,
                entry.next_funding_time
            );
        }
    }
    blofinStreams.pending.clear();

    if (idx > 0 && blofinStreams.postUpdate) {
        blofinStreams.postUpdate('TICKER_UPDATE', pooled, idx);
    }
}

export function stopBlofinNativeStream(): void {
    blofinStreams.state = StreamState.DISCONNECTED;

    if (blofinStreams.reconnectTimeout) {
        clearTimeout(blofinStreams.reconnectTimeout);
        blofinStreams.reconnectTimeout = null;
    }
    if (blofinStreams.fundingReconnectTimeout) {
        clearTimeout(blofinStreams.fundingReconnectTimeout);
        blofinStreams.fundingReconnectTimeout = null;
    }
    if (blofinStreams.flushTimeout) {
        clearTimeout(blofinStreams.flushTimeout);
        blofinStreams.flushTimeout = null;
    }
    if (blofinStreams.pingInterval) {
        clearInterval(blofinStreams.pingInterval);
        blofinStreams.pingInterval = null;
    }
    if (blofinStreams.fundingPingInterval) {
        clearInterval(blofinStreams.fundingPingInterval);
        blofinStreams.fundingPingInterval = null;
    }

    blofinStreams.tickerData.clear();
    blofinStreams.pending.clear();
    blofinStreams.tickerBuffer.clear();
    blofinStreams.fundingBuffer.clear();

    safeClose(blofinStreams.ws);
    blofinStreams.ws = null;
    safeClose(blofinStreams.fundingWs);
    blofinStreams.fundingWs = null;
}

export function isBlofinNativeActive(): boolean {
    return blofinStreams.state !== 'disconnected';
}

export async function fetchBlofinFundingRates(
    exchange: CcxtExchange
): Promise<Record<string, { funding_rate: number | null; next_funding_time: number | null }>> {
    const config = EXCHANGE_CONFIG.blofin;
    const url = `${config.proxy}${config.restUrl}/api/v1/market/funding-rate`;
    const response = await fetch(url, { headers: config.headers });
    const json = await response.json();
    if (json.code !== '0' || !json.data) return {};

    const result: Record<
        string,
        { funding_rate: number | null; next_funding_time: number | null }
    > = {};
    for (const item of json.data) {
        const symbol = convertBlofinSymbol(item.instId);
        if (!symbol) continue;

        const market = exchange.markets[symbol];
        if (!market) continue;

        const fundingRate = parseFloat(item.fundingRate);
        const fundingTime = parseInt(item.fundingTime);
        result[symbol] = {
            funding_rate: Number.isNaN(fundingRate) ? null : fundingRate,
            next_funding_time: Number.isNaN(fundingTime) ? null : fundingTime,
        };
    }
    return result;
}
