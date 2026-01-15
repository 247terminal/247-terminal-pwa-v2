importScripts('/ccxt.browser.min.js');
importScripts('/workers/config.js');
importScripts('/workers/utils.js');
importScripts('/workers/exchanges/hyperliquid/dex_stream.js');

const ccxtpro = self.ccxt.pro || self.ccxt;

const exchanges = {};
const activeStreams = new Map();
const tickerStreams = new Map();
const bidAskStreams = new Map();
const klineStreams = new Map();

function getExchange(exchangeId) {
    if (exchanges[exchangeId]) return exchanges[exchangeId];

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config) throw new Error(`unknown exchange: ${exchangeId}`);

    const ExchangeClass = ccxtpro[config.ccxtClass];
    if (!ExchangeClass) throw new Error(`ccxt class not found: ${config.ccxtClass}`);

    const exchangeOptions = {
        enableRateLimit: true,
        options: { defaultType: config.defaultType },
    };

    if (config.proxy) exchangeOptions.proxy = config.proxy;
    if (config.headers) exchangeOptions.headers = config.headers;

    exchanges[exchangeId] = new ExchangeClass(exchangeOptions);
    return exchanges[exchangeId];
}

async function loadMarkets(exchangeId) {
    const exchange = getExchange(exchangeId);
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
        await exchange.loadMarkets();
    }
    return exchange.markets;
}

function getSwapSymbols(exchange) {
    return Object.values(exchange.markets)
        .filter(isLinearSwap)
        .map((m) => m.symbol);
}

const VALID_SETTLE = new Set(['USDT', 'USDC', 'USDH', 'USDE']);

function isLinearSwap(market) {
    const isActive = market.active || market.info?.isPreListing;
    return isActive && market.type === 'swap' && VALID_SETTLE.has(market.settle);
}

async function fetchMarkets(exchangeId) {
    const markets = await loadMarkets(exchangeId);
    return Object.values(markets)
        .filter(isLinearSwap)
        .map((market) => ({
            symbol: market.symbol,
            base: market.base || '',
            quote: market.quote || '',
            settle: market.settle || market.quote || '',
            active: market.active,
            type: market.type,
            tick_size: market.precision?.price ?? 0.01,
            min_qty: market.limits?.amount?.min ?? 0.001,
            max_qty: market.limits?.amount?.max ?? 1000000,
            qty_step: market.precision?.amount ?? 0.001,
            contract_size: market.contractSize ?? 1,
            max_leverage: market.limits?.leverage?.max ?? null,
        }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

async function fetchTickers(exchangeId) {
    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    const tickers = await exchange.fetchTickers();

    const result = {};

    for (const [symbol, ticker] of Object.entries(tickers)) {
        const market = exchange.markets[symbol];
        if (!market || !isLinearSwap(market)) continue;

        result[symbol] = {
            last_price: ticker.last ?? ticker.close ?? 0,
            price_24h: ticker.open ?? ticker.previousClose ?? null,
            volume_24h: ticker.quoteVolume ?? ticker.baseVolume ?? null,
        };
    }

    return result;
}

async function fetchOHLCV(exchangeId, symbol, timeframe, limit = 500) {
    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    const ccxtTimeframe = TIMEFRAME_MAP[timeframe] || timeframe;
    const ohlcv = await exchange.fetchOHLCV(symbol, ccxtTimeframe, undefined, limit);

    return ohlcv.map((candle) => ({
        time: Math.floor(candle[0] / 1000),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
    }));
}

async function startOHLCVStream(exchangeId, symbol, timeframe, streamId) {
    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    const ccxtTimeframe = TIMEFRAME_MAP[timeframe] || timeframe;
    activeStreams.set(streamId, true);

    const runLoop = async () => {
        while (activeStreams.get(streamId)) {
            try {
                if (!exchange.has['watchOHLCV']) {
                    console.error('exchange does not support watchohlcv:', exchangeId);
                    break;
                }

                const ohlcv = await exchange.watchOHLCV(symbol, ccxtTimeframe);
                if (!ohlcv || ohlcv.length === 0) continue;

                const latest = ohlcv[ohlcv.length - 1];
                self.postMessage({
                    type: 'OHLCV_UPDATE',
                    streamId,
                    data: {
                        time: Math.floor(latest[0] / 1000),
                        open: latest[1],
                        high: latest[2],
                        low: latest[3],
                        close: latest[4],
                        volume: latest[5],
                    },
                });
            } catch (err) {
                if (!activeStreams.get(streamId)) break;
                console.error('ohlcv stream error:', err.message);
                await new Promise((r) => setTimeout(r, OHLCV_RETRY_DELAY));
            }
        }
    };

    runLoop();
}

async function startTickerStream(exchangeId) {
    if (tickerStreams.get(exchangeId)) return;

    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    if (!exchange.has['watchTickers']) {
        console.error('exchange does not support watchtickers:', exchangeId);
        return;
    }

    const symbols = getSwapSymbols(exchange);
    if (!symbols || symbols.length === 0) {
        console.error('no swap symbols found:', exchangeId);
        return;
    }

    tickerStreams.set(exchangeId, { active: true, pending: new Map(), timeout: null });

    const flushBatch = () => {
        const stream = tickerStreams.get(exchangeId);
        if (!stream || stream.pending.size === 0) return;

        const updates = [];
        stream.pending.forEach((ticker, symbol) => {
            updates.push({
                symbol,
                last_price: ticker.last ?? ticker.close ?? 0,
                best_bid: ticker.bid ?? 0,
                best_ask: ticker.ask ?? 0,
                price_24h: ticker.open ?? ticker.previousClose ?? null,
                volume_24h: ticker.quoteVolume ?? ticker.baseVolume ?? null,
            });
        });
        stream.pending.clear();
        stream.timeout = null;

        self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: updates });
    };

    const batches = [];
    for (let i = 0; i < symbols.length; i += WS_STREAM_LIMIT) {
        batches.push(symbols.slice(i, i + WS_STREAM_LIMIT));
    }

    const runBatchLoop = async (batch, batchIndex) => {
        while (tickerStreams.get(exchangeId)?.active) {
            try {
                const tickers = await exchange.watchTickers(batch);
                const stream = tickerStreams.get(exchangeId);
                if (!stream?.active) break;

                for (const [symbol, ticker] of Object.entries(tickers)) {
                    const market = exchange.markets[symbol];
                    if (!market || !isLinearSwap(market)) continue;
                    if (exchangeId === 'hyperliquid' && isDexSymbol(symbol)) continue;
                    stream.pending.set(symbol, ticker);
                }

                if (!stream.timeout && stream.pending.size > 0) {
                    stream.timeout = setTimeout(flushBatch, BATCH_INTERVALS.ticker);
                }
            } catch (err) {
                if (!tickerStreams.get(exchangeId)?.active) break;
                console.error('ticker stream error:', exchangeId, 'batch', batchIndex, err.message);
                await new Promise((r) => setTimeout(r, WS_RECONNECT_DELAY));
            }
        }
    };

    batches.forEach((batch, i) => runBatchLoop(batch, i));

    self.hyperliquidDex.startDexStream(
        exchangeId,
        exchange,
        isLinearSwap,
        BATCH_INTERVALS.ticker,
        (updates) => self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: updates })
    );

    const config = EXCHANGE_CONFIG[exchangeId];
    if (config?.enableBidAskStream) startBidAskStream(exchangeId);
    if (config?.enableKlineStream) startKlineStream(exchangeId);
}

