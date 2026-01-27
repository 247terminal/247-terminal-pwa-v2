import { useRef, useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    ColorType,
    CrosshairMode,
    type IChartApi,
    type ISeriesApi,
    type Time,
    type LineData,
    type LineWidth,
} from 'lightweight-charts';
import type { TradingChartProps, ToggleButtonProps } from '../../types/chart.types';
import type { Position } from '../../types/account.types';
import { tick_size_to_precision } from '../../utils/format';
import { get_timeframe_seconds } from '../../services/chart/drawing_manager';
import { use_chart_drawing } from '../../hooks/use_chart_drawing';
import { use_price_lines } from '../../hooks/use_price_lines';
import { use_trade_markers } from '../../hooks/use_trade_markers';
import { DrawingToolbar } from './drawing_toolbar';
import { DrawingOverlay } from './drawing_overlay';
import { PositionContextMenu } from './position_context_menu';
import { ErrorBoundary } from '../common/error_boundary';
import { LogoSpinner } from '../common/logo_spinner';
import { Eye, EyeOff, Settings } from 'lucide-preact';
import { EmaSettingsPanel } from './ema_settings_panel';
import { CHART_CONSTANTS, EMA_CONSTANTS } from '../../config/chart.constants';
import { get_theme_colors } from '../../utils/theme';
import { ohlcv_to_candle, ohlcv_to_volume } from '../../utils/chart_data_transform';
import { privacy_mode } from '../../stores/account_store';

