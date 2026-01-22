import type { Time } from 'lightweight-charts';
import type { OHLCV } from '../types/chart.types';
import type { EmaPoint, EmaState } from '../types/indicator.types';

export function calculate_ema_multiplier(period: number): number {
    return 2 / (period + 1);
}

export function calculate_ema_from_ohlcv(
    data: OHLCV[],
    period: number
): { points: EmaPoint[]; state: EmaState } {
    const multiplier = calculate_ema_multiplier(period);
    const points: EmaPoint[] = [];

    if (data.length < period) {
        return { points, state: { multiplier, prev_ema: null } };
    }

    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }
    let ema = sum / period;

    points.push({ time: data[period - 1].time as Time, value: ema });

    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
        points.push({ time: data[i].time as Time, value: ema });
    }

    return { points, state: { multiplier, prev_ema: ema } };
}

export function update_ema_point(close: number, time: Time, state: EmaState): EmaPoint | null {
    if (state.prev_ema === null) return null;
    const value = (close - state.prev_ema) * state.multiplier + state.prev_ema;
    return { time, value };
}

export function finalize_ema_state(close: number, state: EmaState): EmaState {
    if (state.prev_ema === null) return state;
    const new_ema = (close - state.prev_ema) * state.multiplier + state.prev_ema;
    return { ...state, prev_ema: new_ema };
}