async function startBidAskStream(exchangeId) {
    if (bidAskStreams.get(exchangeId)) return;

    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    if (!exchange.has['watchBidsAsks']) return;

    const config = EXCHANGE_CONFIG[exchangeId];
    const useAggregate = !!config?.watchBidsAsksName;
    const symbols = useAggregate ? undefined : getSwapSymbols(exchange);
    const watchParams = useAggregate ? { name: config.watchBidsAsksName } : {};

    if (!useAggregate && (!symbols || symbols.length === 0)) return;

    bidAskStreams.set(exchangeId, { active: true, pending: new Map(), timeout: null });

    const flushBatch = () => {
        const stream = bidAskStreams.get(exchangeId);
        if (!stream || stream.pending.size === 0) return;

        const updates = [];
        stream.pending.forEach((data, symbol) => {
            updates.push({ symbol, best_bid: data.bid ?? 0, best_ask: data.ask ?? 0 });
        });
        stream.pending.clear();
        stream.timeout = null;

        self.postMessage({ type: 'BIDASK_UPDATE', exchangeId, data: updates });
    };

    const runLoop = async () => {
        while (bidAskStreams.get(exchangeId)?.active) {
            try {
                const bidsAsks = await exchange.watchBidsAsks(symbols, watchParams);
                const stream = bidAskStreams.get(exchangeId);
                if (!stream?.active) break;

                for (const [symbol, data] of Object.entries(bidsAsks)) {
                    const market = exchange.markets[symbol];
                    if (!market || !isLinearSwap(market)) continue;
                    stream.pending.set(symbol, data);
                }

                if (!stream.timeout && stream.pending.size > 0) {
                    stream.timeout = setTimeout(flushBatch, BATCH_INTERVALS.bidask);
                }
            } catch (err) {
                if (!bidAskStreams.get(exchangeId)?.active) break;
                console.error('bidask stream error:', exchangeId, err.message);
                await new Promise((r) => setTimeout(r, WS_RECONNECT_DELAY));
            }
        }
    };

    runLoop();
}

