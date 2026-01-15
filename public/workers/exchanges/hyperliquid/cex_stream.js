const cexStreams = {
    ws: null,
    state: 'disconnected',
    markets: new Map(),
    tickerData: new Map(),
    pending: new Map(),
    flushTimeout: null,
    reconnectAttempt: 0,
    reconnectTimeout: null,
    postUpdate: null,
    batchInterval: 200,
};

function startCexStream(exchange, batchInterval, postUpdate) {
    if (cexStreams.state !== 'disconnected') return;

    cexStreams.state = self.streamUtils.StreamState.CONNECTING;
    cexStreams.batchInterval = batchInterval;
    cexStreams.postUpdate = postUpdate;
    cexStreams.reconnectAttempt = 0;

    buildCexMarketMap(exchange);
    if (cexStreams.markets.size === 0) return;

    connectCexStream();
}

function buildCexMarketMap(exchange) {
    cexStreams.markets.clear();

    for (const market of Object.values(exchange.markets)) {
        if (!isCexLinearSwap(market)) continue;
        if (isDexSymbol(market.symbol)) continue;

        const ticker = market.base;
        cexStreams.markets.set(ticker, market.symbol);
    }
}

function isCexLinearSwap(market) {
    const isActive = market.active || market.info?.isPreListing;
    return isActive && market.type === 'swap' && VALID_SETTLE.has(market.settle);
}

function connectCexStream() {
    const config = EXCHANGE_CONFIG.hyperliquid;
    self.streamUtils.safeClose(cexStreams.ws);

    const ws = self.streamUtils.createWebSocket(config.wsUrl);
    if (!ws) {
        scheduleCexReconnect();
        return;
    }

    cexStreams.ws = ws;

    ws.onopen = () => {
        cexStreams.reconnectAttempt = 0;
        cexStreams.state = self.streamUtils.StreamState.CONNECTED;
        self.streamUtils.safeSend(ws, {
            method: 'subscribe',
            subscription: { type: 'allMids' },
        });
    };

    ws.onmessage = (event) => {
        if (cexStreams.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);
            if (msg.channel !== 'allMids') return;
            if (msg.data?.dex && msg.data.dex !== '') return;

            const mids = msg.data?.mids;
            if (!mids) return;

            for (const [ticker, price] of Object.entries(mids)) {
                const symbol = cexStreams.markets.get(ticker);
                if (!symbol) continue;

                const midPrice = parseFloat(price);
                if (!midPrice || midPrice <= 0) continue;

                const existing = cexStreams.tickerData.get(symbol) || {};
                existing.last_price = midPrice;
                existing.best_bid = midPrice;
                existing.best_ask = midPrice;
                cexStreams.tickerData.set(symbol, existing);

                cexStreams.pending.set(symbol, {
                    symbol,
                    last_price: midPrice,
                    best_bid: existing.best_bid ?? midPrice,
                    best_ask: existing.best_ask ?? midPrice,
                    price_24h: existing.price_24h ?? null,
                    volume_24h: existing.volume_24h ?? null,
                });
            }

            scheduleCexFlush();
        } catch (e) {
            console.error('hyperliquid cex parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        if (cexStreams.state === 'disconnected') return;
        console.error('hyperliquid cex closed:', event.code, event.reason);
        scheduleCexReconnect();
    };

    ws.onerror = (err) => {
        console.error('hyperliquid cex error:', err.message || 'connection error');
    };
}

function scheduleCexReconnect() {
    if (cexStreams.reconnectTimeout) return;

    const delay = self.streamUtils.calculateBackoff(cexStreams.reconnectAttempt++);
    cexStreams.state = self.streamUtils.StreamState.RECONNECTING;

    cexStreams.reconnectTimeout = setTimeout(() => {
        cexStreams.reconnectTimeout = null;
        if (cexStreams.state !== 'disconnected') {
            connectCexStream();
        }
    }, delay);
}

function scheduleCexFlush() {
    if (cexStreams.flushTimeout || cexStreams.pending.size === 0) return;
    cexStreams.flushTimeout = setTimeout(flushCexBatch, cexStreams.batchInterval);
}

function flushCexBatch() {
    cexStreams.flushTimeout = null;
    if (cexStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.hyperliquid;
    const size = cexStreams.pending.size;
    const pooled = self.streamUtils.getPooledUpdates(config.poolKeys.cex, size);
    let idx = 0;

    cexStreams.pending.forEach((data) => {
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
    cexStreams.pending.clear();

    if (idx > 0 && cexStreams.postUpdate) {
        cexStreams.postUpdate(pooled.slice(0, idx));
    }
}

function stopCexStream() {
    cexStreams.state = self.streamUtils.StreamState.DISCONNECTED;

    if (cexStreams.reconnectTimeout) {
        clearTimeout(cexStreams.reconnectTimeout);
        cexStreams.reconnectTimeout = null;
    }
    if (cexStreams.flushTimeout) {
        clearTimeout(cexStreams.flushTimeout);
        cexStreams.flushTimeout = null;
    }

    cexStreams.pending.clear();
    cexStreams.tickerData.clear();

    self.streamUtils.safeClose(cexStreams.ws);
    cexStreams.ws = null;
}

function isCexStreamActive() {
    return cexStreams.state !== 'disconnected';
}

self.hyperliquidCex = {
    startCexStream,
    stopCexStream,
    isCexStreamActive,
};
