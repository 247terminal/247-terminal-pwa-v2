const dexStreams = {
    ws: null,
    state: 'disconnected',
    exchangeId: null,
    exchange: null,
    isLinearSwap: null,
    markets: {},
    assetMaps: {},
    baseIds: {},
    tickerData: new Map(),
    pending: new Map(),
    flushTimeout: null,
    reconnectAttempt: 0,
    reconnectTimeout: null,
    postUpdate: null,
    batchInterval: 200,
};

function startDexStream(exchangeId, exchange, isLinearSwap, batchInterval, postUpdate) {
    if (exchangeId !== 'hyperliquid') return;
    if (dexStreams.state !== 'disconnected') return;

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config?.dexWsUrl) return;

    dexStreams.state = self.streamUtils.StreamState.CONNECTING;
    dexStreams.exchangeId = exchangeId;
    dexStreams.exchange = exchange;
    dexStreams.isLinearSwap = isLinearSwap;
    dexStreams.batchInterval = batchInterval;
    dexStreams.postUpdate = postUpdate;
    dexStreams.reconnectAttempt = 0;

    buildDexMarketMaps(exchange, isLinearSwap);
    if (Object.keys(dexStreams.markets).length === 0) return;

    connectDexStream(config.dexWsUrl);
}

function buildDexMarketMaps(exchange, isLinearSwap) {
    dexStreams.markets = {};
    dexStreams.assetMaps = {};
    dexStreams.baseIds = {};

    for (const market of Object.values(exchange.markets)) {
        if (!isDexSymbol(market.symbol)) continue;
        if (!isLinearSwap(market)) continue;

        const [prefix, rest] = market.symbol.split('-');
        const ticker = rest.split('/')[0];
        const dexName = prefix.toLowerCase();
        const key = `${dexName}:${ticker}`;
        dexStreams.markets[key] = market.symbol;

        if (!dexStreams.assetMaps[dexName]) dexStreams.assetMaps[dexName] = {};
        const assetId = parseInt(market.id, 10);
        dexStreams.assetMaps[dexName][assetId] = market.symbol;

        if (!dexStreams.baseIds[dexName] || assetId < dexStreams.baseIds[dexName]) {
            dexStreams.baseIds[dexName] = assetId;
        }
    }
}

function connectDexStream(wsUrl) {
    self.streamUtils.safeClose(dexStreams.ws);

    const ws = self.streamUtils.createWebSocket(wsUrl);
    if (!ws) {
        scheduleDexReconnect(wsUrl);
        return;
    }

    dexStreams.ws = ws;

    ws.onopen = () => {
        dexStreams.reconnectAttempt = 0;
        dexStreams.state = self.streamUtils.StreamState.CONNECTED;
        self.streamUtils.safeSend(ws, {
            method: 'subscribe',
            subscription: { type: 'allMids', dex: 'ALL_DEXS' },
        });
        self.streamUtils.safeSend(ws, {
            method: 'subscribe',
            subscription: { type: 'allDexsAssetCtxs' },
        });
    };

    ws.onmessage = (event) => {
        if (dexStreams.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.channel === 'allMids') {
                handleDexAllMids(msg.data);
            } else if (msg.channel === 'allDexsAssetCtxs') {
                handleDexAssetCtxs(msg.data);
            }
        } catch (e) {
            console.error('hyperliquid dex parse error:', e.message);
        }
    };

    ws.onclose = (event) => {
        if (dexStreams.state === 'disconnected') return;
        console.error('hyperliquid dex closed:', event.code, event.reason);
        scheduleDexReconnect(wsUrl);
    };

    ws.onerror = (err) => {
        console.error('hyperliquid dex error:', err.message || 'connection error');
    };
}

