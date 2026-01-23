import { useEffect, useRef } from 'preact/hooks';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { PixelPoint, ChartPoint, DrawingOverlayProps } from '../../types/drawing.types';
import { chart_to_pixel } from '../../services/chart/drawing_manager';
import { DRAWING_CONSTANTS } from '../../config/drawing.constants';
import {
    draw_horizontal_line,
    draw_trend_line,
    draw_rectangle,
    draw_brush,
    draw_measure,
    draw_measure_tooltip,
} from '../../services/chart/drawing_renderers';

function lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
}

function get_pixels(
    points: ChartPoint[],
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    tf: number
): PixelPoint[] {
    const result: PixelPoint[] = [];
    const len = points.length;
    for (let i = 0; i < len; i++) {
        const px = chart_to_pixel(chart, series, points[i], tf);
        if (px) result.push(px);
    }
    return result;
}

function smooth_pixels(
    current: PixelPoint[],
    target: PixelPoint[],
    factor: number
): { pixels: PixelPoint[]; needs_animation: boolean } {
    const result: PixelPoint[] = [];
    let needs_animation = false;
    const len = target.length;

    for (let i = 0; i < len; i++) {
        const t = target[i];
        const c = current[i];

        if (!c) {
            result.push({ x: t.x, y: t.y });
            continue;
        }

        const dx = Math.abs(t.x - c.x);
        const dy = Math.abs(t.y - c.y);

        if (
            dx < DRAWING_CONSTANTS.SMOOTHING.THRESHOLD &&
            dy < DRAWING_CONSTANTS.SMOOTHING.THRESHOLD
        ) {
            result.push({ x: t.x, y: t.y });
        } else {
            needs_animation = true;
            result.push({
                x: lerp(c.x, t.x, factor),
                y: lerp(c.y, t.y, factor),
            });
        }
    }

    return { pixels: result, needs_animation };
}

