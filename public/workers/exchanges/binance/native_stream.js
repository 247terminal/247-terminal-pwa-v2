const binanceStreams = {
    ticker: null,
    bookTicker: null,
    state: 'disconnected',
    reconnectAttempts: { ticker: 0, bookTicker: 0 },
    reconnectTimeouts: {},
    tickerData: new Map(),
    pending: new Set(),
    flushTimeout: null,
    postUpdate: null,
    batchInterval: 200,
    pongMonitors: {},
    pingIntervals: {},
};

function startBinanceNativeStream(batchInterval, postUpdate) {
    if (binanceStreams.state !== 'disconnected') return;

    binanceStreams.state = self.streamUtils.StreamState.CONNECTING;
    binanceStreams.postUpdate = postUpdate;
    binanceStreams.batchInterval = batchInterval;
    binanceStreams.reconnectAttempts = { ticker: 0, bookTicker: 0 };

    connectTickerStream();
    connectBookTickerStream();
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
                const rawSymbol = ticker.s;
                if (!rawSymbol) continue;

                const quote = rawSymbol.slice(-4);
                if (!VALID_QUOTES.has(quote)) continue;

                const lastPrice = parseFloat(ticker.c);
                if (!lastPrice || lastPrice <= 0) continue;

                const base = rawSymbol.slice(0, -4);
                const symbol = `${base}/${quote}:${quote}`;

                let entry = binanceStreams.tickerData.get(symbol);
                if (!entry) {
                    entry = {
                        symbol,
                        last_price: 0,
                        best_bid: 0,
                        best_ask: 0,
                        price_24h: null,
                        volume_24h: null,
                    };
                    binanceStreams.tickerData.set(symbol, entry);
                }

                entry.last_price = lastPrice;
                if (ticker.o) entry.price_24h = parseFloat(ticker.o);
                if (ticker.q) entry.volume_24h = parseFloat(ticker.q);

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
            const rawSymbol = data.s;
            if (!rawSymbol) return;

            const quote = rawSymbol.slice(-4);
            if (!VALID_QUOTES.has(quote)) return;

            const bid = parseFloat(data.b);
            const ask = parseFloat(data.a);
            if ((!bid || bid <= 0) && (!ask || ask <= 0)) return;

            const base = rawSymbol.slice(0, -4);
            const symbol = `${base}/${quote}:${quote}`;

            let entry = binanceStreams.tickerData.get(symbol);
            if (!entry) {
                entry = {
                    symbol,
                    last_price: 0,
                    best_bid: 0,
                    best_ask: 0,
                    price_24h: null,
                    volume_24h: null,
                };
                binanceStreams.tickerData.set(symbol, entry);
            }

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

function startPing(key, ws) {
    const config = EXCHANGE_CONFIG.binance;
    stopPing(key);

    binanceStreams.pongMonitors[key] = self.streamUtils.createPongMonitor(() => {
        console.error('binance', key, 'pong timeout, reconnecting');
        if (key === 'ticker') {
            connectTickerStream();
        } else {
            connectBookTickerStream();
        }
    });
    binanceStreams.pongMonitors[key].start();

    binanceStreams.pingIntervals[key] = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            binanceStreams.pongMonitors[key]?.receivedPong();
        }
    }, config.pingInterval);
}

function stopPing(key) {
    if (binanceStreams.pingIntervals[key]) {
        clearInterval(binanceStreams.pingIntervals[key]);
        delete binanceStreams.pingIntervals[key];
    }
    if (binanceStreams.pongMonitors[key]) {
        binanceStreams.pongMonitors[key].stop();
        delete binanceStreams.pongMonitors[key];
    }
}

function updateState() {
    const tickerOpen = binanceStreams.ticker?.readyState === WebSocket.OPEN;
    const bookOpen = binanceStreams.bookTicker?.readyState === WebSocket.OPEN;

    if (tickerOpen && bookOpen) {
        binanceStreams.state = self.streamUtils.StreamState.CONNECTED;
    } else if (tickerOpen || bookOpen) {
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
                entry.volume_24h
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
    binanceStreams.ticker = null;
    binanceStreams.bookTicker = null;
}

function isBinanceNativeActive() {
    return binanceStreams.state !== 'disconnected';
}

self.binanceNative = {
    startBinanceNativeStream,
    stopBinanceNativeStream,
    isBinanceNativeActive,
};
