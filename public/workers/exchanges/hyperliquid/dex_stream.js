const dexStreams = new Map();

function isDexSymbol(symbol) {
    const dashIndex = symbol.indexOf('-');
    if (dashIndex <= 0) return false;
    const prefix = symbol.substring(0, dashIndex);
    return /^[A-Z]+$/.test(prefix);
}

function startDexStream(exchangeId, exchange, isLinearSwap, batchInterval, postUpdate) {
    if (exchangeId !== 'hyperliquid') return;
    if (dexStreams.get(exchangeId)) return;

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config?.dexWsUrl) return;

    const dexMarkets = {};
    const dexIndexMaps = {};

    for (const market of Object.values(exchange.markets)) {
        if (isDexSymbol(market.symbol) && isLinearSwap(market)) {
            const [prefix, rest] = market.symbol.split('-');
            const ticker = rest.split('/')[0];
            const dexName = prefix.toLowerCase();
            const key = `${dexName}:${ticker}`;
            dexMarkets[key] = market.symbol;

            if (!dexIndexMaps[dexName]) dexIndexMaps[dexName] = [];
            dexIndexMaps[dexName].push({
                id: parseInt(market.id, 10),
                symbol: market.symbol,
            });
        }
    }

    if (Object.keys(dexMarkets).length === 0) return;

    for (const dex of Object.keys(dexIndexMaps)) {
        dexIndexMaps[dex].sort((a, b) => a.id - b.id);
    }

    const ws = new WebSocket(config.dexWsUrl);
    dexStreams.set(exchangeId, {
        ws,
        active: true,
        markets: dexMarkets,
        indexMaps: dexIndexMaps,
        tickerData: new Map(),
        pending: new Map(),
        timeout: null,
    });

    const flushBatch = () => {
        const stream = dexStreams.get(exchangeId);
        if (!stream || stream.pending.size === 0) return;

        const updates = [];
        stream.pending.forEach((data, symbol) => {
            updates.push({
                symbol,
                last_price: data.last_price ?? 0,
                best_bid: data.best_bid ?? 0,
                best_ask: data.best_ask ?? 0,
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
                    const indexMap = stream.indexMaps[dexName];
                    if (!indexMap) continue;

                    for (let i = 0; i < assets.length && i < indexMap.length; i++) {
                        const ctx = assets[i];
                        const symbol = indexMap[i].symbol;
                        const existing = stream.tickerData.get(symbol) || {};

                        existing.price_24h = ctx.prevDayPx ? parseFloat(ctx.prevDayPx) : null;
                        existing.volume_24h = ctx.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : null;

                        if (ctx.impactPxs && ctx.impactPxs.length >= 2) {
                            existing.best_bid = parseFloat(ctx.impactPxs[0]);
                            existing.best_ask = parseFloat(ctx.impactPxs[1]);
                        }

                        stream.tickerData.set(symbol, existing);
                        stream.pending.set(symbol, existing);
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
