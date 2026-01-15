const blofinStreams = {
    ws: null,
    state: 'disconnected',
    symbols: [],
    tickerData: new Map(),
    pending: new Set(),
    flushTimeout: null,
    reconnectAttempt: 0,
    reconnectTimeout: null,
    pingInterval: null,
    pongMonitor: null,
    postUpdate: null,
    batchInterval: 200,
};

function startBlofinNativeStream(symbols, batchInterval, postUpdate) {
    if (blofinStreams.state !== 'disconnected') return;

    blofinStreams.state = self.streamUtils.StreamState.CONNECTING;
    blofinStreams.symbols = symbols;
    blofinStreams.batchInterval = batchInterval;
    blofinStreams.postUpdate = postUpdate;
    blofinStreams.reconnectAttempt = 0;

    connectBlofinStream();
}

function connectBlofinStream() {
    const config = EXCHANGE_CONFIG.blofin;
    self.streamUtils.safeClose(blofinStreams.ws);
    stopBlofinPing();

    const ws = self.streamUtils.createWebSocket(config.wsUrl);
    if (!ws) {
        scheduleBlofinReconnect();
        return;
    }

    blofinStreams.ws = ws;

    ws.onopen = () => {
        blofinStreams.reconnectAttempt = 0;
        blofinStreams.state = self.streamUtils.StreamState.CONNECTED;
        subscribeBlofinSymbols();
        startBlofinPing();
    };

    ws.onmessage = (event) => {
        if (blofinStreams.state === 'disconnected') return;

        try {
            if (event.data === 'pong') {
                blofinStreams.pongMonitor?.receivedPong();
                return;
            }

            const msg = JSON.parse(event.data);
            if (msg.event === 'subscribe') return;
            if (msg.event === 'error') {
                console.error('blofin subscribe error:', msg.msg);
                return;
            }
            if (!msg.arg?.channel || msg.arg.channel !== 'tickers') return;
            if (!msg.data || !Array.isArray(msg.data)) return;

            for (const ticker of msg.data) {
                const symbol = convertBlofinSymbol(ticker.instId);
                if (!symbol) continue;

                const lastPrice = parseFloat(ticker.last);
                if (!lastPrice || lastPrice <= 0) continue;

                let entry = blofinStreams.tickerData.get(symbol);
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
                    blofinStreams.tickerData.set(symbol, entry);
                }

                entry.last_price = lastPrice;
                if (ticker.bidPrice) entry.best_bid = parseFloat(ticker.bidPrice);
                if (ticker.askPrice) entry.best_ask = parseFloat(ticker.askPrice);
                if (ticker.open24h) entry.price_24h = parseFloat(ticker.open24h);
                if (ticker.vol24h) entry.volume_24h = parseFloat(ticker.vol24h);
                if (ticker.fundingRate) entry.funding_rate = parseFloat(ticker.fundingRate);
                if (ticker.nextFundingTs)
                    entry.next_funding_time = parseInt(ticker.nextFundingTs, 10);

                blofinStreams.pending.add(symbol);
            }

            scheduleBlofinFlush();
        } catch (e) {
            console.error('blofin message parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        stopBlofinPing();
        if (blofinStreams.state === 'disconnected') return;
        console.error('blofin closed:', event.code, event.reason);
        scheduleBlofinReconnect();
    };

    ws.onerror = (err) => {
        console.error('blofin error:', err.message || 'connection error');
    };
}

function subscribeBlofinSymbols() {
    const config = EXCHANGE_CONFIG.blofin;
    const args = blofinStreams.symbols.map((s) => ({
        channel: 'tickers',
        instId: toBlofinInstId(s),
    }));

    for (let i = 0; i < args.length; i += config.subscribeBatch) {
        const batch = args.slice(i, i + config.subscribeBatch);
        self.streamUtils.safeSend(blofinStreams.ws, { op: 'subscribe', args: batch });
    }
}

function toBlofinInstId(symbol) {
    const parts = symbol.split('/');
    if (parts.length < 2) return symbol;
    const base = parts[0];
    const quote = parts[1].split(':')[0];
    return `${base}-${quote}`;
}

function convertBlofinSymbol(instId) {
    const parts = instId.split('-');
    if (parts.length < 2) return null;
    const base = parts[0];
    const quote = parts[1];
    if (!VALID_QUOTES.has(quote)) return null;
    return `${base}/${quote}:${quote}`;
}

function startBlofinPing() {
    const config = EXCHANGE_CONFIG.blofin;
    stopBlofinPing();

    blofinStreams.pongMonitor = self.streamUtils.createPongMonitor(() => {
        console.error('blofin pong timeout, reconnecting');
        connectBlofinStream();
    });
    blofinStreams.pongMonitor.start();

    blofinStreams.pingInterval = setInterval(() => {
        if (blofinStreams.ws?.readyState === WebSocket.OPEN) {
            blofinStreams.ws.send('ping');
        }
    }, config.pingInterval);
}

function stopBlofinPing() {
    if (blofinStreams.pingInterval) {
        clearInterval(blofinStreams.pingInterval);
        blofinStreams.pingInterval = null;
    }
    if (blofinStreams.pongMonitor) {
        blofinStreams.pongMonitor.stop();
        blofinStreams.pongMonitor = null;
    }
}

function scheduleBlofinReconnect() {
    if (blofinStreams.reconnectTimeout) return;

    const delay = self.streamUtils.calculateBackoff(blofinStreams.reconnectAttempt++);
    blofinStreams.state = self.streamUtils.StreamState.RECONNECTING;

    blofinStreams.reconnectTimeout = setTimeout(() => {
        blofinStreams.reconnectTimeout = null;
        if (blofinStreams.state !== 'disconnected') {
            connectBlofinStream();
        }
    }, delay);
}

function scheduleBlofinFlush() {
    if (blofinStreams.flushTimeout || blofinStreams.pending.size === 0) return;
    blofinStreams.flushTimeout = setTimeout(flushBlofinBatch, blofinStreams.batchInterval);
}

function flushBlofinBatch() {
    blofinStreams.flushTimeout = null;
    if (blofinStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.blofin;
    const size = blofinStreams.pending.size;
    const pooled = self.streamUtils.getPooledUpdates(config.poolKey, size);
    let idx = 0;

    for (const symbol of blofinStreams.pending) {
        const entry = blofinStreams.tickerData.get(symbol);
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
    blofinStreams.pending.clear();

    if (idx > 0 && blofinStreams.postUpdate) {
        blofinStreams.postUpdate('TICKER_UPDATE', pooled.slice(0, idx));
    }
}

function stopBlofinNativeStream() {
    blofinStreams.state = self.streamUtils.StreamState.DISCONNECTED;

    stopBlofinPing();

    if (blofinStreams.reconnectTimeout) {
        clearTimeout(blofinStreams.reconnectTimeout);
        blofinStreams.reconnectTimeout = null;
    }
    if (blofinStreams.flushTimeout) {
        clearTimeout(blofinStreams.flushTimeout);
        blofinStreams.flushTimeout = null;
    }

    blofinStreams.tickerData.clear();
    blofinStreams.pending.clear();

    self.streamUtils.safeClose(blofinStreams.ws);
    blofinStreams.ws = null;
}

function isBlofinNativeActive() {
    return blofinStreams.state !== 'disconnected';
}

self.blofinNative = {
    startBlofinNativeStream,
    stopBlofinNativeStream,
    isBlofinNativeActive,
};
