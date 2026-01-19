import binanceusdm from 'ccxt/js/src/pro/binanceusdm.js';
import blofin from 'ccxt/js/src/pro/blofin.js';
import bybit from 'ccxt/js/src/pro/bybit.js';
import hyperliquid from 'ccxt/js/src/pro/hyperliquid.js';
import {
    EXCHANGE_CONFIG,
    VALID_SETTLE,
    BATCH_INTERVALS,
    WS_STREAM_LIMIT,
    WS_RECONNECT_DELAY,
    OHLCV_RETRY_DELAY,
    TIMEFRAME_MAP,
} from '@/config';
import { createTickerEntry } from './stream_utils';
import { startBinanceNativeStream, stopBinanceNativeStream } from './streams/binance';
import { startBybitNativeStream, stopBybitNativeStream } from './streams/bybit';
import {
    startBlofinNativeStream,
    stopBlofinNativeStream,
    fetchBlofinFundingRates,
} from './streams/blofin';
import { startCexStream, stopCexStream } from './streams/hyperliquid_cex';
import { startDexStream, stopDexStream } from './streams/hyperliquid_dex';
import type {
    ExchangeId,
    WorkerMessage,
    MarketInfo,
    TickerEntry,
    CcxtExchange,
    CcxtMarket,
    TickerStreamState,
    CcxtTickerData,
} from '@/types/worker.types';

const EXCHANGE_CLASSES = {
    binanceusdm,
    blofin,
    bybit,
    hyperliquid,
} as const;

const exchanges: Record<string, CcxtExchange> = {};
const activeStreams = new Map<string, boolean>();
const tickerStreams = new Map<string, TickerStreamState>();

const tickerUpdatePool = new Map<string, TickerEntry[]>();

function getTickerUpdateArray(exchangeId: string, size: number): TickerEntry[] {
    let arr = tickerUpdatePool.get(exchangeId);
    if (!arr || arr.length < size) {
        arr = new Array(size);
        for (let i = 0; i < size; i++) {
            arr[i] = createTickerEntry();
        }
        tickerUpdatePool.set(exchangeId, arr);
    }
    return arr;
}

function getExchange(exchangeId: ExchangeId): CcxtExchange {
    if (exchanges[exchangeId]) return exchanges[exchangeId];

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config) throw new Error(`unknown exchange: ${exchangeId}`);

    const ExchangeClass = EXCHANGE_CLASSES[config.ccxtClass as keyof typeof EXCHANGE_CLASSES];
    if (!ExchangeClass) throw new Error(`ccxt class not found: ${config.ccxtClass}`);

    const exchangeOptions: Record<string, unknown> = {
        enableRateLimit: false,
        options: { defaultType: config.defaultType },
    };

    if (config.proxy) exchangeOptions.proxy = config.proxy;
    if (config.headers) exchangeOptions.headers = config.headers;

    exchanges[exchangeId] = new ExchangeClass(exchangeOptions) as unknown as CcxtExchange;
    return exchanges[exchangeId];
}

async function loadMarkets(exchangeId: ExchangeId): Promise<Record<string, CcxtMarket>> {
    const exchange = getExchange(exchangeId);
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
        await exchange.loadMarkets();
    }
    return exchange.markets;
}

function getSwapSymbols(exchange: CcxtExchange): string[] {
    return Object.values(exchange.markets)
        .filter(isLinearSwap)
        .map((m) => m.symbol);
}

function isLinearSwap(market: CcxtMarket): boolean {
    const isActive = market.active || market.info?.isPreListing;
    return Boolean(isActive && market.type === 'swap' && VALID_SETTLE.has(market.settle));
}

function isLinearSwapForExchange(market: CcxtMarket, exchangeId: ExchangeId): boolean {
    if (!isLinearSwap(market)) return false;
    if (exchangeId === 'bybit') return market.settle === 'USDT';
    return true;
}

async function fetchMarkets(exchangeId: ExchangeId): Promise<MarketInfo[]> {
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

async function fetchTickers(
    exchangeId: ExchangeId
): Promise<
    Record<string, { last_price: number; price_24h: number | null; volume_24h: number | null }>
> {
    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    const tickers = await exchange.fetchTickers();

    const result: Record<
        string,
        { last_price: number; price_24h: number | null; volume_24h: number | null }
    > = {};

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

async function fetchFundingRates(
    exchangeId: ExchangeId
): Promise<Record<string, { funding_rate: number | null; next_funding_time: number | null }>> {
    const exchange = getExchange(exchangeId);
    const symbols = getSwapSymbols(exchange);
    if (!symbols || symbols.length === 0) return {};

    if (exchangeId === 'blofin') {
        return fetchBlofinFundingRates(exchange);
    }

    const fundingRates = await exchange.fetchFundingRates(symbols);
    const result: Record<
        string,
        { funding_rate: number | null; next_funding_time: number | null }
    > = {};

    for (const [symbol, funding] of Object.entries(fundingRates)) {
        const market = exchange.markets[symbol];
        if (!market || !isLinearSwap(market)) continue;

        result[symbol] = {
            funding_rate: funding.fundingRate ?? null,
            next_funding_time: funding.fundingTimestamp ?? funding.nextFundingTimestamp ?? null,
        };
    }

    return result;
}

async function fetchOHLCV(
    exchangeId: ExchangeId,
    symbol: string,
    timeframe: string,
    limit = 500
): Promise<
    { time: number; open: number; high: number; low: number; close: number; volume: number }[]
> {
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

async function startOHLCVStream(
    exchangeId: ExchangeId,
    symbol: string,
    timeframe: string,
    streamId: string
): Promise<void> {
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
                console.error('ohlcv stream error:', (err as Error).message);
                await new Promise((r) => setTimeout(r, OHLCV_RETRY_DELAY));
            }
        }
    };

    runLoop();
}

