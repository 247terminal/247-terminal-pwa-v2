const binanceStreams = {
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
    pongMonitors: {},
    pingIntervals: {},
};

function getOrCreateEntry(symbol) {
    let entry = binanceStreams.tickerData.get(symbol);
    if (!entry) {
        entry = {
            symbol,
            last_price: 0,
            best_bid: 0,
            best_ask: 0,
            price_24h: null,
            volume_24h: null,
            funding_rate: null,
            next_funding_time: null,
        };
        binanceStreams.tickerData.set(symbol, entry);
    }
    return entry;
}

function parseSymbol(rawSymbol) {
    const quote = rawSymbol.slice(-4);
    if (!VALID_QUOTES.has(quote)) return null;
    const base = rawSymbol.slice(0, -4);
    return `${base}/${quote}:${quote}`;
}

function startBinanceNativeStream(symbols, batchInterval, postUpdate) {
    if (binanceStreams.state !== 'disconnected') return;

    binanceStreams.state = self.streamUtils.StreamState.CONNECTING;
    binanceStreams.postUpdate = postUpdate;
    binanceStreams.batchInterval = batchInterval;
    binanceStreams.reconnectAttempts = { ticker: 0, bookTicker: 0, markPrice: 0 };

    connectTickerStream();
    connectBookTickerStream();
    connectMarkPriceStream();
    connectKlineStreams(symbols);
}

