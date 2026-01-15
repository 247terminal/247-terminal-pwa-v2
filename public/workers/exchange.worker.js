importScripts('/ccxt.browser.min.js');
importScripts('/workers/config.js');
importScripts('/workers/utils.js');
importScripts('/workers/stream_utils.js');
importScripts('/workers/exchanges/binance/native_stream.js');
importScripts('/workers/exchanges/bybit/native_stream.js');
importScripts('/workers/exchanges/blofin/native_stream.js');
importScripts('/workers/exchanges/hyperliquid/dex_stream.js');
importScripts('/workers/exchanges/hyperliquid/cex_stream.js');

const ccxtpro = self.ccxt.pro || self.ccxt;

const exchanges = {};
const activeStreams = new Map();
const tickerStreams = new Map();

const tickerUpdatePool = new Map();

function getTickerUpdateArray(exchangeId, size) {
    let arr = tickerUpdatePool.get(exchangeId);
    if (!arr || arr.length < size) {
        arr = new Array(size);
        for (let i = 0; i < size; i++) {
            arr[i] = {
                symbol: '',
                last_price: 0,
                best_bid: 0,
                best_ask: 0,
                price_24h: null,
                volume_24h: null,
            };
        }
        tickerUpdatePool.set(exchangeId, arr);
    }
    return arr;
}

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

function isLinearSwap(market) {
    const isActive = market.active || market.info?.isPreListing;
    return isActive && market.type === 'swap' && VALID_SETTLE.has(market.settle);
}

async function fetchMarkets(exchangeId) {
    const markets = await loadMarkets(exchangeId);
    return Object.values(markets)
        .filter((m) => isLinearSwapForExchange(m, exchangeId))
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

function isLinearSwapForExchange(market, exchangeId) {
    if (!isLinearSwap(market)) return false;
    if (exchangeId === 'bybit') return market.settle === 'USDT';
    return true;
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
                if (!exchange.has?.watchOHLCV) {
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

    const symbols = getSwapSymbols(exchange);
    if (!symbols || symbols.length === 0) {
        console.error('no swap symbols found:', exchangeId);
        return;
    }

    tickerStreams.set(exchangeId, {
        active: true,
        pending: new Map(),
        timeout: null,
        lastFlush: 0,
    });

    const postTickerUpdate = (type, updates) =>
        self.postMessage({ type, exchangeId, data: updates });

    if (exchangeId === 'binance') {
        self.binanceNative.startBinanceNativeStream(
            symbols,
            BATCH_INTERVALS.ticker,
            postTickerUpdate
        );
        return;
    }

    if (exchangeId === 'bybit') {
        self.bybitNative.startBybitNativeStream(exchange, BATCH_INTERVALS.ticker, postTickerUpdate);
        return;
    }

    if (exchangeId === 'blofin') {
        self.blofinNative.startBlofinNativeStream(
            symbols,
            BATCH_INTERVALS.ticker,
            postTickerUpdate
        );
        return;
    }

    if (exchangeId === 'hyperliquid') {
        self.hyperliquidCex.startCexStream(exchange, BATCH_INTERVALS.ticker, (updates) =>
            self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: updates })
        );
        self.hyperliquidDex.startDexStream(
            exchangeId,
            exchange,
            isLinearSwap,
            BATCH_INTERVALS.ticker,
            (updates) => self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: updates })
        );
        return;
    }

    if (!exchange.has?.watchTickers) {
        console.error('exchange does not support watchtickers:', exchangeId);
        return;
    }

    const flushBatch = () => {
        const stream = tickerStreams.get(exchangeId);
        if (!stream || stream.pending.size === 0) return;

        const size = stream.pending.size;
        const pooled = getTickerUpdateArray(exchangeId, size);
        let idx = 0;

        stream.pending.forEach((ticker, symbol) => {
            const obj = pooled[idx++];
            obj.symbol = symbol;
            obj.last_price = ticker.last ?? ticker.close ?? 0;
            obj.best_bid = ticker.bid ?? 0;
            obj.best_ask = ticker.ask ?? 0;
            obj.price_24h = ticker.open ?? ticker.previousClose ?? null;
            obj.volume_24h = ticker.quoteVolume ?? ticker.baseVolume ?? null;
        });
        stream.pending.clear();
        stream.timeout = null;
        stream.lastFlush = Date.now();

        self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: pooled.slice(0, size) });
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
}

function stopTickerStream(exchangeId) {
    const stream = tickerStreams.get(exchangeId);
    if (stream) {
        stream.active = false;
        if (stream.timeout) clearTimeout(stream.timeout);
        tickerStreams.delete(exchangeId);
    }

    if (exchangeId === 'binance') {
        self.binanceNative.stopBinanceNativeStream();
    }
    if (exchangeId === 'bybit') {
        self.bybitNative.stopBybitNativeStream();
    }
    if (exchangeId === 'blofin') {
        self.blofinNative.stopBlofinNativeStream();
    }
    if (exchangeId === 'hyperliquid') {
        self.hyperliquidCex.stopCexStream();
        self.hyperliquidDex.stopDexStream(exchangeId);
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
            default:
                throw new Error(`unknown message type: ${type}`);
        }

        self.postMessage({ type: 'RESPONSE', requestId, result, error: null });
    } catch (err) {
        self.postMessage({ type: 'RESPONSE', requestId, result: null, error: err.message });
    }
};

self.postMessage({ type: 'READY' });
