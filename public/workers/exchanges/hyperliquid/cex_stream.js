const cexStreams = {
    ws: null,
    state: 'disconnected',
    markets: new Map(),
    assetIndexMap: new Map(),
    tickerData: new Map(),
    pending: new Set(),
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
            subscription: { type: 'allDexsAssetCtxs' },
        });
    };

    ws.onmessage = (event) => {
        if (cexStreams.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.channel === 'allMids') {
                handleCexAllMids(msg.data);
            } else if (msg.channel === 'allDexsAssetCtxs') {
                handleCexAssetCtxs(msg.data);
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
    const mids = data?.mids;
    if (!mids) return;

    for (const [ticker, price] of Object.entries(mids)) {
        if (ticker.includes(':')) continue;

        const symbol = cexStreams.markets.get(ticker);
        if (!symbol) continue;

        const midPrice = parseFloat(price);
        if (!midPrice || midPrice <= 0) continue;

        let entry = cexStreams.tickerData.get(symbol);
        if (!entry) {
            entry = self.streamUtils.createTickerEntry(symbol);
            cexStreams.tickerData.set(symbol, entry);
        }

        entry.last_price = midPrice;
        if (!entry.best_bid) entry.best_bid = midPrice;
        if (!entry.best_ask) entry.best_ask = midPrice;
        entry.next_funding_time = getNextHourTimestamp();

        cexStreams.pending.add(symbol);
    }

    scheduleCexFlush();
}

function handleCexAssetCtxs(data) {
    const ctxs = data?.ctxs;
    if (!ctxs || !Array.isArray(ctxs)) return;

    for (const [dexName, assets] of ctxs) {
        if (dexName !== '') continue;
        if (!assets || !Array.isArray(assets)) continue;

        for (let i = 0; i < assets.length; i++) {
            const symbol = cexStreams.assetIndexMap.get(i);
            if (!symbol) continue;

            const ctx = assets[i];
            let entry = cexStreams.tickerData.get(symbol);
            if (!entry) {
                entry = self.streamUtils.createTickerEntry(symbol);
                cexStreams.tickerData.set(symbol, entry);
            }

            if (ctx.prevDayPx != null) {
                entry.price_24h = parseFloat(ctx.prevDayPx);
            }
            if (ctx.dayNtlVlm != null) {
                entry.volume_24h = parseFloat(ctx.dayNtlVlm);
            }
            if (ctx.impactPxs && ctx.impactPxs.length >= 2) {
                entry.best_bid = parseFloat(ctx.impactPxs[0]);
                entry.best_ask = parseFloat(ctx.impactPxs[1]);
            }
            if (ctx.funding != null) {
                entry.funding_rate = parseFloat(ctx.funding);
            }
            if (!entry.last_price || entry.last_price <= 0) {
                if (ctx.markPx != null) {
                    const markPrice = parseFloat(ctx.markPx);
                    if (markPrice > 0) entry.last_price = markPrice;
                } else if (ctx.midPx != null) {
                    const midPrice = parseFloat(ctx.midPx);
                    if (midPrice > 0) entry.last_price = midPrice;
                }
            }

            entry.next_funding_time = getNextHourTimestamp();

            if (entry.last_price > 0) {
                cexStreams.pending.add(symbol);
            }
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

    for (const symbol of cexStreams.pending) {
        const entry = cexStreams.tickerData.get(symbol);
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
    cexStreams.pending.clear();

    if (idx > 0 && cexStreams.postUpdate) {
        cexStreams.postUpdate(pooled, idx);
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