function connectTickerStream() {
    const config = EXCHANGE_CONFIG.binance;
    self.streamUtils.safeClose(binanceStreams.ticker);
    stopPing('ticker');

    const ws = self.streamUtils.createWebSocket(config.wsUrls.ticker);
    if (!ws) {
        scheduleReconnect('ticker', connectTickerStream);
        return;
    }

    binanceStreams.ticker = ws;

    ws.onopen = () => {
        binanceStreams.reconnectAttempts.ticker = 0;
        updateState();
        startPing('ticker', ws);
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;

        try {
            const data = JSON.parse(event.data);
            if (!Array.isArray(data)) return;

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

            scheduleFlush();
        } catch (e) {
            console.error('binance ticker parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        stopPing('ticker');
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance ticker closed:', event.code, event.reason);
        scheduleReconnect('ticker', connectTickerStream);
    };

    ws.onerror = (err) => {
        console.error('binance ticker error:', err.message || 'connection error');
    };
}

function connectBookTickerStream() {
    const config = EXCHANGE_CONFIG.binance;
    self.streamUtils.safeClose(binanceStreams.bookTicker);
    stopPing('bookTicker');

    const ws = self.streamUtils.createWebSocket(config.wsUrls.bookTicker);
    if (!ws) {
        scheduleReconnect('bookTicker', connectBookTickerStream);
        return;
    }

    binanceStreams.bookTicker = ws;

    ws.onopen = () => {
        binanceStreams.reconnectAttempts.bookTicker = 0;
        updateState();
        startPing('bookTicker', ws);
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;

        try {
            const data = JSON.parse(event.data);
            if (!data.s) return;

            const symbol = parseSymbol(data.s);
            if (!symbol) return;

            const bid = parseFloat(data.b);
            const ask = parseFloat(data.a);
            if ((!bid || bid <= 0) && (!ask || ask <= 0)) return;

            const entry = getOrCreateEntry(symbol);
            if (bid > 0) entry.best_bid = bid;
            if (ask > 0) entry.best_ask = ask;

            binanceStreams.pending.add(symbol);
            scheduleFlush();
        } catch (e) {
            console.error('binance book parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        stopPing('bookTicker');
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance book closed:', event.code, event.reason);
        scheduleReconnect('bookTicker', connectBookTickerStream);
    };

    ws.onerror = (err) => {
        console.error('binance book error:', err.message || 'connection error');
    };
}

function connectMarkPriceStream() {
    const config = EXCHANGE_CONFIG.binance;
    self.streamUtils.safeClose(binanceStreams.markPrice);
    stopPing('markPrice');

    const ws = self.streamUtils.createWebSocket(config.wsUrls.markPrice);
    if (!ws) {
        scheduleReconnect('markPrice', connectMarkPriceStream);
        return;
    }

    binanceStreams.markPrice = ws;

    ws.onopen = () => {
        binanceStreams.reconnectAttempts.markPrice = 0;
        updateState();
        startPing('markPrice', ws);
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;

        try {
            const data = JSON.parse(event.data);
            if (!Array.isArray(data)) return;

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

            scheduleFlush();
        } catch (e) {
            console.error('binance markprice parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        stopPing('markPrice');
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance markprice closed:', event.code, event.reason);
        scheduleReconnect('markPrice', connectMarkPriceStream);
    };

    ws.onerror = (err) => {
        console.error('binance markprice error:', err.message || 'connection error');
    };
}

function connectKlineStreams(symbols) {
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

    const batchSize = config.klineStreamsPerConnection;
    for (let i = 0; i < streamNames.length; i += batchSize) {
        const batch = streamNames.slice(i, i + batchSize);
        const batchIndex = binanceStreams.klineSymbolBatches.length;
        binanceStreams.klineSymbolBatches.push(batch);
        binanceStreams.klineReconnectAttempts.set(batchIndex, 0);
        connectKlineStream(batchIndex, batch);
    }
}

function connectKlineStream(connIndex, streamNames) {
    const config = EXCHANGE_CONFIG.binance;
    const existingWs = binanceStreams.klineConnections[connIndex];
    self.streamUtils.safeClose(existingWs);
    stopKlinePing(connIndex);

    const url = config.wsUrls.klineBase + streamNames.join('/');
    const ws = self.streamUtils.createWebSocket(url);
    if (!ws) {
        scheduleKlineReconnect(connIndex);
        return;
    }

    binanceStreams.klineConnections[connIndex] = ws;

    ws.onopen = () => {
        binanceStreams.klineReconnectAttempts.set(connIndex, 0);
        startKlinePing(connIndex, ws);
    };

    ws.onmessage = (event) => {
        if (binanceStreams.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);
            if (!msg.data?.e || msg.data.e !== 'kline') return;

            const kline = msg.data.k;
            if (!kline?.s) return;

            const symbol = parseSymbol(kline.s);
            if (!symbol) return;

            const closePrice = parseFloat(kline.c);
            if (!closePrice || closePrice <= 0) return;

            const entry = binanceStreams.tickerData.get(symbol);
            if (entry) {
                entry.last_price = closePrice;
                binanceStreams.pending.add(symbol);
                scheduleFlush();
            }
        } catch (e) {
            console.error('binance kline parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        stopKlinePing(connIndex);
        if (binanceStreams.state === 'disconnected') return;
        console.error('binance kline', connIndex, 'closed:', event.code, event.reason);
        scheduleKlineReconnect(connIndex);
    };

    ws.onerror = (err) => {
        console.error('binance kline', connIndex, 'error:', err.message || 'connection error');
    };
}

function startKlinePing(connIndex, ws) {
    const config = EXCHANGE_CONFIG.binance;
    stopKlinePing(connIndex);

    const key = `kline_${connIndex}`;
    binanceStreams.pongMonitors[key] = self.streamUtils.createPongMonitor(() => {
        console.error('binance kline', connIndex, 'pong timeout, reconnecting');
        connectKlineStream(connIndex, binanceStreams.klineSymbolBatches[connIndex]);
    });
    binanceStreams.pongMonitors[key].start();

    binanceStreams.pingIntervals[key] = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            binanceStreams.pongMonitors[key]?.receivedPong();
        }
    }, config.pingInterval);
}

function stopKlinePing(connIndex) {
    const key = `kline_${connIndex}`;
    if (binanceStreams.pingIntervals[key]) {
        clearInterval(binanceStreams.pingIntervals[key]);
        delete binanceStreams.pingIntervals[key];
    }
    if (binanceStreams.pongMonitors[key]) {
        binanceStreams.pongMonitors[key].stop();
        delete binanceStreams.pongMonitors[key];
    }
}

function scheduleKlineReconnect(connIndex) {
    const key = `kline_${connIndex}`;
    if (binanceStreams.reconnectTimeouts[key]) return;

    const attempt = binanceStreams.klineReconnectAttempts.get(connIndex) || 0;
    binanceStreams.klineReconnectAttempts.set(connIndex, attempt + 1);
    const delay = self.streamUtils.calculateBackoff(attempt);

    binanceStreams.reconnectTimeouts[key] = setTimeout(() => {
        delete binanceStreams.reconnectTimeouts[key];
        if (binanceStreams.state !== 'disconnected') {
            connectKlineStream(connIndex, binanceStreams.klineSymbolBatches[connIndex]);
        }
    }, delay);
}

const reconnectFns = {
    ticker: () => connectTickerStream(),
    bookTicker: () => connectBookTickerStream(),
    markPrice: () => connectMarkPriceStream(),
};

function startPing(key, ws) {
    const config = EXCHANGE_CONFIG.binance;
    stopPing(key);
    binanceStreams.pongMonitors[key] = self.streamUtils.createPongMonitor(() => {
        console.error('binance', key, 'pong timeout, reconnecting');
        reconnectFns[key]?.();
    });
    binanceStreams.pongMonitors[key].start();
    binanceStreams.pingIntervals[key] = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) binanceStreams.pongMonitors[key]?.receivedPong();
    }, config.pingInterval);
}

function stopPing(key) {
    if (binanceStreams.pingIntervals[key]) clearInterval(binanceStreams.pingIntervals[key]);
    if (binanceStreams.pongMonitors[key]) binanceStreams.pongMonitors[key].stop();
    delete binanceStreams.pingIntervals[key];
    delete binanceStreams.pongMonitors[key];
}

function updateState() {
    const tickerOpen = binanceStreams.ticker?.readyState === WebSocket.OPEN;
    const bookOpen = binanceStreams.bookTicker?.readyState === WebSocket.OPEN;
    const markOpen = binanceStreams.markPrice?.readyState === WebSocket.OPEN;

    if (tickerOpen && bookOpen && markOpen) {
        binanceStreams.state = self.streamUtils.StreamState.CONNECTED;
    } else if (tickerOpen || bookOpen || markOpen) {
        binanceStreams.state = self.streamUtils.StreamState.CONNECTING;
    }
}

function scheduleReconnect(key, connectFn) {
    if (binanceStreams.reconnectTimeouts[key]) return;

    const attempt = binanceStreams.reconnectAttempts[key]++;
    const delay = self.streamUtils.calculateBackoff(attempt);

    binanceStreams.state = self.streamUtils.StreamState.RECONNECTING;

    binanceStreams.reconnectTimeouts[key] = setTimeout(() => {
        delete binanceStreams.reconnectTimeouts[key];
        if (binanceStreams.state !== 'disconnected') {
            connectFn();
        }
    }, delay);
}

function scheduleFlush() {
    if (binanceStreams.flushTimeout || binanceStreams.pending.size === 0) return;
    binanceStreams.flushTimeout = setTimeout(flushBinanceBatch, binanceStreams.batchInterval);
}

function flushBinanceBatch() {
    binanceStreams.flushTimeout = null;
    if (binanceStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.binance;
    const size = binanceStreams.pending.size;
    const pooled = self.streamUtils.getPooledUpdates(config.poolKey, size);
    let idx = 0;

    for (const symbol of binanceStreams.pending) {
        const entry = binanceStreams.tickerData.get(symbol);
        if (entry && entry.last_price > 0) {
            self.streamUtils.fillPooledUpdate(
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
        binanceStreams.postUpdate('TICKER_UPDATE', pooled.slice(0, idx));
    }
}

function stopBinanceNativeStream() {
    binanceStreams.state = self.streamUtils.StreamState.DISCONNECTED;

    stopPing('ticker');
    stopPing('bookTicker');
    stopPing('markPrice');

    for (let i = 0; i < binanceStreams.klineConnections.length; i++) {
        stopKlinePing(i);
        self.streamUtils.safeClose(binanceStreams.klineConnections[i]);
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

    self.streamUtils.safeClose(binanceStreams.ticker);
    self.streamUtils.safeClose(binanceStreams.bookTicker);
    self.streamUtils.safeClose(binanceStreams.markPrice);
    binanceStreams.ticker = null;
    binanceStreams.bookTicker = null;
    binanceStreams.markPrice = null;
}

function isBinanceNativeActive() {
    return binanceStreams.state !== 'disconnected';
}

self.binanceNative = {
    startBinanceNativeStream,
    stopBinanceNativeStream,
    isBinanceNativeActive,
};
