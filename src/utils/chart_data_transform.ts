import type { CandlestickData, HistogramData, Time } from 'lightweight-charts';
import type { OHLCV } from '../types/chart.types';

export function ohlcv_to_candle(ohlcv: OHLCV): CandlestickData<Time> {
    return {
        time: ohlcv.time as Time,
        open: ohlcv.open,
        high: ohlcv.high,
        low: ohlcv.low,
        close: ohlcv.close,
    };
}

export function ohlcv_to_volume(
    ohlcv: OHLCV,
    up_color: string,
    down_color: string
): HistogramData<Time> {
    const is_up = ohlcv.close >= ohlcv.open;
    return {
        time: ohlcv.time as Time,
        value: ohlcv.volume,
        color: is_up ? up_color : down_color,
    };
}
