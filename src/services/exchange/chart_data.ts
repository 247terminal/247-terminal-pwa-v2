import type { ExchangeId, MarketInfo } from './types';

export interface OHLCV {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type ChartTimeframe =
    | '1'
    | '5'
    | '15'
    | '30'
    | '60'
    | '120'
    | '240'
    | '480'
    | '720'
    | 'D'
    | 'W'
    | 'M';

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

function getWorker(): Worker {
    if (worker) return worker;

    worker = new Worker('/workers/exchange.worker.js');

    worker.onmessage = (event) => {
        const { type, requestId: resId, result, error, streamId, data } = event.data;

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
        }
    };

    worker.onerror = (err) => {
        console.error('exchange worker error:', err);
    };

    return worker;
}

function sendRequest<T>(
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

        const timeoutId = setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error('request timeout'));
            }
        }, 30000);

        const pending: PendingRequest = {
            resolve: resolve as (value: unknown) => void,
            reject,
            timeoutId,
        };
        pendingRequests.set(id, pending);

        const onAbort = () => {
            if (pendingRequests.has(id)) {
                clearTimeout(timeoutId);
                pendingRequests.delete(id);
                reject(new Error('request aborted'));
            }
        };
        signal?.addEventListener('abort', onAbort, { once: true });

        getWorker().postMessage({ type, payload, requestId: id });
    });
}

export function fetch_markets(exchangeId: ExchangeId, signal?: AbortSignal): Promise<MarketInfo[]> {
    return sendRequest<MarketInfo[]>('FETCH_MARKETS', { exchangeId }, signal);
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
