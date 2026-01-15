const bybitStreams = {
    connections: [],
    state: 'disconnected',
    markets: new Map(),
    tickerData: new Map(),
    pending: new Map(),
    flushTimeout: null,
    reconnectAttempts: new Map(),
    reconnectTimeouts: new Map(),
    pingIntervals: new Map(),
    pongMonitors: new Map(),
    postUpdate: null,
    batchInterval: 200,
    marketBatches: [],
};

function startBybitNativeStream(exchange, batchInterval, postUpdate) {
    if (bybitStreams.state !== 'disconnected') return;

    const config = EXCHANGE_CONFIG.bybit;
    bybitStreams.state = self.streamUtils.StreamState.CONNECTING;
    bybitStreams.batchInterval = batchInterval;
    bybitStreams.postUpdate = postUpdate;

    buildBybitMarketMap(exchange);

    const marketIds = Array.from(bybitStreams.markets.keys());
    const numConnections = Math.ceil(marketIds.length / config.maxSubsPerConnection);

    bybitStreams.marketBatches = [];
    for (let i = 0; i < numConnections; i++) {
        const start = i * config.maxSubsPerConnection;
        const end = start + config.maxSubsPerConnection;
        const batch = marketIds.slice(start, end);
        bybitStreams.marketBatches.push(batch);
        bybitStreams.reconnectAttempts.set(i, 0);
        connectBybitStream(i, batch);
    }
}

function buildBybitMarketMap(exchange) {
    bybitStreams.markets.clear();

    for (const market of Object.values(exchange.markets)) {
        if (!isBybitLinearSwap(market)) continue;
        bybitStreams.markets.set(market.id, market.symbol);
    }
}

function isBybitLinearSwap(market) {
    return market.active && market.type === 'swap' && market.settle === 'USDT';
}

