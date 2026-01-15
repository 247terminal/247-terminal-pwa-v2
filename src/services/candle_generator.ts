import { effect } from '@preact/signals';
import type { ExchangeId } from '../types/exchange.types';
import type { SubMinuteTimeframe } from '../types/candle.types';
import { get_timeframe_seconds } from '../types/candle.types';
import { get_ticker_signal } from '../stores/exchange_store';
import type { OHLCV } from './exchange/chart_data';

interface GeneratorState {
    current_candle: OHLCV | null;
    pending_update: boolean;
    raf_id: number | null;
    dispose: (() => void) | null;
}

const generators = new Map<string, GeneratorState>();

function get_generator_key(exchange: ExchangeId, symbol: string, tf: SubMinuteTimeframe): string {
    return `${exchange}:${symbol}:${tf}`;
}

function get_candle_time(timestamp_ms: number, seconds: number): number {
    const timestamp_s = Math.floor(timestamp_ms / 1000);
    return Math.floor(timestamp_s / seconds) * seconds;
}

function fill_gap_candles(
    last_time: number,
    new_time: number,
    seconds: number,
    last_close: number,
    on_candle: (candle: OHLCV) => void
): void {
    let gap_time = last_time + seconds;
    while (gap_time < new_time) {
        on_candle({
            time: gap_time,
            open: last_close,
            high: last_close,
            low: last_close,
            close: last_close,
            volume: 0,
        });
        gap_time += seconds;
    }
}

export function start_candle_generation(
    exchange: ExchangeId,
    symbol: string,
    timeframe: SubMinuteTimeframe,
    on_candle: (candle: OHLCV) => void,
    last_historical_candle?: OHLCV
): () => void {
    const key = get_generator_key(exchange, symbol, timeframe);
    const existing = generators.get(key);
    if (existing?.dispose) {
        existing.dispose();
    }

    const seconds = get_timeframe_seconds(timeframe);
    const ticker_signal = get_ticker_signal(exchange, symbol);

    const state: GeneratorState = {
        current_candle: null,
        pending_update: false,
        raf_id: null,
        dispose: null,
    };

    const flush_update = () => {
        state.raf_id = null;
        if (state.pending_update && state.current_candle) {
            state.pending_update = false;
            on_candle(state.current_candle);
        }
    };

    const schedule_update = () => {
        state.pending_update = true;
        if (!state.raf_id) {
            state.raf_id = requestAnimationFrame(flush_update);
        }
    };

    const dispose = effect(() => {
        const ticker = ticker_signal.value;
        if (!ticker || ticker.last_price === 0) return;

        const price = ticker.last_price;
        const now = Date.now();
        const candle_time = get_candle_time(now, seconds);

        if (!state.current_candle) {
            const open_price = last_historical_candle?.close ?? price;
            state.current_candle = {
                time: candle_time,
                open: open_price,
                high: Math.max(open_price, price),
                low: Math.min(open_price, price),
                close: price,
                volume: 0,
            };
            on_candle(state.current_candle);
        } else if (state.current_candle.time < candle_time) {
            const prev_close = state.current_candle.close;
            fill_gap_candles(
                state.current_candle.time,
                candle_time,
                seconds,
                prev_close,
                on_candle
            );
            state.current_candle = {
                time: candle_time,
                open: prev_close,
                high: Math.max(prev_close, price),
                low: Math.min(prev_close, price),
                close: price,
                volume: 0,
            };
            on_candle(state.current_candle);
        } else if (state.current_candle.time === candle_time) {
            state.current_candle.high = Math.max(state.current_candle.high, price);
            state.current_candle.low = Math.min(state.current_candle.low, price);
            state.current_candle.close = price;
            schedule_update();
        }
    });

    state.dispose = dispose;
    generators.set(key, state);

    return () => {
        dispose();
        if (state.raf_id) {
            cancelAnimationFrame(state.raf_id);
        }
        generators.delete(key);
    };
}

export function stop_all_candle_generators(): void {
    for (const state of generators.values()) {
        state.dispose?.();
        if (state.raf_id) {
            cancelAnimationFrame(state.raf_id);
        }
    }
    generators.clear();
}