export function DrawingOverlay({
    chart,
    series,
    drawings,
    active_drawing,
    selected_id,
    timeframe_seconds,
    measure_result,
    measure_points,
    tick_size,
}: DrawingOverlayProps) {
    const canvas_ref = useRef<HTMLCanvasElement>(null);
    const raf_ref = useRef<number | null>(null);
    const render_ref = useRef<(() => void) | null>(null);
    const drawings_ref = useRef(drawings);
    const active_ref = useRef(active_drawing);
    const selected_ref = useRef(selected_id);
    const measure_result_ref = useRef(measure_result);
    const measure_points_ref = useRef(measure_points);
    const tick_size_ref = useRef(tick_size);
    const smoothed_pixels_ref = useRef<Map<string, PixelPoint[]>>(new Map());
    const prev_drawing_count_ref = useRef(0);

    drawings_ref.current = drawings;
    active_ref.current = active_drawing;
    selected_ref.current = selected_id;
    measure_result_ref.current = measure_result;
    measure_points_ref.current = measure_points;
    tick_size_ref.current = tick_size;

    useEffect(() => {
        if (!chart || !series || !canvas_ref.current) return;

        const canvas = canvas_ref.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let is_dragging = false;

        const render = () => {
            render_ref.current = render;
            const el = chart.chartElement();
            const dpr = window.devicePixelRatio || 1;
            const w = el.clientWidth;
            const h = el.clientHeight;

            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                canvas.style.width = w + 'px';
                canvas.style.height = h + 'px';
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            const width = chart.timeScale().width();
            const is_dark = document.documentElement.getAttribute('data-theme') === 'terminal-dark';

            let needs_animation = false;
            const current_drawings = drawings_ref.current;
            const len = current_drawings.length;
            for (let i = 0; i < len; i++) {
                const drawing = current_drawings[i];
                const target_pixels = get_pixels(drawing.points, chart, series, timeframe_seconds);
                const current_pixels = smoothed_pixels_ref.current.get(drawing.id) || [];
                const smoothed = smooth_pixels(
                    current_pixels,
                    target_pixels,
                    DRAWING_CONSTANTS.SMOOTHING.FACTOR
                );
                smoothed_pixels_ref.current.set(drawing.id, smoothed.pixels);
                if (smoothed.needs_animation) needs_animation = true;
                const is_selected = drawing.id === selected_ref.current;

                switch (drawing.type) {
                    case 'horizontal_line':
                        draw_horizontal_line(
                            ctx,
                            smoothed.pixels,
                            drawing.color,
                            is_selected,
                            width,
                            is_dark
                        );
                        break;
                    case 'trend_line':
                        draw_trend_line(ctx, smoothed.pixels, drawing.color, is_selected, is_dark);
                        break;
                    case 'rectangle':
                        draw_rectangle(ctx, smoothed.pixels, drawing.color, is_selected, is_dark);
                        break;
                    case 'brush':
                        draw_brush(ctx, smoothed.pixels, drawing.color, is_selected, is_dark);
                        break;
                    case 'measure':
                        draw_measure(ctx, smoothed.pixels);
                        break;
                }
            }

            const active = active_ref.current;
            if (active?.points?.length) {
                const active_id = '__active__';
                const target_pixels = get_pixels(
                    active.points as ChartPoint[],
                    chart,
                    series,
                    timeframe_seconds
                );
                const current_pixels = smoothed_pixels_ref.current.get(active_id) || [];
                const smoothed = smooth_pixels(
                    current_pixels,
                    target_pixels,
                    DRAWING_CONSTANTS.SMOOTHING.FACTOR
                );
                smoothed_pixels_ref.current.set(active_id, smoothed.pixels);
                if (smoothed.needs_animation) needs_animation = true;
                const color = active.color || DRAWING_CONSTANTS.DEFAULT_COLOR;

                switch (active.type) {
                    case 'horizontal_line':
                        draw_horizontal_line(ctx, smoothed.pixels, color, false, width, is_dark);
                        break;
                    case 'trend_line':
                        draw_trend_line(ctx, smoothed.pixels, color, false, is_dark);
                        break;
                    case 'rectangle':
                        draw_rectangle(ctx, smoothed.pixels, color, false, is_dark);
                        break;
                    case 'brush':
                        draw_brush(ctx, smoothed.pixels, color, false, is_dark);
                        break;
                    case 'measure':
                        draw_measure(ctx, smoothed.pixels);
                        break;
                }
            }

            if (needs_animation) {
                schedule_render();
            }

            if (len !== prev_drawing_count_ref.current) {
                prev_drawing_count_ref.current = len;
                const valid_ids = new Set(current_drawings.map((d) => d.id));
                valid_ids.add('__active__');
                smoothed_pixels_ref.current.forEach((_, id) => {
                    if (!valid_ids.has(id)) smoothed_pixels_ref.current.delete(id);
                });
            }

            const mr = measure_result_ref.current;
            const mp = measure_points_ref.current;
            if (mr && mp) {
                const tooltip_pixels = get_pixels(mp, chart, series, timeframe_seconds);
                draw_measure_tooltip(ctx, tooltip_pixels, mr, tick_size_ref.current, w, h, is_dark);
            }
        };

        const schedule_render = () => {
            if (raf_ref.current === null) {
                raf_ref.current = requestAnimationFrame(() => {
                    raf_ref.current = null;
                    render();
                });
            }
        };

        const on_mousedown = () => {
            is_dragging = true;
            window.addEventListener('mousemove', on_mousemove);
        };
        const on_mouseup = () => {
            is_dragging = false;
            window.removeEventListener('mousemove', on_mousemove);
            schedule_render();
        };
        const on_mousemove = () => {
            if (is_dragging) schedule_render();
        };

        render();
        const chart_el = chart.chartElement();
        const container = chart_el.parentElement;
        const unsub1 = chart
            .timeScale()
            .subscribeVisibleLogicalRangeChange(schedule_render) as unknown as
            | (() => void)
            | undefined;
        const unsub2 = chart.timeScale().subscribeSizeChange(schedule_render) as unknown as
            | (() => void)
            | undefined;
        container?.addEventListener('mousedown', on_mousedown);
        window.addEventListener('mouseup', on_mouseup);
        window.addEventListener('resize', schedule_render);

        return () => {
            render_ref.current = null;
            unsub1?.();
            unsub2?.();
            container?.removeEventListener('mousedown', on_mousedown);
            window.removeEventListener('mouseup', on_mouseup);
            window.removeEventListener('mousemove', on_mousemove);
            window.removeEventListener('resize', schedule_render);
            if (raf_ref.current !== null) cancelAnimationFrame(raf_ref.current);
        };
    }, [chart, series, timeframe_seconds]);

    useEffect(() => {
        if (render_ref.current && raf_ref.current === null) {
            raf_ref.current = requestAnimationFrame(() => {
                raf_ref.current = null;
                render_ref.current?.();
            });
        }
    }, [drawings, active_drawing, selected_id, measure_result, measure_points]);

    if (!chart || !series) return null;

    return <canvas ref={canvas_ref} class="absolute inset-0 pointer-events-none z-10" />;
}