function connectBybitStream(connIndex, marketIds) {
    const config = EXCHANGE_CONFIG.bybit;
    self.streamUtils.safeClose(bybitStreams.connections[connIndex]);
    stopBybitPing(connIndex);

    const ws = self.streamUtils.createWebSocket(config.wsUrl);
    if (!ws) {
        scheduleBybitReconnect(connIndex);
        return;
    }

    bybitStreams.connections[connIndex] = ws;

    ws.onopen = () => {
        bybitStreams.reconnectAttempts.set(connIndex, 0);
        subscribeBybitSymbols(ws, marketIds);
        startBybitPing(connIndex, ws);
        updateBybitState();
    };

    ws.onmessage = (event) => {
        if (bybitStreams.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.op === 'pong') {
                bybitStreams.pongMonitors.get(connIndex)?.receivedPong();
                return;
            }

            if (msg.success === false) {
                console.error('bybit subscribe error:', msg.ret_msg);
                return;
            }
            if (msg.success !== undefined) return;
            if (!msg.topic?.startsWith('tickers.') || !msg.data) return;

            const ticker = msg.data;
            const marketId = ticker.symbol;
            const symbol = bybitStreams.markets.get(marketId);
            if (!symbol) return;

            const existing = bybitStreams.tickerData.get(symbol) || {};

            if (ticker.lastPrice) existing.last_price = parseFloat(ticker.lastPrice);
            if (ticker.bid1Price) existing.best_bid = parseFloat(ticker.bid1Price);
            if (ticker.ask1Price) existing.best_ask = parseFloat(ticker.ask1Price);
            if (ticker.prevPrice24h) existing.price_24h = parseFloat(ticker.prevPrice24h);
            if (ticker.turnover24h) existing.volume_24h = parseFloat(ticker.turnover24h);

            if (!existing.last_price || existing.last_price <= 0) return;

            bybitStreams.tickerData.set(symbol, existing);
            bybitStreams.pending.set(symbol, {
                symbol,
                last_price: existing.last_price,
                best_bid: existing.best_bid ?? 0,
                best_ask: existing.best_ask ?? 0,
                price_24h: existing.price_24h ?? null,
                volume_24h: existing.volume_24h ?? null,
            });

            scheduleBybitFlush();
        } catch (e) {
            console.error('bybit message parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        stopBybitPing(connIndex);
        if (bybitStreams.state === 'disconnected') return;
        console.error('bybit connection', connIndex, 'closed:', event.code, event.reason);
        scheduleBybitReconnect(connIndex);
    };

    ws.onerror = (err) => {
        console.error('bybit connection', connIndex, 'error:', err.message || 'connection error');
    };
}

function subscribeBybitSymbols(ws, marketIds) {
    const topics = marketIds.map((id) => `tickers.${id}`);

    for (let i = 0; i < topics.length; i += 100) {
        const batch = topics.slice(i, i + 100);
        self.streamUtils.safeSend(ws, { op: 'subscribe', args: batch });
    }
}

function startBybitPing(connIndex, ws) {
    const config = EXCHANGE_CONFIG.bybit;
    stopBybitPing(connIndex);

    const pongMonitor = self.streamUtils.createPongMonitor(() => {
        console.error('bybit connection', connIndex, 'pong timeout, reconnecting');
        connectBybitStream(connIndex, bybitStreams.marketBatches[connIndex]);
    });
    pongMonitor.start();
    bybitStreams.pongMonitors.set(connIndex, pongMonitor);

    const interval = setInterval(() => {
        self.streamUtils.safeSend(ws, { op: 'ping' });
    }, config.pingInterval);
    bybitStreams.pingIntervals.set(connIndex, interval);
}

function stopBybitPing(connIndex) {
    const interval = bybitStreams.pingIntervals.get(connIndex);
    if (interval) {
        clearInterval(interval);
        bybitStreams.pingIntervals.delete(connIndex);
    }
    const monitor = bybitStreams.pongMonitors.get(connIndex);
    if (monitor) {
        monitor.stop();
        bybitStreams.pongMonitors.delete(connIndex);
    }
}

function updateBybitState() {
    const openCount = bybitStreams.connections.filter(
        (ws) => ws?.readyState === WebSocket.OPEN
    ).length;
    const total = bybitStreams.marketBatches.length;

    if (openCount === total && total > 0) {
        bybitStreams.state = self.streamUtils.StreamState.CONNECTED;
    } else if (openCount > 0) {
        bybitStreams.state = self.streamUtils.StreamState.CONNECTING;
    }
}

function scheduleBybitReconnect(connIndex) {
    if (bybitStreams.reconnectTimeouts.has(connIndex)) return;

    const attempt = bybitStreams.reconnectAttempts.get(connIndex) || 0;
    bybitStreams.reconnectAttempts.set(connIndex, attempt + 1);
    const delay = self.streamUtils.calculateBackoff(attempt);

    bybitStreams.state = self.streamUtils.StreamState.RECONNECTING;

    const timeout = setTimeout(() => {
        bybitStreams.reconnectTimeouts.delete(connIndex);
        if (bybitStreams.state !== 'disconnected') {
            connectBybitStream(connIndex, bybitStreams.marketBatches[connIndex]);
        }
    }, delay);
    bybitStreams.reconnectTimeouts.set(connIndex, timeout);
}

function scheduleBybitFlush() {
    if (bybitStreams.flushTimeout || bybitStreams.pending.size === 0) return;
    bybitStreams.flushTimeout = setTimeout(flushBybitBatch, bybitStreams.batchInterval);
}

function flushBybitBatch() {
    bybitStreams.flushTimeout = null;
    if (bybitStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.bybit;
    const size = bybitStreams.pending.size;
    const pooled = self.streamUtils.getPooledUpdates(config.poolKey, size);
    let idx = 0;

    bybitStreams.pending.forEach((data) => {
        self.streamUtils.fillPooledUpdate(
            pooled[idx++],
            data.symbol,
            data.last_price,
            data.best_bid,
            data.best_ask,
            data.price_24h,
            data.volume_24h
        );
    });
    bybitStreams.pending.clear();

    if (idx > 0 && bybitStreams.postUpdate) {
        bybitStreams.postUpdate('TICKER_UPDATE', pooled.slice(0, idx));
    }
}

function stopBybitNativeStream() {
    bybitStreams.state = self.streamUtils.StreamState.DISCONNECTED;

    bybitStreams.pingIntervals.forEach((interval) => clearInterval(interval));
    bybitStreams.pingIntervals.clear();

    bybitStreams.pongMonitors.forEach((monitor) => monitor.stop());
    bybitStreams.pongMonitors.clear();

    bybitStreams.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
    bybitStreams.reconnectTimeouts.clear();

    if (bybitStreams.flushTimeout) {
        clearTimeout(bybitStreams.flushTimeout);
        bybitStreams.flushTimeout = null;
    }

    bybitStreams.markets.clear();
    bybitStreams.tickerData.clear();
    bybitStreams.pending.clear();
    bybitStreams.reconnectAttempts.clear();
    bybitStreams.marketBatches = [];

    for (const ws of bybitStreams.connections) {
        self.streamUtils.safeClose(ws);
    }
    bybitStreams.connections = [];
}

function isBybitNativeActive() {
    return bybitStreams.state !== 'disconnected';
}

self.bybitNative = {
    startBybitNativeStream,
    stopBybitNativeStream,
    isBybitNativeActive,
};
