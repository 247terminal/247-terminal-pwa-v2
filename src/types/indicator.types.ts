import type { Time } from 'lightweight-charts';

export interface EmaPoint {
    time: Time;
    value: number;
}

export interface EmaState {
    multiplier: number;
    prev_ema: number | null;
}
