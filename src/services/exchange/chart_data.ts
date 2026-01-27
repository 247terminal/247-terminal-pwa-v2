import type {
    ExchangeId,
    StreamTickerUpdate,
    BidAskUpdate,
    PriceUpdate,
    FundingInfo,
} from '@/types/exchange.types';
import type { MarketData, TickerInfo, OHLCV, ChartTimeframe } from '@/types/chart.types';
import type { TwapProgressUpdate } from '@/types/twap.types';
import {
    update_ticker_stream_batch,
    update_bidask_batch,
    update_price_batch,
} from '@/stores/exchange_store';
import { update_twap } from '@/stores/twap_store';
import { WORKER_REQUEST_TIMEOUT } from '@/config';

export type { MarketData, TickerInfo, OHLCV, ChartTimeframe };

type WorkerCallback = (data: OHLCV) => void;

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();
const streamCallbacks = new Map<string, WorkerCallback>();

export function getWorker(): Worker {
    if (worker) return worker;

    worker = new Worker(new URL('../../workers/exchange.worker.ts', import.meta.url), {
        type: 'module',
    });

    worker.onmessage = (event) => {
        const {
            type,
            requestId: resId,
            result,
            error,
            streamId,
            data,
            exchangeId,
            count,
        } = event.data;

        if (type === 'RESPONSE') {
            const pending = pendingRequests.get(resId);
            if (pending) {
                clearTimeout(pending.timeoutId);
                pendingRequests.delete(resId);
                if (error) {
                    pending.reject(new Error(error));
                } else {
                    pending.resolve(result);
                }
            }
        } else if (type === 'OHLCV_UPDATE') {
            const callback = streamCallbacks.get(streamId);
            if (callback) {
                callback(data);
            }
        } else if (type === 'TICKER_UPDATE') {
            update_ticker_stream_batch(exchangeId, data as StreamTickerUpdate[], count);
        } else if (type === 'BIDASK_UPDATE') {
            update_bidask_batch(exchangeId, data as BidAskUpdate[]);
        } else if (type === 'KLINE_UPDATE') {
            update_price_batch(exchangeId, data as PriceUpdate[]);
        } else if (type === 'TWAP_PROGRESS') {
            update_twap(data.id, data as TwapProgressUpdate);
        }
    };

    worker.onerror = (err) => {
        console.error('exchange worker error:', err.message);
    };

    return worker;
}

export function sendRequest<T>(
    type: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal
): Promise<T> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new Error('request aborted'));
            return;
        }

        const id = ++requestId;
        let onAbort: (() => void) | null = null;

        const cleanup = () => {
            if (onAbort && signal) {
                signal.removeEventListener('abort', onAbort);
            }
        };

        const timeoutId = setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                cleanup();
                reject(new Error('request timeout'));
            }
        }, WORKER_REQUEST_TIMEOUT);

        const pending: PendingRequest = {
            resolve: (value: unknown) => {
                cleanup();
                resolve(value as T);
            },
            reject: (err: Error) => {
                cleanup();
                reject(err);
            },
            timeoutId,
        };
        pendingRequests.set(id, pending);

        if (signal) {
            onAbort = () => {
                if (pendingRequests.has(id)) {
                    clearTimeout(timeoutId);
                    pendingRequests.delete(id);
                    reject(new Error('request aborted'));
                }
            };
            signal.addEventListener('abort', onAbort, { once: true });
        }

        getWorker().postMessage({ type, payload, requestId: id });
    });
}

export function fetch_markets(exchangeId: ExchangeId, signal?: AbortSignal): Promise<MarketData[]> {
    return sendRequest<MarketData[]>('FETCH_MARKETS', { exchangeId }, signal);
}

export function fetch_tickers(
    exchangeId: ExchangeId,
    signal?: AbortSignal
): Promise<Record<string, TickerInfo>> {
    return sendRequest<Record<string, TickerInfo>>('FETCH_TICKERS', { exchangeId }, signal);
}

export function fetch_funding_rates(
    exchangeId: ExchangeId,
    signal?: AbortSignal
): Promise<Record<string, FundingInfo>> {
    return sendRequest<Record<string, FundingInfo>>('FETCH_FUNDING_RATES', { exchangeId }, signal);
}

export function fetch_binance_max_leverage(): Promise<Record<string, number>> {
    return sendRequest<Record<string, number>>('FETCH_BINANCE_MAX_LEVERAGE', {});
}

export function fetch_ohlcv(
    exchangeId: ExchangeId,
    symbol: string,
    timeframe: ChartTimeframe,
    limit = 500,
    signal?: AbortSignal
): Promise<OHLCV[]> {
    return sendRequest<OHLCV[]>('FETCH_OHLCV', { exchangeId, symbol, timeframe, limit }, signal);
}

export function watch_ohlcv(
    exchangeId: ExchangeId,
    symbol: string,
    timeframe: ChartTimeframe,
    onCandle: WorkerCallback
): () => void {
    const streamId = `${exchangeId}:${symbol}:${timeframe}:${Date.now()}`;
    streamCallbacks.set(streamId, onCandle);

    sendRequest('START_OHLCV_STREAM', { exchangeId, symbol, timeframe, streamId });

    return () => {
        streamCallbacks.delete(streamId);
        sendRequest('STOP_STREAM', { streamId });
    };
}

export function stop_all_streams(): void {
    streamCallbacks.clear();
    sendRequest('STOP_ALL_STREAMS', {});
}

export function toolbar_to_chart_timeframe(tf: string): ChartTimeframe {
    const valid: ChartTimeframe[] = [
        '1',
        '5',
        '15',
        '30',
        '60',
        '120',
        '240',
        '480',
        '720',
        'D',
        'W',
        'M',
    ];
    return valid.includes(tf as ChartTimeframe) ? (tf as ChartTimeframe) : '1';
}

export function start_ticker_stream(exchangeId: ExchangeId): void {
    sendRequest('START_TICKER_STREAM', { exchangeId });
}

export function stop_ticker_stream(exchangeId: ExchangeId): void {
    sendRequest('STOP_TICKER_STREAM', { exchangeId });
}