async function startTickerStream(exchangeId: ExchangeId): Promise<void> {
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

    const postTickerUpdate = (type: string, updates: TickerEntry[], count: number) =>
        self.postMessage({ type, exchangeId, data: updates, count });

    if (exchangeId === 'binance') {
        startBinanceNativeStream(symbols, BATCH_INTERVALS.ticker, postTickerUpdate);
        return;
    }

    if (exchangeId === 'bybit') {
        startBybitNativeStream(exchange, BATCH_INTERVALS.ticker, postTickerUpdate);
        return;
    }

    if (exchangeId === 'blofin') {
        startBlofinNativeStream(symbols, BATCH_INTERVALS.ticker, postTickerUpdate);
        return;
    }

    if (exchangeId === 'hyperliquid') {
        startCexStream(exchange, BATCH_INTERVALS.ticker, (updates, count) =>
            self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: updates, count })
        );
        startDexStream(
            exchangeId,
            exchange,
            isLinearSwap,
            BATCH_INTERVALS.ticker,
            (updates, count) =>
                self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: updates, count })
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

        self.postMessage({ type: 'TICKER_UPDATE', exchangeId, data: pooled, count: size });
    };

    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += WS_STREAM_LIMIT) {
        batches.push(symbols.slice(i, i + WS_STREAM_LIMIT));
    }

    const runBatchLoop = async (batch: string[]) => {
        while (tickerStreams.get(exchangeId)?.active) {
            try {
                const tickers = await exchange.watchTickers(batch);
                const stream = tickerStreams.get(exchangeId);
                if (!stream?.active) break;

                for (const [symbol, ticker] of Object.entries(tickers)) {
                    const market = exchange.markets[symbol];
                    if (!market || !isLinearSwap(market)) continue;
                    stream.pending.set(symbol, ticker as CcxtTickerData);
                }

                if (!stream.timeout && stream.pending.size > 0) {
                    stream.timeout = setTimeout(flushBatch, BATCH_INTERVALS.ticker);
                }
            } catch (err) {
                if (!tickerStreams.get(exchangeId)?.active) break;
                console.error('ticker stream error:', exchangeId, (err as Error).message);
                await new Promise((r) => setTimeout(r, WS_RECONNECT_DELAY));
            }
        }
    };

    batches.forEach((batch) => runBatchLoop(batch));
}

function stopTickerStream(exchangeId: ExchangeId): void {
    const stream = tickerStreams.get(exchangeId);
    if (stream) {
        stream.active = false;
        if (stream.timeout) clearTimeout(stream.timeout);
        tickerStreams.delete(exchangeId);
    }

    if (exchangeId === 'binance') {
        stopBinanceNativeStream();
    }
    if (exchangeId === 'bybit') {
        stopBybitNativeStream();
    }
    if (exchangeId === 'blofin') {
        stopBlofinNativeStream();
    }
    if (exchangeId === 'hyperliquid') {
        stopCexStream();
        stopDexStream(exchangeId);
    }
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload, requestId } = event.data;

    try {
        let result: unknown = null;

        switch (type) {
            case 'FETCH_MARKETS':
                result = await fetchMarkets(payload?.exchangeId as ExchangeId);
                break;
            case 'FETCH_TICKERS':
                result = await fetchTickers(payload?.exchangeId as ExchangeId);
                break;
            case 'FETCH_FUNDING_RATES':
                result = await fetchFundingRates(payload?.exchangeId as ExchangeId);
                break;
            case 'FETCH_OHLCV':
                result = await fetchOHLCV(
                    payload?.exchangeId as ExchangeId,
                    payload?.symbol as string,
                    payload?.timeframe as string,
                    payload?.limit as number
                );
                break;
            case 'START_OHLCV_STREAM':
                startOHLCVStream(
                    payload?.exchangeId as ExchangeId,
                    payload?.symbol as string,
                    payload?.timeframe as string,
                    payload?.streamId as string
                );
                result = { started: true };
                break;
            case 'STOP_STREAM':
                activeStreams.set(payload?.streamId as string, false);
                result = { stopped: true };
                break;
            case 'STOP_ALL_STREAMS':
                activeStreams.clear();
                result = { stopped: true };
                break;
            case 'START_TICKER_STREAM':
                startTickerStream(payload?.exchangeId as ExchangeId);
                result = { started: true };
                break;
            case 'STOP_TICKER_STREAM':
                stopTickerStream(payload?.exchangeId as ExchangeId);
                result = { stopped: true };
                break;
            default:
                throw new Error(`unknown message type: ${type}`);
        }

        self.postMessage({ type: 'RESPONSE', requestId, result, error: null });
    } catch (err) {
        self.postMessage({
            type: 'RESPONSE',
            requestId,
            result: null,
            error: (err as Error).message,
        });
    }
};

self.postMessage({ type: 'READY' });
