import { EXCHANGE_CONFIG, VALID_QUOTES } from '@/config';
import {
    StreamState,
    calculateBackoff,
    getPooledUpdates,
    fillPooledUpdate,
    createTickerEntry,
    createWebSocket,
    safeClose,
} from '../stream_utils';
import type {
    TickerEntry,
    PostUpdateFn,
    BinanceStreamsState,
    BinanceBookTicker,
} from '@/types/worker.types';

const binanceStreams: BinanceStreamsState = {
    ticker: null,
    bookTicker: null,
    markPrice: null,
    klineConnections: [],
    klineSymbolBatches: [],
    state: 'disconnected',
    reconnectAttempts: { ticker: 0, bookTicker: 0, markPrice: 0 },
    klineReconnectAttempts: new Map(),
    reconnectTimeouts: {},
    tickerData: new Map(),
    pending: new Set(),
    flushTimeout: null,
    postUpdate: null,
    batchInterval: 200,
    tickerBuffer: [],
    bookTickerBuffer: new Map(),
    markPriceBuffer: [],
    klineBuffer: new Map(),
};

function getOrCreateEntry(symbol: string): TickerEntry {
    let entry = binanceStreams.tickerData.get(symbol);
    if (!entry) {
        entry = createTickerEntry(symbol);
        binanceStreams.tickerData.set(symbol, entry);
    }
    return entry;
}

function parseSymbol(rawSymbol: string): string | null {
    const quote = rawSymbol.slice(-4);
    if (!VALID_QUOTES.has(quote)) return null;
    const base = rawSymbol.slice(0, -4);
    return `${base}/${quote}:${quote}`;
}

export function startBinanceNativeStream(
    symbols: string[],
    batchInterval: number,
    postUpdate: PostUpdateFn
): void {
    if (binanceStreams.state !== 'disconnected') return;

    binanceStreams.state = StreamState.CONNECTING;
    binanceStreams.postUpdate = postUpdate;
    binanceStreams.batchInterval = batchInterval;
    binanceStreams.reconnectAttempts = { ticker: 0, bookTicker: 0, markPrice: 0 };

    connectTickerStream();
    connectBookTickerStream();
    connectMarkPriceStream();
    connectKlineStreams(symbols);
}

function connectTickerStream(): void {
    const config = EXCHANGE_CONFIG.binance;
    safeClose(binanceStreams.ticker);

    const ws = createWebSocket(config.wsUrls!.ticker);
    if (!ws) {
        scheduleReconnect('ticker', connectTickerStream);
        return;
    }

    binanceStreams.ticker = ws;

    ws.onopen = () => {
        binanceStreams.reconnectAttempts.ticker = 0;
        updateState();
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        binanceStreams.tickerBuffer.push(event.data);
        scheduleFlush();
    };

    ws.onclose = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance ticker closed:', event.code, event.reason);
        scheduleReconnect('ticker', connectTickerStream);
    };

    ws.onerror = () => {
        console.error('binance ticker error: connection error');
    };
}

function connectBookTickerStream(): void {
    const config = EXCHANGE_CONFIG.binance;
    safeClose(binanceStreams.bookTicker);

    const ws = createWebSocket(config.wsUrls!.bookTicker);
    if (!ws) {
        scheduleReconnect('bookTicker', connectBookTickerStream);
        return;
    }

    binanceStreams.bookTicker = ws;

    ws.onopen = () => {
        binanceStreams.reconnectAttempts.bookTicker = 0;
        updateState();
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        try {
            const data = JSON.parse(event.data) as BinanceBookTicker;
            if (data.s) binanceStreams.bookTickerBuffer.set(data.s, data);
            scheduleFlush();
        } catch (e) {
            console.error('binance book parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance book closed:', event.code, event.reason);
        scheduleReconnect('bookTicker', connectBookTickerStream);
    };

    ws.onerror = () => {
        console.error('binance book error: connection error');
    };
}

function connectMarkPriceStream(): void {
    const config = EXCHANGE_CONFIG.binance;
    safeClose(binanceStreams.markPrice);

    const ws = createWebSocket(config.wsUrls!.markPrice);
    if (!ws) {
        scheduleReconnect('markPrice', connectMarkPriceStream);
        return;
    }

    binanceStreams.markPrice = ws;

    ws.onopen = () => {
        binanceStreams.reconnectAttempts.markPrice = 0;
        updateState();
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        binanceStreams.markPriceBuffer.push(event.data);
        scheduleFlush();
    };

    ws.onclose = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance markprice closed:', event.code, event.reason);
        scheduleReconnect('markPrice', connectMarkPriceStream);
    };

    ws.onerror = () => {
        console.error('binance markprice error: connection error');
    };
}

