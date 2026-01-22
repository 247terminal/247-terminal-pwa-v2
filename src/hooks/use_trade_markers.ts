import { useRef, useLayoutEffect } from 'preact/hooks';
import {
    createSeriesMarkers,
    type ISeriesApi,
    type SeriesMarker,
    type Time,
} from 'lightweight-charts';
import type { RawFill } from '@/types/worker.types';
import { fills_to_markers, type TradeMarkerColors } from '@/utils/trade_marker';

interface UseTradeMarkersParams {
    series: ISeriesApi<'Candlestick'> | null;
    fills: RawFill[];
    data_key?: string;
    colors: TradeMarkerColors;
    first_candle_time?: number | null;
    timeframe_seconds: number;
}

interface SeriesMarkersPlugin {
    setMarkers(markers: SeriesMarker<Time>[]): void;
}

export function use_trade_markers({
    series,
    fills,
    data_key,
    colors,
    first_candle_time,
    timeframe_seconds,
}: UseTradeMarkersParams): void {
    const pluginRef = useRef<SeriesMarkersPlugin | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const dataKeyRef = useRef<string | undefined>(undefined);

    useLayoutEffect(() => {
        if (dataKeyRef.current !== data_key) {
            if (pluginRef.current) {
                pluginRef.current.setMarkers([]);
            }
            dataKeyRef.current = data_key;
        }

        if (seriesRef.current !== series) {
            pluginRef.current = null;
            seriesRef.current = series;
        }

        if (!series) {
            return;
        }

        if (!pluginRef.current) {
            pluginRef.current = createSeriesMarkers(series, []) as SeriesMarkersPlugin;
        }

        let markers: SeriesMarker<Time>[] = [];

        if (fills.length > 0) {
            markers = fills_to_markers(fills, colors, timeframe_seconds);

            if (first_candle_time != null) {
                markers = markers.filter((m) => (m.time as number) > first_candle_time);
            }
        }

        pluginRef.current.setMarkers(markers);
    }, [series, fills, data_key, colors, first_candle_time, timeframe_seconds]);

    useLayoutEffect(() => {
        return () => {
            if (pluginRef.current) {
                pluginRef.current.setMarkers([]);
            }
        };
    }, []);
}
