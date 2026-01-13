importScripts('/ccxt.browser.min.js');

const ccxtpro = self.ccxt.pro || self.ccxt;

const exchanges = {};
const activeStreams = new Map();

const EXCHANGE_CONFIG = {
    binance: { ccxtClass: 'binanceusdm', defaultType: 'swap' },
    blofin: { ccxtClass: 'blofin', defaultType: 'swap' },
    hyperliquid: { ccxtClass: 'hyperliquid', defaultType: 'swap' },
    bybit: { ccxtClass: 'bybit', defaultType: 'swap' },
};

const TIMEFRAME_MAP = {
    1: '1m',
    5: '5m',
    15: '15m',
    30: '30m',
    60: '1h',
    120: '2h',
    240: '4h',
    480: '8h',
    720: '12h',
    D: '1d',
    W: '1w',
    M: '1M',
};

function getExchange(exchangeId) {
    if (exchanges[exchangeId]) {
        return exchanges[exchangeId];
    }

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config) {
        throw new Error(`unknown exchange: ${exchangeId}`);
    }

    const ExchangeClass = ccxtpro[config.ccxtClass];
    if (!ExchangeClass) {
        throw new Error(`ccxt class not found: ${config.ccxtClass}`);
    }

    const exchange = new ExchangeClass({
        enableRateLimit: true,
        options: {
            defaultType: config.defaultType,
        },
    });

    exchanges[exchangeId] = exchange;
    return exchange;
}

async function loadMarkets(exchangeId) {
    const exchange = getExchange(exchangeId);
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
        await exchange.loadMarkets();
    }
    return exchange.markets;
}

async function fetchMarkets(exchangeId) {
    const markets = await loadMarkets(exchangeId);
    return Object.values(markets)
        .filter((market) => market.active && (market.type === 'swap' || market.type === 'future'))
        .map((market) => ({
            symbol: market.symbol,
            base: market.base || '',
            quote: market.quote || '',
            settle: market.settle || market.quote || '',
            active: market.active,
            type: market.type,
            tick_size: market.precision?.price ? Math.pow(10, -market.precision.price) : 0.01,
            min_qty: market.limits?.amount?.min || 0.001,
            max_qty: market.limits?.amount?.max || 1000000,
            qty_step: market.precision?.amount ? Math.pow(10, -market.precision.amount) : 0.001,
            contract_size: market.contractSize || 1,
            max_leverage: market.limits?.leverage?.max || null,
        }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
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
                    await new Promise((r) => setTimeout(r, 5000));
                    continue;
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
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
    };

    runLoop();
}

function stopStream(streamId) {
    activeStreams.set(streamId, false);
}

function stopAllStreams() {
    activeStreams.clear();
}

self.onmessage = async (event) => {
    const { type, payload, requestId } = event.data;

    try {
        let result = null;

        switch (type) {
            case 'FETCH_MARKETS':
                result = await fetchMarkets(payload.exchangeId);
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
                stopStream(payload.streamId);
                result = { stopped: true };
                break;

            case 'STOP_ALL_STREAMS':
                stopAllStreams();
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