function handleDexAllMids(data) {
    const dex = data?.dex;
    if (!dex || dex === '') return;

    const mids = data.mids;
    if (!mids) return;

    for (const [rawTicker, price] of Object.entries(mids)) {
        const symbol = dexStreams.markets[rawTicker];
        if (!symbol) continue;

        const midPrice = parseFloat(price);
        if (!midPrice || midPrice <= 0) continue;

        const existing = dexStreams.tickerData.get(symbol) || {};
        existing.last_price = midPrice;
        existing.best_bid = midPrice;
        existing.best_ask = midPrice;
        dexStreams.tickerData.set(symbol, existing);

        dexStreams.pending.set(symbol, {
            symbol,
            last_price: midPrice,
            best_bid: existing.best_bid ?? midPrice,
            best_ask: existing.best_ask ?? midPrice,
            price_24h: existing.price_24h ?? null,
            volume_24h: existing.volume_24h ?? null,
        });
    }

    scheduleDexFlush();
}

function handleDexAssetCtxs(data) {
    const ctxs = data?.ctxs;
    if (!ctxs || !Array.isArray(ctxs)) return;

    for (const [dexName, assets] of ctxs) {
        if (!dexName || dexName === '') continue;

        const assetMap = dexStreams.assetMaps[dexName];
        const baseId = dexStreams.baseIds[dexName];
        if (!assetMap || baseId === null || baseId === undefined) continue;

        for (let i = 0; i < assets.length; i++) {
            const assetId = baseId + i;
            const symbol = assetMap[assetId];
            if (!symbol) continue;

            const ctx = assets[i];
            const existing = dexStreams.tickerData.get(symbol) || {};

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

            dexStreams.tickerData.set(symbol, existing);

            if (existing.last_price && existing.last_price > 0) {
                dexStreams.pending.set(symbol, {
                    symbol,
                    last_price: existing.last_price,
                    best_bid: existing.best_bid ?? existing.last_price,
                    best_ask: existing.best_ask ?? existing.last_price,
                    price_24h: existing.price_24h ?? null,
                    volume_24h: existing.volume_24h ?? null,
                });
            }
        }
    }

    scheduleDexFlush();
}

function scheduleDexReconnect(wsUrl) {
    if (dexStreams.reconnectTimeout) return;

    const delay = self.streamUtils.calculateBackoff(dexStreams.reconnectAttempt++);
    dexStreams.state = self.streamUtils.StreamState.RECONNECTING;

    dexStreams.reconnectTimeout = setTimeout(() => {
        dexStreams.reconnectTimeout = null;
        if (dexStreams.state !== 'disconnected') {
            connectDexStream(wsUrl);
        }
    }, delay);
}

function scheduleDexFlush() {
    if (dexStreams.flushTimeout || dexStreams.pending.size === 0) return;
    dexStreams.flushTimeout = setTimeout(flushDexBatch, dexStreams.batchInterval);
}

function flushDexBatch() {
    dexStreams.flushTimeout = null;
    if (dexStreams.pending.size === 0) return;

    const config = EXCHANGE_CONFIG.hyperliquid;
    const size = dexStreams.pending.size;
    const pooled = self.streamUtils.getPooledUpdates(config.poolKeys.dex, size);
    let idx = 0;

    dexStreams.pending.forEach((data) => {
        if (!data.last_price || data.last_price <= 0) return;
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
    dexStreams.pending.clear();

    if (idx > 0 && dexStreams.postUpdate) {
        dexStreams.postUpdate(pooled.slice(0, idx));
    }
}

function stopDexStream(exchangeId) {
    if (exchangeId !== 'hyperliquid') return;

    dexStreams.state = self.streamUtils.StreamState.DISCONNECTED;

    if (dexStreams.reconnectTimeout) {
        clearTimeout(dexStreams.reconnectTimeout);
        dexStreams.reconnectTimeout = null;
    }
    if (dexStreams.flushTimeout) {
        clearTimeout(dexStreams.flushTimeout);
        dexStreams.flushTimeout = null;
    }

    dexStreams.pending.clear();
    dexStreams.tickerData.clear();

    self.streamUtils.safeClose(dexStreams.ws);
    dexStreams.ws = null;
}

function isDexStreamActive() {
    return dexStreams.state !== 'disconnected';
}

self.hyperliquidDex = {
    startDexStream,
    stopDexStream,
    isDexStreamActive,
};