function connectKlineStreams(symbols: string[]): void {
    const config = EXCHANGE_CONFIG.binance;
    const streamNames = symbols.map((s) => {
        const parts = s.split('/');
        const base = parts[0];
        const quote = parts[1]?.split(':')[0] || 'USDT';
        return `${base.toLowerCase()}${quote.toLowerCase()}@kline_1m`;
    });

    binanceStreams.klineSymbolBatches = [];
    binanceStreams.klineConnections = [];
    binanceStreams.klineReconnectAttempts.clear();

    const batchSize = config.klineStreamsPerConnection!;
    for (let i = 0; i < streamNames.length; i += batchSize) {
        const batch = streamNames.slice(i, i + batchSize);
        const batchIndex = binanceStreams.klineSymbolBatches.length;
        binanceStreams.klineSymbolBatches.push(batch);
        binanceStreams.klineReconnectAttempts.set(batchIndex, 0);
        connectKlineStream(batchIndex, batch);
    }
}

function connectKlineStream(connIndex: number, streamNames: string[]): void {
    const config = EXCHANGE_CONFIG.binance;
    const existingWs = binanceStreams.klineConnections[connIndex];
    safeClose(existingWs);

    const url = config.wsUrls!.klineBase + streamNames.join('/');
    const ws = createWebSocket(url);
    if (!ws) {
        scheduleKlineReconnect(connIndex);
        return;
    }

    binanceStreams.klineConnections[connIndex] = ws;

    ws.onopen = () => {
        binanceStreams.klineReconnectAttempts.set(connIndex, 0);
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        try {
            const msg = JSON.parse(event.data);
            if (msg.data?.e === 'kline' && msg.data.k?.s) {
                binanceStreams.klineBuffer.set(msg.data.k.s, msg.data.k);
                scheduleFlush();
            }
        } catch (e) {
            console.error('binance kline parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance kline', connIndex, 'closed:', event.code, event.reason);
        scheduleKlineReconnect(connIndex);
    };

    ws.onerror = () => {
        console.error('binance kline', connIndex, 'error: connection error');
    };
}

function scheduleKlineReconnect(connIndex: number): void {
    const key = `kline_${connIndex}`;
    if (binanceStreams.reconnectTimeouts[key]) return;

    const attempt = binanceStreams.klineReconnectAttempts.get(connIndex) || 0;
    binanceStreams.klineReconnectAttempts.set(connIndex, attempt + 1);
    const delay = calculateBackoff(attempt);

    binanceStreams.reconnectTimeouts[key] = setTimeout(() => {
        delete binanceStreams.reconnectTimeouts[key];
        if (binanceStreams.state !== 'disconnected') {
            connectKlineStream(connIndex, binanceStreams.klineSymbolBatches[connIndex]);
        }
    }, delay);
}

function updateState(): void {
    const tickerOpen = binanceStreams.ticker?.readyState === WebSocket.OPEN;
    const bookOpen = binanceStreams.bookTicker?.readyState === WebSocket.OPEN;
    const markOpen = binanceStreams.markPrice?.readyState === WebSocket.OPEN;

    if (tickerOpen && bookOpen && markOpen) {
        binanceStreams.state = StreamState.CONNECTED;
    } else if (tickerOpen || bookOpen || markOpen) {
        binanceStreams.state = StreamState.CONNECTING;
    }
}

function scheduleReconnect(key: string, connectFn: () => void): void {
    if (binanceStreams.reconnectTimeouts[key]) return;

    const attempt = binanceStreams.reconnectAttempts[key]++;
    const delay = calculateBackoff(attempt);

    binanceStreams.state = StreamState.RECONNECTING;

    binanceStreams.reconnectTimeouts[key] = setTimeout(() => {
        delete binanceStreams.reconnectTimeouts[key];
        if (binanceStreams.state !== 'disconnected') {
            connectFn();
        }
    }, delay);
}

function scheduleFlush(): void {
    if (binanceStreams.flushTimeout) return;
    binanceStreams.flushTimeout = setTimeout(flushBinanceBatch, binanceStreams.batchInterval);
}

function flushBinanceBatch(): void {
    binanceStreams.flushTimeout = null;

    for (const raw of binanceStreams.tickerBuffer) {
        try {
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) continue;

            for (let i = 0; i < data.length; i++) {
                const ticker = data[i];
                if (!ticker.s) continue;

                const symbol = parseSymbol(ticker.s);
                if (!symbol) continue;

                const lastPrice = parseFloat(ticker.c);
                if (!lastPrice || lastPrice <= 0) continue;

                const entry = getOrCreateEntry(symbol);
                if (ticker.o) entry.price_24h = parseFloat(ticker.o);
                if (ticker.q) entry.volume_24h = parseFloat(ticker.q);
                if (!entry.last_price) entry.last_price = lastPrice;

                binanceStreams.pending.add(symbol);
            }
        } catch (e) {
            console.error('binance ticker parse error:', (e as Error).message);
        }
    }
    binanceStreams.tickerBuffer.length = 0;

    for (const data of binanceStreams.bookTickerBuffer.values()) {
        const symbol = parseSymbol(data.s);
        if (!symbol) continue;

        const bid = parseFloat(data.b);
        const ask = parseFloat(data.a);
        if ((!bid || bid <= 0) && (!ask || ask <= 0)) continue;

        const entry = getOrCreateEntry(symbol);
        if (bid > 0) entry.best_bid = bid;
        if (ask > 0) entry.best_ask = ask;

        binanceStreams.pending.add(symbol);
    }
    binanceStreams.bookTickerBuffer.clear();

    for (const raw of binanceStreams.markPriceBuffer) {
        try {
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) continue;

            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                if (!item.s) continue;

                const symbol = parseSymbol(item.s);
                if (!symbol) continue;

                const entry = binanceStreams.tickerData.get(symbol);
                if (!entry) continue;

                if (item.r) entry.funding_rate = parseFloat(item.r);
                if (item.T) entry.next_funding_time = parseInt(item.T, 10);

                binanceStreams.pending.add(symbol);
            }
        } catch (e) {
            console.error('binance markprice parse error:', (e as Error).message);
        }
    }
    binanceStreams.markPriceBuffer.length = 0;

    for (const kline of binanceStreams.klineBuffer.values()) {
        const symbol = parseSymbol(kline.s);
        if (!symbol) continue;

        const closePrice = parseFloat(kline.c);
        if (!closePrice || closePrice <= 0) continue;

        const entry = binanceStreams.tickerData.get(symbol);
        if (entry) {
            entry.last_price = closePrice;
            binanceStreams.pending.add(symbol);
        }
    }
    binanceStreams.klineBuffer.clear();

    if (binanceStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.binance;
    const size = binanceStreams.pending.size;
    const pooled = getPooledUpdates(config.poolKey!, size);
    let idx = 0;

    for (const symbol of binanceStreams.pending) {
        const entry = binanceStreams.tickerData.get(symbol);
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
    binanceStreams.pending.clear();

    if (idx > 0 && binanceStreams.postUpdate) {
        binanceStreams.postUpdate('TICKER_UPDATE', pooled, idx);
    }
}

export function stopBinanceNativeStream(): void {
    binanceStreams.state = StreamState.DISCONNECTED;

    for (let i = 0; i < binanceStreams.klineConnections.length; i++) {
        safeClose(binanceStreams.klineConnections[i]);
    }
    binanceStreams.klineConnections = [];
    binanceStreams.klineSymbolBatches = [];
    binanceStreams.klineReconnectAttempts.clear();

    if (binanceStreams.flushTimeout) {
        clearTimeout(binanceStreams.flushTimeout);
        binanceStreams.flushTimeout = null;
    }

    Object.values(binanceStreams.reconnectTimeouts).forEach(clearTimeout);
    binanceStreams.reconnectTimeouts = {};

    binanceStreams.tickerData.clear();
    binanceStreams.pending.clear();
    binanceStreams.tickerBuffer.length = 0;
    binanceStreams.bookTickerBuffer.clear();
    binanceStreams.markPriceBuffer.length = 0;
    binanceStreams.klineBuffer.clear();

    safeClose(binanceStreams.ticker);
    safeClose(binanceStreams.bookTicker);
    safeClose(binanceStreams.markPrice);
    binanceStreams.ticker = null;
    binanceStreams.bookTicker = null;
    binanceStreams.markPrice = null;
}

export function isBinanceNativeActive(): boolean {
    return binanceStreams.state !== 'disconnected';
}
