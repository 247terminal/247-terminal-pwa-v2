function getNextHourTimestamp() {
    const now = Date.now();
    return Math.ceil(now / 3600000) * 3600000;
}

const cexStreams = {
    ws: null,
    state: 'disconnected',
    markets: new Map(),
    assetIndexMap: new Map(),
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
    cexStreams.assetIndexMap.clear();

    for (const market of Object.values(exchange.markets)) {
        if (!isCexLinearSwap(market)) continue;
        if (isDexSymbol(market.symbol)) continue;

        const ticker = market.base;
        cexStreams.markets.set(ticker, market.symbol);

        const assetIndex = parseInt(market.id, 10);
        if (!isNaN(assetIndex)) {
            cexStreams.assetIndexMap.set(assetIndex, market.symbol);
        }
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
        self.streamUtils.safeSend(ws, {
            method: 'subscribe',
            subscription: { type: 'activeAssetData' },
        });
    };

    ws.onmessage = (event) => {
        if (cexStreams.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.channel === 'allMids') {
                handleCexAllMids(msg.data);
            } else if (msg.channel === 'activeAssetData') {
                handleCexAssetData(msg.data);
            }
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

function handleCexAllMids(data) {
    if (data?.dex && data.dex !== '') return;

    const mids = data?.mids;
    if (!mids) return;

    for (const [ticker, price] of Object.entries(mids)) {
        const symbol = cexStreams.markets.get(ticker);
        if (!symbol) continue;

        const midPrice = parseFloat(price);
        if (!midPrice || midPrice <= 0) continue;

        const existing = cexStreams.tickerData.get(symbol) || {};
        existing.last_price = midPrice;
        if (!existing.best_bid) existing.best_bid = midPrice;
        if (!existing.best_ask) existing.best_ask = midPrice;
        cexStreams.tickerData.set(symbol, existing);

        cexStreams.pending.set(symbol, {
            symbol,
            last_price: midPrice,
            best_bid: existing.best_bid,
            best_ask: existing.best_ask,
            price_24h: existing.price_24h ?? null,
            volume_24h: existing.volume_24h ?? null,
            funding_rate: existing.funding_rate ?? null,
            next_funding_time: getNextHourTimestamp(),
        });
    }

    scheduleCexFlush();
}

function handleCexAssetData(data) {
    const ctxs = data?.activeAssetData;
    if (!ctxs || !Array.isArray(ctxs)) return;

    for (let i = 0; i < ctxs.length; i++) {
        const symbol = cexStreams.assetIndexMap.get(i);
        if (!symbol) continue;

        const ctx = ctxs[i];
        const existing = cexStreams.tickerData.get(symbol) || {};

        if (ctx.prevDayPx != null) {
            existing.price_24h = parseFloat(ctx.prevDayPx);
        }
        if (ctx.dayNtlVlm != null) {
            existing.volume_24h = parseFloat(ctx.dayNtlVlm);
        }
        if (ctx.impactPxs && ctx.impactPxs.length >= 2) {
            existing.best_bid = parseFloat(ctx.impactPxs[0]);
            existing.best_ask = parseFloat(ctx.impactPxs[1]);
        }
        if (ctx.funding != null) {
            existing.funding_rate = parseFloat(ctx.funding);
        }

        cexStreams.tickerData.set(symbol, existing);

        if (existing.last_price && existing.last_price > 0) {
            cexStreams.pending.set(symbol, {
                symbol,
                last_price: existing.last_price,
                best_bid: existing.best_bid ?? existing.last_price,
                best_ask: existing.best_ask ?? existing.last_price,
                price_24h: existing.price_24h ?? null,
                volume_24h: existing.volume_24h ?? null,
                funding_rate: existing.funding_rate ?? null,
                next_funding_time: getNextHourTimestamp(),
            });
        }
    }

    scheduleCexFlush();
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
            data.volume_24h,
            data.funding_rate,
            data.next_funding_time
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
    cexStreams.markets.clear();
    cexStreams.assetIndexMap.clear();

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