const ToggleButton = memo(function ToggleButton({ label, visible, on_toggle }: ToggleButtonProps) {
    return (
        <button
            type="button"
            onClick={on_toggle}
            class={`flex items-center justify-between w-16 px-2 py-1 text-xs rounded text-base-content transition-all font-medium bg-base-200/50 group-hover/toggles:bg-base-200 hover:!bg-base-300 ${!visible ? 'opacity-50' : ''}`}
            title={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
        >
            <span>{label}</span>
            <span class="opacity-0 group-hover/toggles:opacity-100 transition-opacity ml-2">
                {visible ? <Eye class="w-3.5 h-3.5" /> : <EyeOff class="w-3.5 h-3.5" />}
            </span>
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
    ema_data = [],
    ema_visible = false,
    ema_settings,
    on_ema_toggle,
    on_ema_settings_change,
    positions = [],
    orders = [],
    current_price = null,
    fills = [],
}: TradingChartProps) {
    const container_ref = useRef<HTMLDivElement>(null);
    const chart_ref = useRef<IChartApi | null>(null);
    const series_ref = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volume_series_ref = useRef<ISeriesApi<'Histogram'> | null>(null);
    const ema_series_ref = useRef<ISeriesApi<'Line'> | null>(null);
    const prev_data_key = useRef<string | undefined>(undefined);

    const [chart, set_chart] = useState<IChartApi | null>(null);
    const [series, set_series] = useState<ISeriesApi<'Candlestick'> | null>(null);
    const [ema_settings_open, set_ema_settings_open] = useState(false);
    const [theme_version, set_theme_version] = useState(0);
    const ema_settings_ref = useRef<HTMLDivElement>(null);
    const [context_menu, set_context_menu] = useState<{
        position: Position;
        x: number;
        y: number;
    } | null>(null);

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
        handle_wheel,
    } = use_chart_drawing({
        chart_ref,
        series_ref,
        container_ref,
        timeframe,
        first_candle_time,
    });

    const price_line_colors = useMemo(() => {
        const theme = get_theme_colors();
        return { up: theme.up, down: theme.down };
    }, [theme_version]);

    use_price_lines({
        series,
        positions,
        orders,
        current_price,
        data_key,
        colors: price_line_colors,
        is_private: privacy_mode.value,
    });

    use_trade_markers({
        series,
        fills,
        data_key,
        colors: price_line_colors,
        first_candle_time,
        timeframe_seconds: get_timeframe_seconds(timeframe),
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

        const ema_series = chart.addSeries(LineSeries, {
            color: EMA_CONSTANTS.COLOR,
            lineWidth: EMA_CONSTANTS.LINE_WIDTH,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
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
            set_theme_version((v) => v + 1);
        };

        const observer = new MutationObserver(apply_theme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        chart_ref.current = chart;
        series_ref.current = candle_series;
        volume_series_ref.current = volume_series;
        ema_series_ref.current = ema_series;
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
            ema_series_ref.current = null;
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
        if (!ema_series_ref.current) return;
        ema_series_ref.current.setData(ema_data as LineData<Time>[]);
    }, [ema_data]);

    useEffect(() => {
        if (!ema_series_ref.current) return;
        ema_series_ref.current.applyOptions({ visible: ema_visible });
    }, [ema_visible]);

    useEffect(() => {
        if (!ema_series_ref.current || !ema_settings) return;
        ema_series_ref.current.applyOptions({
            color: ema_settings.color,
            lineWidth: ema_settings.line_width as LineWidth,
        });
    }, [ema_settings?.color, ema_settings?.line_width]);

    useEffect(() => {
        if (!ema_settings_open) return;
        const handle_click_outside = (e: MouseEvent) => {
            if (ema_settings_ref.current && !ema_settings_ref.current.contains(e.target as Node)) {
                set_ema_settings_open(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, [ema_settings_open]);

    const toggle_volume = useCallback(() => {
        on_volume_toggle?.();
    }, [on_volume_toggle]);

    const toggle_grid = useCallback(() => {
        on_grid_toggle?.();
    }, [on_grid_toggle]);

    const toggle_ema = useCallback(() => {
        on_ema_toggle?.();
    }, [on_ema_toggle]);

    const toggle_ema_settings = useCallback(() => {
        set_ema_settings_open((prev) => !prev);
    }, []);

    const handle_context_menu = useCallback(
        (e: MouseEvent) => {
            e.preventDefault();

            if (positions.length === 0) return;

            set_context_menu({ position: positions[0], x: e.clientX, y: e.clientY });
        },
        [positions]
    );

    const close_context_menu = useCallback(() => {
        set_context_menu(null);
    }, []);

    const handle_ema_color_change = useCallback(
        (color: string) => {
            on_ema_settings_change?.({ color });
        },
        [on_ema_settings_change]
    );

    const handle_ema_period_change = useCallback(
        (e: Event) => {
            const value = parseInt((e.target as HTMLInputElement).value, 10);
            if (value > 0 && value <= EMA_CONSTANTS.MAX_PERIOD) {
                on_ema_settings_change?.({ period: value });
            }
        },
        [on_ema_settings_change]
    );

    const handle_ema_line_width_change = useCallback(
        (width: number) => {
            on_ema_settings_change?.({ line_width: width });
        },
        [on_ema_settings_change]
    );

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
                    onWheel={handle_wheel}
                    onContextMenu={handle_context_menu}
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
                        onWheel={handle_wheel}
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
                <div class="absolute top-3 left-3 z-30">
                    <div class="flex flex-col gap-1 group/toggles w-10 hover:w-24 overflow-hidden rounded-lg transition-all duration-200">
                        <ToggleButton
                            label="Vol"
                            visible={volume_visible}
                            on_toggle={toggle_volume}
                        />
                        <ToggleButton label="Grid" visible={grid_visible} on_toggle={toggle_grid} />
                        <div class="flex items-center gap-0.5">
                            <ToggleButton
                                label="EMA"
                                visible={ema_visible}
                                on_toggle={toggle_ema}
                            />
                            <button
                                type="button"
                                onClick={toggle_ema_settings}
                                class={`p-1 rounded transition-all items-center justify-center shrink-0 ${
                                    ema_settings_open
                                        ? 'flex bg-primary/20 text-primary'
                                        : 'hidden group-hover/toggles:flex bg-base-200/50 group-hover/toggles:bg-base-200 hover:!bg-base-300 text-base-content'
                                }`}
                                title="EMA Settings"
                            >
                                <Settings class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    {ema_settings_open && ema_settings && (
                        <EmaSettingsPanel
                            ref_={ema_settings_ref}
                            settings={ema_settings}
                            on_period_change={handle_ema_period_change}
                            on_line_width_change={handle_ema_line_width_change}
                            on_color_change={handle_ema_color_change}
                        />
                    )}
                </div>
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
                        <LogoSpinner size={48} />
                    </div>
                )}
                {context_menu && (
                    <PositionContextMenu
                        position={context_menu.position}
                        orders={orders}
                        x={context_menu.x}
                        y={context_menu.y}
                        on_close={close_context_menu}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}
