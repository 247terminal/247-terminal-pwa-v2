import type { SeriesMarker, Time } from 'lightweight-charts';
import type { RawFill } from '@/types/worker.types';
import type { TradeMarkerConfig, TradeMarkerType } from '@/types/trade_marker.types';

export interface TradeMarkerColors {
    up: string;
    down: string;
}

function fill_to_marker_config(fill: RawFill): TradeMarkerConfig {
    const is_buy = fill.side === 'buy';
    const is_close = fill.direction === 'close';

    let type: TradeMarkerType;
    if (is_buy && !is_close) {
        type = 'open_long';
    } else if (!is_buy && is_close) {
        type = 'close_long';
    } else if (!is_buy && !is_close) {
        type = 'open_short';
    } else {
        type = 'close_short';
    }

    return {
        id: fill.id,
        type,
        time: fill.time,
        price: fill.price,
    };
}

function align_time_to_candle(time_ms: number, timeframe_seconds: number): number {
    const time_seconds = Math.floor(time_ms / 1000);
    return Math.floor(time_seconds / timeframe_seconds) * timeframe_seconds;
}

function create_series_marker(
    config: TradeMarkerConfig,
    colors: TradeMarkerColors,
    timeframe_seconds: number
): SeriesMarker<Time> {
    const is_buy = config.type === 'open_long' || config.type === 'close_short';
    const color = is_buy ? colors.up : colors.down;
    const shape: 'arrowUp' | 'arrowDown' = is_buy ? 'arrowUp' : 'arrowDown';
    const position: 'belowBar' | 'aboveBar' = is_buy ? 'belowBar' : 'aboveBar';
    const candle_time = align_time_to_candle(config.time, timeframe_seconds);

    return {
        time: candle_time as Time,
        position,
        color,
        shape,
        size: 1,
    };
}

function dedupe_fills_by_order(fills: RawFill[]): RawFill[] {
    const seen = new Set<string>();
    const result: RawFill[] = [];
    for (const fill of fills) {
        if (!seen.has(fill.order_id)) {
            seen.add(fill.order_id);
            result.push(fill);
        }
    }
    return result;
}

export function fills_to_markers(
    fills: RawFill[],
    colors: TradeMarkerColors,
    timeframe_seconds: number
): SeriesMarker<Time>[] {
    const unique_fills = dedupe_fills_by_order(fills);
    const markers: SeriesMarker<Time>[] = new Array(unique_fills.length);
    for (let i = 0; i < unique_fills.length; i++) {
        const config = fill_to_marker_config(unique_fills[i]);
        markers[i] = create_series_marker(config, colors, timeframe_seconds);
    }
    return markers.sort((a, b) => (a.time as number) - (b.time as number));
}
