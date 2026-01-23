import binanceusdm from 'ccxt/js/src/pro/binanceusdm.js';
import blofin from 'ccxt/js/src/pro/blofin.js';
import bybit from 'ccxt/js/src/pro/bybit.js';
import hyperliquid from 'ccxt/js/src/pro/hyperliquid.js';
import {
    BATCH_INTERVALS,
    WS_STREAM_LIMIT,
    WS_RECONNECT_DELAY,
    OHLCV_RETRY_DELAY,
    TIMEFRAME_MAP,
} from '@/config';
import { createTickerEntry } from './stream_utils';
import { startBinanceNativeStream, stopBinanceNativeStream } from './streams/binance';
import { startBybitNativeStream, stopBybitNativeStream } from './streams/bybit';
import { startBlofinNativeStream, stopBlofinNativeStream } from './streams/blofin';
import { startCexStream, stopCexStream } from './streams/hyperliquid_cex';
import { startDexStream, stopDexStream } from './streams/hyperliquid_dex';
import {
    createAuthenticatedExchange,
    destroyAuthenticatedExchange,
    fetchAccountConfig,
    fetchBalance,
    fetchPositions,
    fetchOrders,
    fetchAccountData,
    fetchClosedPositions,
    fetchLeverageSettings,
    fetchSymbolFills,
    setLeverage,
    cancelOrder,
    cancelAllOrders,
    hyperliquidAdapter,
    type ExchangeAuthParams,
    type MarketInfo as AccountMarketInfo,
} from './account_worker';
import {
    registerExchangeClass,
    getExchange,
    loadMarkets,
    getSwapSymbols,
    isLinearSwap,
    fetchMarkets,
    fetchTickers,
    fetchFundingRates,
    fetchOHLCV,
    fetchBinanceMaxLeverage,
} from './data_fetchers';
import type {
    ExchangeId,
    WorkerMessage,
    TickerEntry,
    CcxtExchange,
    TickerStreamState,
    CcxtTickerData,
    OrderCategory,
} from '@/types/worker.types';

registerExchangeClass(
    'binanceusdm',
    binanceusdm as unknown as new (options: Record<string, unknown>) => CcxtExchange
);
registerExchangeClass(
    'blofin',
    blofin as unknown as new (options: Record<string, unknown>) => CcxtExchange
);
registerExchangeClass(
    'bybit',
    bybit as unknown as new (options: Record<string, unknown>) => CcxtExchange
);
registerExchangeClass(
    'hyperliquid',
    hyperliquid as unknown as new (options: Record<string, unknown>) => CcxtExchange
);

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
            case 'FETCH_BINANCE_MAX_LEVERAGE':
                result = await fetchBinanceMaxLeverage();
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
            case 'INIT_EXCHANGE': {
                const exchangeId = payload?.exchangeId as ExchangeId;
                const credentials = payload?.credentials as ExchangeAuthParams;
                createAuthenticatedExchange(exchangeId, credentials);
                result = { initialized: true };
                break;
            }
            case 'DESTROY_EXCHANGE': {
                const exchangeId = payload?.exchangeId as ExchangeId;
                destroyAuthenticatedExchange(exchangeId);
                if (exchangeId === 'hyperliquid') {
                    hyperliquidAdapter.clear_cache();
                }
                result = { destroyed: true };
                break;
            }
            case 'FETCH_BALANCE':
                result = await fetchBalance(payload?.exchangeId as ExchangeId);
                break;
            case 'FETCH_POSITIONS':
                result = await fetchPositions(
                    payload?.exchangeId as ExchangeId,
                    (payload?.marketMap as Record<string, AccountMarketInfo>) || {}
                );
                break;
            case 'FETCH_ORDERS':
                result = await fetchOrders(
                    payload?.exchangeId as ExchangeId,
                    (payload?.marketMap as Record<string, AccountMarketInfo>) || {}
                );
                break;
            case 'FETCH_ACCOUNT_CONFIG':
                result = await fetchAccountConfig(payload?.exchangeId as ExchangeId);
                break;
            case 'FETCH_ACCOUNT_DATA':
                result = await fetchAccountData(
                    payload?.exchangeId as ExchangeId,
                    (payload?.marketMap as Record<string, AccountMarketInfo>) || {}
                );
                break;
            case 'FETCH_CLOSED_POSITIONS':
                result = await fetchClosedPositions(
                    payload?.exchangeId as ExchangeId,
                    (payload?.limit as number) || 50,
                    (payload?.marketMap as Record<string, AccountMarketInfo>) || undefined
                );
                break;
            case 'FETCH_LEVERAGE_SETTINGS':
                result = await fetchLeverageSettings(
                    payload?.exchangeId as ExchangeId,
                    (payload?.symbols as string[]) || []
                );
                break;
            case 'FETCH_SYMBOL_FILLS':
                result = await fetchSymbolFills(
                    payload?.exchangeId as ExchangeId,
                    payload?.symbol as string,
                    (payload?.limit as number) || 100,
                    (payload?.marketMap as Record<string, AccountMarketInfo>) || undefined
                );
                break;
            case 'SET_LEVERAGE':
                result = await setLeverage(
                    payload?.exchangeId as ExchangeId,
                    payload?.symbol as string,
                    payload?.leverage as number
                );
                break;
            case 'CANCEL_ORDER':
                result = await cancelOrder(
                    payload?.exchangeId as ExchangeId,
                    payload?.orderId as string,
                    payload?.symbol as string,
                    payload?.category as OrderCategory
                );
                break;
            case 'CANCEL_ALL_ORDERS':
                result = await cancelAllOrders(
                    payload?.exchangeId as ExchangeId,
                    payload?.symbol as string | undefined
                );
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