async function startKlineStream(exchangeId) {
    if (klineStreams.get(exchangeId)) return;

    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    if (!exchange.has['watchOHLCVForSymbols']) return;

    const symbols = getSwapSymbols(exchange);
    if (!symbols || symbols.length === 0) return;

    const batches = [];
    for (let i = 0; i < symbols.length; i += WS_STREAM_LIMIT) {
        batches.push(symbols.slice(i, i + WS_STREAM_LIMIT));
    }

    klineStreams.set(exchangeId, { active: true, pending: new Map(), timeout: null });

    const flushBatch = () => {
        const stream = klineStreams.get(exchangeId);
        if (!stream || stream.pending.size === 0) return;

        const updates = [];
        stream.pending.forEach((price, symbol) => {
            updates.push({ symbol, last_price: price });
        });
        stream.pending.clear();
        stream.timeout = null;

        self.postMessage({ type: 'KLINE_UPDATE', exchangeId, data: updates });
    };

    const runBatchLoop = async (batch, batchIndex) => {
        const symbolTimeframes = batch.map((s) => [s, '1m']);

        while (klineStreams.get(exchangeId)?.active) {
            try {
                const ohlcvs = await exchange.watchOHLCVForSymbols(symbolTimeframes);
                const stream = klineStreams.get(exchangeId);
                if (!stream?.active) break;

                for (const [symbol, timeframes] of Object.entries(ohlcvs)) {
                    const candles = timeframes['1m'];
                    if (!candles || candles.length === 0) continue;
                    const latest = candles[candles.length - 1];
                    stream.pending.set(symbol, latest[4]);
                }

                if (!stream.timeout && stream.pending.size > 0) {
                    stream.timeout = setTimeout(flushBatch, BATCH_INTERVALS.kline);
                }
            } catch (err) {
                if (!klineStreams.get(exchangeId)?.active) break;
                console.error('kline stream error:', exchangeId, 'batch', batchIndex, err.message);
                await new Promise((r) => setTimeout(r, WS_RECONNECT_DELAY));
            }
        }
    };

    batches.forEach((batch, i) => runBatchLoop(batch, i));
}

function stopKlineStream(exchangeId) {
    const stream = klineStreams.get(exchangeId);
    if (stream) {
        stream.active = false;
        if (stream.timeout) clearTimeout(stream.timeout);
        klineStreams.delete(exchangeId);
    }
}

function stopTickerStream(exchangeId) {
    const stream = tickerStreams.get(exchangeId);
    if (stream) {
        stream.active = false;
        if (stream.timeout) clearTimeout(stream.timeout);
        tickerStreams.delete(exchangeId);
    }
    self.hyperliquidDex.stopDexStream(exchangeId);
    stopBidAskStream(exchangeId);
    stopKlineStream(exchangeId);
}

function stopBidAskStream(exchangeId) {
    const stream = bidAskStreams.get(exchangeId);
    if (stream) {
        stream.active = false;
        if (stream.timeout) clearTimeout(stream.timeout);
        bidAskStreams.delete(exchangeId);
    }
}

self.onmessage = async (event) => {
    const { type, payload, requestId } = event.data;

    try {
        let result = null;

        switch (type) {
            case 'FETCH_MARKETS':
                result = await fetchMarkets(payload.exchangeId);
                break;
            case 'FETCH_TICKERS':
                result = await fetchTickers(payload.exchangeId);
                break;
            case 'FETCH_OHLCV':
                result = await fetchOHLCV(
                    payload.exchangeId,
                    payload.symbol,
                    payload.timeframe,
                    payload.limit
                );
                break;
            case 'START_OHLCV_STREAM':
                startOHLCVStream(
                    payload.exchangeId,
                    payload.symbol,
                    payload.timeframe,
                    payload.streamId
                );
                result = { started: true };
                break;
            case 'STOP_STREAM':
                activeStreams.set(payload.streamId, false);
                result = { stopped: true };
                break;
            case 'STOP_ALL_STREAMS':
                activeStreams.clear();
                result = { stopped: true };
                break;
            case 'START_TICKER_STREAM':
                startTickerStream(payload.exchangeId);
                result = { started: true };
                break;
            case 'STOP_TICKER_STREAM':
                stopTickerStream(payload.exchangeId);
                result = { stopped: true };
                break;
            case 'START_BIDASK_STREAM':
                startBidAskStream(payload.exchangeId);
                result = { started: true };
                break;
            case 'STOP_BIDASK_STREAM':
                stopBidAskStream(payload.exchangeId);
                result = { stopped: true };
                break;
            case 'START_KLINE_STREAM':
                startKlineStream(payload.exchangeId);
                result = { started: true };
                break;
            case 'STOP_KLINE_STREAM':
                stopKlineStream(payload.exchangeId);
                result = { stopped: true };
                break;
            default:
                throw new Error(`unknown message type: ${type}`);
        }

        self.postMessage({ type: 'RESPONSE', requestId, result, error: null });
    } catch (err) {
        self.postMessage({ type: 'RESPONSE', requestId, result: null, error: err.message });
    }
};

self.postMessage({ type: 'READY' });
