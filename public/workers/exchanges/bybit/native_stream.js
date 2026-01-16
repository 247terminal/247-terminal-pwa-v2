const bybitStreams = {
    connections: [],
    pingIntervals: [],
    state: 'disconnected',
    markets: new Map(),
    tickerData: new Map(),
    pending: new Set(),
    flushTimeout: null,
    reconnectAttempts: new Map(),
    reconnectTimeouts: new Map(),
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

            if (msg.ret_msg === 'pong' || msg.op === 'pong') return;

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

            let entry = bybitStreams.tickerData.get(symbol);
            if (!entry) {
                entry = self.streamUtils.createTickerEntry(symbol);
                bybitStreams.tickerData.set(symbol, entry);
            }

            if (ticker.lastPrice) entry.last_price = parseFloat(ticker.lastPrice);
            if (ticker.bid1Price) entry.best_bid = parseFloat(ticker.bid1Price);
            if (ticker.ask1Price) entry.best_ask = parseFloat(ticker.ask1Price);
            if (ticker.prevPrice24h) entry.price_24h = parseFloat(ticker.prevPrice24h);
            if (ticker.turnover24h) entry.volume_24h = parseFloat(ticker.turnover24h);
            if (ticker.fundingRate) entry.funding_rate = parseFloat(ticker.fundingRate);
            if (ticker.nextFundingTime)
                entry.next_funding_time = parseInt(ticker.nextFundingTime, 10);

            if (!entry.last_price || entry.last_price <= 0) return;

            bybitStreams.pending.add(symbol);
            scheduleBybitFlush();
        } catch (e) {
            console.error('bybit message parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        if (bybitStreams.state === 'disconnected') return;
        stopBybitPing(connIndex);
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
    stopBybitPing(connIndex);
    const config = EXCHANGE_CONFIG.bybit;
    bybitStreams.pingIntervals[connIndex] = setInterval(() => {
        self.streamUtils.safeSend(ws, { op: 'ping' });
    }, config.pingInterval);
}

function stopBybitPing(connIndex) {
    if (bybitStreams.pingIntervals[connIndex]) {
        clearInterval(bybitStreams.pingIntervals[connIndex]);
        bybitStreams.pingIntervals[connIndex] = null;
    }
}

function stopAllBybitPings() {
    for (let i = 0; i < bybitStreams.pingIntervals.length; i++) {
        stopBybitPing(i);
    }
    bybitStreams.pingIntervals = [];
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

    for (const symbol of bybitStreams.pending) {
        const entry = bybitStreams.tickerData.get(symbol);
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
    bybitStreams.pending.clear();

    if (idx > 0 && bybitStreams.postUpdate) {
        bybitStreams.postUpdate('TICKER_UPDATE', pooled, idx);
    }
}

function stopBybitNativeStream() {
    bybitStreams.state = self.streamUtils.StreamState.DISCONNECTED;

    stopAllBybitPings();
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
