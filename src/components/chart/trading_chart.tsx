import { useRef, useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    ColorType,
    CrosshairMode,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type HistogramData,
    type Time,
} from 'lightweight-charts';
import type { OHLCV } from '../../services/exchange/chart_data';
import type { TradingChartProps, ToggleButtonProps } from '../../types/chart.types';
import { tick_size_to_precision } from '../../utils/format';
import { get_timeframe_seconds } from '../../services/chart/drawing_manager';
import { use_chart_drawing } from '../../hooks/use_chart_drawing';
import { DrawingToolbar } from './drawing_toolbar';
import { DrawingOverlay } from './drawing_overlay';
import { ErrorBoundary } from '../common/error_boundary';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-preact';
import { CHART_CONSTANTS } from '../../config/chart.constants';

let theme_colors_cache: ReturnType<typeof get_theme_colors> | null = null;
let theme_cache_key: string | null = null;

function get_css_variable(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function get_theme_colors(force_refresh = false) {
    const current_theme = document.documentElement.getAttribute('data-theme');

    if (!force_refresh && theme_colors_cache && theme_cache_key === current_theme) {
        return theme_colors_cache;
    }

    const is_dark = current_theme === 'terminal-dark';
    const base_content = get_css_variable('--color-base-content');
    const base_300 = get_css_variable('--color-base-300');
    const success = get_css_variable('--color-success');
    const error = get_css_variable('--color-error');

    theme_colors_cache = {
        background: is_dark ? '#000000' : '#ffffff',
        text: base_content || '#fafafa',
        grid: base_300
            ? `color-mix(in oklch, ${base_300}, transparent 50%)`
            : 'rgba(40, 41, 45, 0.5)',
        up: success || 'rgb(0, 200, 114)',
        down: error || 'rgb(255, 107, 59)',
    };
    theme_cache_key = current_theme;

    return theme_colors_cache;
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

function ohlcv_to_volume(ohlcv: OHLCV, up_color: string, down_color: string): HistogramData<Time> {
    const is_up = ohlcv.close >= ohlcv.open;
    return {
        time: ohlcv.time as Time,
        value: ohlcv.volume,
        color: is_up ? up_color : down_color,
    };
}

const ToggleButton = memo(function ToggleButton({
    label,
    visible,
    on_toggle,
    with_background = true,
}: ToggleButtonProps) {
    return (
        <button
            type="button"
            onClick={on_toggle}
            class={`flex items-center gap-1.5 px-2 py-1 text-xs rounded text-base-content transition-colors font-medium ${
                with_background ? 'bg-base-200 hover:bg-base-300' : 'hover:bg-base-300'
            } ${!visible && 'opacity-50'}`}
            title={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
        >
            <span>{label}</span>
            {visible ? <Eye class="w-3.5 h-3.5" /> : <EyeOff class="w-3.5 h-3.5" />}
        </button>
    );
});

export function TradingChart({
    data,
    data_key,
    loading,
    tick_size = 0.01,
    timeframe = '1',
    volume_visible = true,
    grid_visible = true,
    on_volume_toggle,
    on_grid_toggle,
}: TradingChartProps) {
    const container_ref = useRef<HTMLDivElement>(null);
    const chart_ref = useRef<IChartApi | null>(null);
    const series_ref = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volume_series_ref = useRef<ISeriesApi<'Histogram'> | null>(null);
    const prev_data_key = useRef<string | undefined>(undefined);

    const [chart, set_chart] = useState<IChartApi | null>(null);
    const [series, set_series] = useState<ISeriesApi<'Candlestick'> | null>(null);
    const [is_compact, set_is_compact] = useState(false);
    const [menu_expanded, set_menu_expanded] = useState(false);
    const menu_ref = useRef<HTMLDivElement>(null);

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
                rightOffset: CHART_CONSTANTS.RIGHT_OFFSET,
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

        const volume_series = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            lastValueVisible: false,
            priceLineVisible: false,
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
            borderVisible: false,
            visible: false,
        });

        const apply_theme = () => {
            const c = get_theme_colors(true);
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
        volume_series_ref.current = volume_series;
        set_chart(chart);
        set_series(candle_series);

        let resize_timeout: ReturnType<typeof setTimeout> | null = null;
        const handle_resize = () => {
            if (resize_timeout) clearTimeout(resize_timeout);
            resize_timeout = setTimeout(() => {
                if (container_ref.current && chart_ref.current) {
                    const height = container_ref.current.clientHeight;
                    chart_ref.current.applyOptions({
                        width: container_ref.current.clientWidth,
                        height: height,
                    });
                    set_is_compact(height < CHART_CONSTANTS.COMPACT_HEIGHT_THRESHOLD);
                }
            }, CHART_CONSTANTS.RESIZE_DEBOUNCE_MS);
        };

        const resize_observer = new ResizeObserver(handle_resize);
        resize_observer.observe(container_ref.current);
        handle_resize();

        return () => {
            if (resize_timeout) clearTimeout(resize_timeout);
            observer.disconnect();
            resize_observer.disconnect();
            chart.remove();
            chart_ref.current = null;
            series_ref.current = null;
            volume_series_ref.current = null;
            set_chart(null);
            set_series(null);
        };
    }, []);

    const { candles, volumes } = useMemo(() => {
        if (data.length === 0) return { candles: [], volumes: [] };
        const colors = get_theme_colors();
        return {
            candles: data.map(ohlcv_to_candle),
            volumes: data.map((d) => ohlcv_to_volume(d, colors.up + '55', colors.down + '55')),
        };
    }, [data]);

    useEffect(() => {
        if (!series_ref.current || !chart_ref.current || !volume_series_ref.current) return;

        if (candles.length === 0) {
            prev_data_key.current = undefined;
            return;
        }

        if (loading) return;

        const precision = tick_size_to_precision(tick_size);
        series_ref.current.applyOptions({
            priceFormat: { type: 'price', precision, minMove: tick_size },
        });

        series_ref.current.setData(candles);
        volume_series_ref.current.setData(volumes);

        const is_new_data = prev_data_key.current !== data_key;

        if (is_new_data) {
            chart_ref.current.priceScale('right').applyOptions({ autoScale: true });
            const from = Math.max(0, candles.length - CHART_CONSTANTS.VISIBLE_CANDLES);
            const to = candles.length - 1 + CHART_CONSTANTS.RIGHT_OFFSET;
            chart_ref.current.timeScale().setVisibleLogicalRange({ from, to });
        }

        prev_data_key.current = data_key;
    }, [candles, volumes, data_key, tick_size, loading]);

    useEffect(() => {
        if (!volume_series_ref.current) return;
        volume_series_ref.current.applyOptions({ visible: volume_visible });
    }, [volume_visible]);

    useEffect(() => {
        if (!chart_ref.current) return;
        const colors = get_theme_colors();
        chart_ref.current.applyOptions({
            grid: {
                vertLines: { visible: grid_visible, color: colors.grid },
                horzLines: { visible: grid_visible, color: colors.grid },
            },
        });
    }, [grid_visible]);

    useEffect(() => {
        if (!menu_expanded) return;
        const handle_click_outside = (e: MouseEvent) => {
            if (menu_ref.current && !menu_ref.current.contains(e.target as Node)) {
                set_menu_expanded(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, [menu_expanded]);

    const toggle_volume = useCallback(() => {
        on_volume_toggle?.(!volume_visible);
    }, [on_volume_toggle, volume_visible]);

    const toggle_grid = useCallback(() => {
        on_grid_toggle?.(!grid_visible);
    }, [on_grid_toggle, grid_visible]);

    const toggle_menu = useCallback(() => {
        set_menu_expanded((prev) => !prev);
    }, []);

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
                <div class={`absolute top-3 z-30 ${is_compact ? 'left-14' : 'left-3'}`}>
                    {is_compact ? (
                        <div ref={menu_ref} class="relative">
                            <button
                                type="button"
                                onClick={toggle_menu}
                                class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors font-medium"
                                title="Chart options"
                                aria-expanded={menu_expanded}
                                aria-haspopup="menu"
                            >
                                <span>Options</span>
                                {menu_expanded ? (
                                    <ChevronUp class="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronDown class="w-3.5 h-3.5" />
                                )}
                            </button>
                            {menu_expanded && (
                                <div
                                    class="absolute top-full left-0 mt-1 flex flex-col gap-1 bg-base-200 rounded p-1 shadow-lg"
                                    role="menu"
                                >
                                    <ToggleButton
                                        label="Vol"
                                        visible={volume_visible}
                                        on_toggle={toggle_volume}
                                        with_background={false}
                                    />
                                    <ToggleButton
                                        label="Grid"
                                        visible={grid_visible}
                                        on_toggle={toggle_grid}
                                        with_background={false}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div class="flex flex-col gap-1">
                            <ToggleButton
                                label="Vol"
                                visible={volume_visible}
                                on_toggle={toggle_volume}
                            />
                            <ToggleButton
                                label="Grid"
                                visible={grid_visible}
                                on_toggle={toggle_grid}
                            />
                        </div>
                    )}
                </div>
                {show_spinner && (
                    <div class="absolute inset-0 flex items-center justify-center bg-base-100">
                        <div class="w-8 h-8 border-2 border-base-content/20 border-t-primary rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
