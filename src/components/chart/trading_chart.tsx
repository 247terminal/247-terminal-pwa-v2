import { useRef, useEffect, useState } from 'preact/hooks';
import {
    createChart,
    CandlestickSeries,
    ColorType,
    CrosshairMode,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type Time,
} from 'lightweight-charts';
import type { OHLCV } from '../../services/exchange/chart_data';
import { tick_size_to_precision } from '../../utils/format';
import { get_timeframe_seconds } from '../../services/chart/drawing_manager';
import { use_chart_drawing } from '../../hooks/use_chart_drawing';
import { DrawingToolbar } from './drawing_toolbar';
import { DrawingOverlay } from './drawing_overlay';
import { ErrorBoundary } from '../common/error_boundary';

const VISIBLE_CANDLES = 100;
const RIGHT_OFFSET = 20;

interface TradingChartProps {
    data: OHLCV[];
    data_key?: string;
    loading?: boolean;
    tick_size?: number;
    timeframe?: string;
}

function get_css_variable(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function get_theme_colors() {
    const is_dark = document.documentElement.getAttribute('data-theme') === 'terminal-dark';
    const base_content = get_css_variable('--color-base-content');
    const base_300 = get_css_variable('--color-base-300');
    const success = get_css_variable('--color-success');
    const error = get_css_variable('--color-error');

    return {
        background: is_dark ? '#000000' : '#ffffff',
        text: base_content || '#fafafa',
        grid: base_300
            ? `color-mix(in oklch, ${base_300}, transparent 50%)`
            : 'rgba(40, 41, 45, 0.5)',
        up: success || 'rgb(0, 200, 114)',
        down: error || 'rgb(255, 107, 59)',
    };
}

function ohlcv_to_candle(ohlcv: OHLCV): CandlestickData<Time> {
    return {
        time: ohlcv.time as Time,
        open: ohlcv.open,
        high: ohlcv.high,
        low: ohlcv.low,
        close: ohlcv.close,
    };
}

export function TradingChart({
    data,
    data_key,
    loading,
    tick_size = 0.01,
    timeframe = '1',
}: TradingChartProps) {
    const container_ref = useRef<HTMLDivElement>(null);
    const chart_ref = useRef<IChartApi | null>(null);
    const series_ref = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const prev_data_key = useRef<string | undefined>(undefined);

    const [chart, set_chart] = useState<IChartApi | null>(null);
    const [series, set_series] = useState<ISeriesApi<'Candlestick'> | null>(null);

    const first_candle_time = data.length > 0 ? data[0].time : null;

    const {
        tool,
        set_tool,
        drawings,
        active_drawing,
        selected_id,
        measure_result,
        measure_points,
        resizing,
        delete_selected,
        clear_drawings,
        change_selected_color,
        selected_drawing,
        show_overlay,
        handle_mouse_down,
        handle_chart_click,
        handle_mouse_move,
        handle_mouse_up,
    } = use_chart_drawing({
        chart_ref,
        series_ref,
        container_ref,
        timeframe,
        first_candle_time,
    });

    useEffect(() => {
        if (!container_ref.current) return;

        const colors = get_theme_colors();
        const chart = createChart(container_ref.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors.background },
                textColor: colors.text,
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: {
                borderColor: colors.grid,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: colors.grid,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: RIGHT_OFFSET,
            },
            handleScale: { axisPressedMouseMove: true },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
        });

        const candle_series = chart.addSeries(CandlestickSeries, {
            upColor: colors.up,
            downColor: colors.down,
            wickUpColor: colors.up,
            wickDownColor: colors.down,
            borderVisible: false,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        const apply_theme = () => {
            const c = get_theme_colors();
            chart.applyOptions({
                layout: {
                    background: { type: ColorType.Solid, color: c.background },
                    textColor: c.text,
                },
                grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
                rightPriceScale: { borderColor: c.grid },
                timeScale: { borderColor: c.grid },
            });
            candle_series.applyOptions({
                upColor: c.up,
                downColor: c.down,
                wickUpColor: c.up,
                wickDownColor: c.down,
            });
        };

        const observer = new MutationObserver(apply_theme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        chart_ref.current = chart;
        series_ref.current = candle_series;
        set_chart(chart);
        set_series(candle_series);

        const handle_resize = () => {
            if (container_ref.current && chart_ref.current) {
                chart_ref.current.applyOptions({
                    width: container_ref.current.clientWidth,
                    height: container_ref.current.clientHeight,
                });
            }
        };

        const resize_observer = new ResizeObserver(handle_resize);
        resize_observer.observe(container_ref.current);
        handle_resize();

        return () => {
            observer.disconnect();
            resize_observer.disconnect();
            chart.remove();
            chart_ref.current = null;
            series_ref.current = null;
            set_chart(null);
            set_series(null);
        };
    }, []);

    useEffect(() => {
        if (!series_ref.current || !chart_ref.current) return;

        if (data.length === 0) {
            prev_data_key.current = undefined;
            return;
        }

        if (loading) return;

        const precision = tick_size_to_precision(tick_size);
        series_ref.current.applyOptions({
            priceFormat: { type: 'price', precision, minMove: tick_size },
        });

        const candles = data.map(ohlcv_to_candle);
        series_ref.current.setData(candles);

        const is_new_data = prev_data_key.current !== data_key;

        if (is_new_data) {
            chart_ref.current.priceScale('right').applyOptions({ autoScale: true });
            const from = Math.max(0, data.length - VISIBLE_CANDLES);
            const to = data.length - 1 + RIGHT_OFFSET;
            chart_ref.current.timeScale().setVisibleLogicalRange({ from, to });
        }

        prev_data_key.current = data_key;
    }, [data, data_key, tick_size, loading]);

    const has_data = data.length > 0;
    const show_spinner = loading && !has_data;
    const show_dimmed = loading && has_data;

    return (
        <ErrorBoundary>
            <div class="absolute inset-0">
                <div
                    ref={container_ref}
                    class={`absolute inset-0 transition-opacity duration-200 ${
                        show_dimmed ? 'opacity-40' : has_data ? 'opacity-100' : 'opacity-0'
                    }`}
                    onMouseDown={handle_mouse_down}
                    onTouchStart={handle_mouse_down}
                    onClick={handle_chart_click}
                    onMouseMove={handle_mouse_move}
                    onTouchMove={handle_mouse_move}
                    onMouseUp={handle_mouse_up}
                    onTouchEnd={handle_mouse_up}
                />
                {show_overlay && (
                    <div
                        class="absolute inset-0 z-20"
                        style={{ cursor: resizing ? 'grabbing' : 'crosshair', touchAction: 'none' }}
                        onMouseDown={handle_mouse_down}
                        onTouchStart={handle_mouse_down}
                        onClick={handle_chart_click}
                        onMouseMove={handle_mouse_move}
                        onTouchMove={handle_mouse_move}
                        onMouseUp={handle_mouse_up}
                        onTouchEnd={handle_mouse_up}
                    />
                )}
                <DrawingOverlay
                    chart={chart}
                    series={series}
                    drawings={drawings}
                    active_drawing={active_drawing}
                    selected_id={selected_id}
                    timeframe_seconds={get_timeframe_seconds(timeframe)}
                    measure_result={measure_result}
                    measure_points={measure_points}
                    tick_size={tick_size}
                />
                <DrawingToolbar
                    active_tool={tool}
                    on_tool_change={set_tool}
                    on_delete_selected={delete_selected}
                    on_clear_all={clear_drawings}
                    selected_id={selected_id}
                    has_drawings={drawings.length > 0}
                    selected_color={selected_drawing?.color}
                    on_color_change={change_selected_color}
                />
                {show_spinner && (
                    <div class="absolute inset-0 flex items-center justify-center bg-base-100">
                        <div class="w-8 h-8 border-2 border-base-content/20 border-t-primary rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
