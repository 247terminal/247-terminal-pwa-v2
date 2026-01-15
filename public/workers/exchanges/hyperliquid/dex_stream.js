const dexStreams = new Map();

function startDexStream(exchangeId, exchange, isLinearSwap, batchInterval, postUpdate) {
    if (exchangeId !== 'hyperliquid') return;
    if (dexStreams.get(exchangeId)) return;

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config?.dexWsUrl) return;

    const dexMarkets = {};
    const dexAssetMaps = {};
    const dexBaseIds = {};

    for (const market of Object.values(exchange.markets)) {
        if (isDexSymbol(market.symbol) && isLinearSwap(market)) {
            const [prefix, rest] = market.symbol.split('-');
            const ticker = rest.split('/')[0];
            const dexName = prefix.toLowerCase();
            const key = `${dexName}:${ticker}`;
            dexMarkets[key] = market.symbol;

            if (!dexAssetMaps[dexName]) dexAssetMaps[dexName] = {};
            const assetId = parseInt(market.id, 10);
            dexAssetMaps[dexName][assetId] = market.symbol;

            if (!dexBaseIds[dexName] || assetId < dexBaseIds[dexName]) {
                dexBaseIds[dexName] = assetId;
            }
        }
    }

    if (Object.keys(dexMarkets).length === 0) return;

    const ws = new WebSocket(config.dexWsUrl);
    dexStreams.set(exchangeId, {
        ws,
        active: true,
        markets: dexMarkets,
        assetMaps: dexAssetMaps,
        baseIds: dexBaseIds,
        tickerData: new Map(),
        pending: new Map(),
        timeout: null,
    });

    const flushBatch = () => {
        const stream = dexStreams.get(exchangeId);
        if (!stream || stream.pending.size === 0) return;

        const updates = [];
        stream.pending.forEach((data, symbol) => {
            if (!data.last_price) return;
            updates.push({
                symbol,
                last_price: data.last_price,
                best_bid: data.best_bid ?? data.last_price,
                best_ask: data.best_ask ?? data.last_price,
                price_24h: data.price_24h ?? null,
                volume_24h: data.volume_24h ?? null,
            });
        });
        stream.pending.clear();
        stream.timeout = null;

        postUpdate(updates);
    };

    const scheduleBatch = () => {
        const stream = dexStreams.get(exchangeId);
        if (stream && !stream.timeout && stream.pending.size > 0) {
            stream.timeout = setTimeout(flushBatch, batchInterval);
        }
    };

    ws.onopen = () => {
        ws.send(
            JSON.stringify({
                method: 'subscribe',
                subscription: { type: 'allMids', dex: 'ALL_DEXS' },
            })
        );
        ws.send(
            JSON.stringify({
                method: 'subscribe',
                subscription: { type: 'allDexsAssetCtxs' },
            })
        );
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            const stream = dexStreams.get(exchangeId);
            if (!stream?.active) return;

            if (msg.channel === 'allMids') {
                const dex = msg.data?.dex;
                if (!dex || dex === '') return;

                const mids = msg.data.mids;
                for (const [rawTicker, price] of Object.entries(mids)) {
                    const symbol = stream.markets[rawTicker];
                    if (symbol) {
                        const existing = stream.tickerData.get(symbol) || {};
                        const midPrice = parseFloat(price);
                        existing.last_price = midPrice;
                        existing.best_bid = midPrice;
                        existing.best_ask = midPrice;
                        stream.tickerData.set(symbol, existing);
                        stream.pending.set(symbol, existing);
                    }
                }
                scheduleBatch();
            }

            if (msg.channel === 'allDexsAssetCtxs') {
                const ctxs = msg.data?.ctxs;
                if (!ctxs) return;

                for (const [dexName, assets] of ctxs) {
                    if (!dexName || dexName === '') continue;
                    const assetMap = stream.assetMaps[dexName];
                    const baseId = stream.baseIds[dexName];
                    if (!assetMap || baseId == null) continue;

                    for (let i = 0; i < assets.length; i++) {
                        const assetId = baseId + i;
                        const symbol = assetMap[assetId];
                        if (!symbol) continue;

                        const ctx = assets[i];
                        const existing = stream.tickerData.get(symbol) || {};

                        existing.price_24h =
                            ctx.prevDayPx != null ? parseFloat(ctx.prevDayPx) : null;
                        existing.volume_24h =
                            ctx.dayNtlVlm != null ? parseFloat(ctx.dayNtlVlm) : null;

                        if (ctx.impactPxs && ctx.impactPxs.length >= 2) {
                            existing.best_bid = parseFloat(ctx.impactPxs[0]);
                            existing.best_ask = parseFloat(ctx.impactPxs[1]);
                        }

                        stream.tickerData.set(symbol, existing);
                        if (existing.last_price) {
                            stream.pending.set(symbol, existing);
                        }
                    }
                }
                scheduleBatch();
            }
        } catch (err) {
            console.error('dex ws message error:', err.message);
        }
    };

    ws.onerror = (err) => {
        console.error('dex WebSocket error:', err);
    };

    ws.onclose = () => {
        const stream = dexStreams.get(exchangeId);
        if (stream?.active) {
            dexStreams.delete(exchangeId);
            setTimeout(
                () => startDexStream(exchangeId, exchange, isLinearSwap, batchInterval, postUpdate),
                WS_RECONNECT_DELAY
            );
        }
    };
}

function stopDexStream(exchangeId) {
    const stream = dexStreams.get(exchangeId);
    if (stream) {
        stream.active = false;
        if (stream.timeout) clearTimeout(stream.timeout);
        if (stream.ws) stream.ws.close();
        dexStreams.delete(exchangeId);
    }
}

self.hyperliquidDex = { startDexStream, stopDexStream };
