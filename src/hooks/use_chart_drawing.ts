import { useState, useCallback, useEffect } from 'preact/hooks';
import type {
    Drawing,
    DrawingTool,
    ChartPoint,
    MeasureResult,
    ActiveDrawing,
    HandleInfo,
    UseChartDrawingProps,
} from '../types/drawing.types';
import {
    generate_drawing_id,
    get_default_color,
    pixel_to_chart,
    chart_to_pixel,
    calculate_measure,
    find_drawing_at_point,
    find_handle_at_point,
    get_timeframe_seconds,
} from '../services/chart/drawing_manager';
import { DRAWING_CONSTANTS } from '../config/drawing.constants';

export function use_chart_drawing({
    chart_ref,
    series_ref,
    container_ref,
    timeframe,
    first_candle_time,
}: UseChartDrawingProps) {
    const [tool, set_tool] = useState<DrawingTool>('select');
    const [drawings, set_drawings] = useState<Drawing[]>([]);
    const [active_drawing, set_active_drawing] = useState<ActiveDrawing | null>(null);
    const [selected_id, set_selected_id] = useState<string | null>(null);
    const [measure_result, set_measure_result] = useState<MeasureResult | null>(null);
    const [measure_points, set_measure_points] = useState<[ChartPoint, ChartPoint] | null>(null);
    const [completed_measure_id, set_completed_measure_id] = useState<string | null>(null);
    const [resizing, set_resizing] = useState<HandleInfo | null>(null);

    const clear_drawings = useCallback(() => {
        set_drawings([]);
        set_active_drawing(null);
        set_selected_id(null);
        set_measure_result(null);
        set_measure_points(null);
        set_completed_measure_id(null);
    }, []);

    const delete_selected = useCallback(() => {
        if (!selected_id) return;
        set_drawings((prev) => prev.filter((d) => d.id !== selected_id));
        if (selected_id === completed_measure_id) {
            set_measure_result(null);
            set_measure_points(null);
            set_completed_measure_id(null);
        }
        set_selected_id(null);
    }, [selected_id, completed_measure_id]);

    const change_selected_color = useCallback(
        (color: string) => {
            if (!selected_id) return;
            set_drawings((prev) => prev.map((d) => (d.id === selected_id ? { ...d, color } : d)));
        },
        [selected_id]
    );

    useEffect(() => {
        clear_drawings();
    }, [first_candle_time, timeframe]);

    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                set_tool('select');
                set_active_drawing(null);
                set_resizing(null);
                if (completed_measure_id) {
                    set_drawings((prev) => prev.filter((d) => d.id !== completed_measure_id));
                    set_completed_measure_id(null);
                }
                set_measure_result(null);
                set_measure_points(null);
                set_selected_id(null);
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selected_id) {
                set_drawings((prev) => prev.filter((d) => d.id !== selected_id));
                set_selected_id(null);
            }
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, [selected_id, completed_measure_id]);

    useEffect(() => {
        if (!chart_ref.current) return;
        const is_drawing = tool !== 'select' && tool !== 'delete';
        chart_ref.current.applyOptions({
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: !is_drawing,
                horzTouchDrag: !is_drawing,
                vertTouchDrag: !is_drawing,
            },
        });
    }, [tool, chart_ref]);

    const get_event_pixel = useCallback(
        (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
            const rect = container_ref.current?.getBoundingClientRect();
            if (!rect) return null;
            if ('touches' in e && e.touches.length > 0) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            if ('clientX' in e) {
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }
            return null;
        },
        [container_ref]
    );

    const handle_mouse_down = useCallback(
        (e: MouseEvent | TouchEvent) => {
            if (!chart_ref.current || !series_ref.current) return;

            const pixel = get_event_pixel(e);
            if (!pixel) return;
            const tf_seconds = get_timeframe_seconds(timeframe);

            if (tool === 'brush') {
                e.preventDefault();
                const point = pixel_to_chart(
                    chart_ref.current,
                    series_ref.current,
                    pixel,
                    tf_seconds
                );
                if (point) {
                    set_active_drawing({
                        type: 'brush',
                        color: get_default_color('brush'),
                        points: [point],
                    });
                }
                return;
            }

            if (tool === 'select') {
                const handle = find_handle_at_point(
                    drawings,
                    pixel,
                    chart_ref.current,
                    series_ref.current,
                    selected_id,
                    tf_seconds
                );

                if (handle) {
                    e.preventDefault();
                    e.stopPropagation();
                    set_resizing(handle);
                    chart_ref.current.applyOptions({
                        handleScroll: {
                            mouseWheel: true,
                            pressedMouseMove: false,
                            horzTouchDrag: false,
                            vertTouchDrag: false,
                        },
                    });
                }
            }
        },
        [tool, drawings, selected_id, timeframe, chart_ref, series_ref, get_event_pixel]
    );

    const handle_chart_click = useCallback(
        (e: MouseEvent | TouchEvent) => {
            if (resizing) return;

            if (completed_measure_id) {
                set_drawings((prev) => prev.filter((d) => d.id !== completed_measure_id));
                set_completed_measure_id(null);
                set_measure_result(null);
                set_measure_points(null);
                set_tool('select');
                return;
            }

            if (!chart_ref.current || !series_ref.current || tool === 'select') {
                if (tool === 'select' && chart_ref.current && series_ref.current) {
                    const pixel = get_event_pixel(e);
                    if (!pixel) return;
                    const tf_seconds = get_timeframe_seconds(timeframe);
                    const found = find_drawing_at_point(
                        drawings,
                        pixel,
                        chart_ref.current,
                        series_ref.current,
                        tf_seconds
                    );
                    set_selected_id(found?.id || null);
                }
                return;
            }

            const pixel = get_event_pixel(e);
            if (!pixel) return;

            const tf_seconds = get_timeframe_seconds(timeframe);
            const point = pixel_to_chart(chart_ref.current, series_ref.current, pixel, tf_seconds);
            if (!point) return;

            if (tool === 'delete') {
                const found = find_drawing_at_point(
                    drawings,
                    pixel,
                    chart_ref.current,
                    series_ref.current,
                    tf_seconds
                );
                if (found) {
                    set_drawings((prev) => prev.filter((d) => d.id !== found.id));
                }
                return;
            }

            if (tool === 'horizontal_line') {
                const new_drawing: Drawing = {
                    id: generate_drawing_id(),
                    type: 'horizontal_line',
                    color: get_default_color('horizontal_line'),
                    selected: false,
                    points: [point],
                };
                set_drawings((prev) => [...prev, new_drawing]);
                set_tool('select');
                return;
            }

            if (tool === 'brush') {
                return;
            }

            if (!active_drawing) {
                set_active_drawing({
                    type: tool,
                    color: get_default_color(tool),
                    points: [point],
                });
            } else {
                const start = active_drawing.points?.[0];
                if (!start) return;
                const points: [ChartPoint, ChartPoint] = [start, point];
                const new_id = generate_drawing_id();
                const new_drawing: Drawing = {
                    id: new_id,
                    type: tool as 'trend_line' | 'rectangle' | 'measure',
                    color: active_drawing.color || get_default_color(tool),
                    selected: false,
                    points,
                };
                set_drawings((prev) => [...prev, new_drawing]);
                set_active_drawing(null);
                if (tool === 'measure') {
                    set_completed_measure_id(new_id);
                } else {
                    set_tool('select');
                }
            }
        },
        [
            tool,
            active_drawing,
            drawings,
            completed_measure_id,
            resizing,
            timeframe,
            chart_ref,
            series_ref,
            get_event_pixel,
        ]
    );

    const handle_mouse_move = useCallback(
        (e: MouseEvent | TouchEvent) => {
            if (!chart_ref.current || !series_ref.current) return;
            const tf_seconds = get_timeframe_seconds(timeframe);

            const is_active = 'buttons' in e ? e.buttons === 1 : true;
            if (resizing && is_active) {
                const pixel = get_event_pixel(e);
                if (!pixel) return;
                const point = pixel_to_chart(
                    chart_ref.current,
                    series_ref.current,
                    pixel,
                    tf_seconds
                );
                if (!point) return;

                set_drawings((prev) =>
                    prev.map((d) => {
                        if (d.id !== resizing.drawing_id) return d;

                        if (d.type === 'horizontal_line') {
                            return { ...d, points: [{ ...d.points[0], price: point.price }] };
                        }

                        if (d.type === 'trend_line' && d.points.length === 2) {
                            const new_points = [...d.points] as [ChartPoint, ChartPoint];
                            if (resizing.handle_type === 'start') {
                                new_points[0] = point;
                            } else if (resizing.handle_type === 'end') {
                                new_points[1] = point;
                            }
                            return { ...d, points: new_points };
                        }

                        if (d.type === 'rectangle' && d.points.length === 2) {
                            const [p0, p1] = d.points;
                            let new_p0 = { ...p0 };
                            let new_p1 = { ...p1 };

                            const min_time = Math.min(p0.time, p1.time);
                            const max_time = Math.max(p0.time, p1.time);
                            const min_price = Math.min(p0.price, p1.price);
                            const max_price = Math.max(p0.price, p1.price);

                            switch (resizing.handle_type) {
                                case 'top-left':
                                    new_p0 = { time: point.time, price: point.price };
                                    new_p1 = { time: max_time, price: min_price };
                                    break;
                                case 'top-right':
                                    new_p0 = { time: min_time, price: point.price };
                                    new_p1 = { time: point.time, price: min_price };
                                    break;
                                case 'bottom-left':
                                    new_p0 = { time: point.time, price: max_price };
                                    new_p1 = { time: max_time, price: point.price };
                                    break;
                                case 'bottom-right':
                                    new_p0 = { time: min_time, price: max_price };
                                    new_p1 = { time: point.time, price: point.price };
                                    break;
                            }

                            return { ...d, points: [new_p0, new_p1] as [ChartPoint, ChartPoint] };
                        }

                        return d;
                    })
                );
                return;
            }

            if (tool === 'brush' && active_drawing && active_drawing.type === 'brush') {
                const pixel = get_event_pixel(e);
                if (!pixel) return;
                const point = pixel_to_chart(
                    chart_ref.current,
                    series_ref.current,
                    pixel,
                    tf_seconds
                );
                if (point) {
                    set_active_drawing((prev) => ({
                        ...prev,
                        points: [...(prev?.points || []), point],
                    }));
                }
                return;
            }

            if (
                (tool === 'measure' || tool === 'rectangle' || tool === 'trend_line') &&
                active_drawing?.points &&
                active_drawing.points.length >= 1
            ) {
                const pixel = get_event_pixel(e);
                if (!pixel) return;
                const point = pixel_to_chart(
                    chart_ref.current,
                    series_ref.current,
                    pixel,
                    tf_seconds
                );
                if (point) {
                    const start = active_drawing.points[0];
                    const start_pixel = chart_to_pixel(
                        chart_ref.current,
                        series_ref.current,
                        start,
                        tf_seconds
                    );
                    if (
                        start_pixel &&
                        Math.abs(pixel.x - start_pixel.x) < DRAWING_CONSTANTS.MIN_DRAG_DISTANCE &&
                        Math.abs(pixel.y - start_pixel.y) < DRAWING_CONSTANTS.MIN_DRAG_DISTANCE
                    ) {
                        return;
                    }

                    set_active_drawing((prev) => ({
                        ...prev,
                        points: [start, point],
                    }));

                    if (tool === 'measure') {
                        const result = calculate_measure(
                            start,
                            point,
                            get_timeframe_seconds(timeframe)
                        );
                        set_measure_result(result);
                        set_measure_points([start, point]);
                    }
                }
            }
        },
        [tool, active_drawing, timeframe, resizing, chart_ref, series_ref, get_event_pixel]
    );

    const handle_mouse_up = useCallback(() => {
        if (resizing) {
            set_resizing(null);
            if (chart_ref.current) {
                chart_ref.current.applyOptions({
                    handleScroll: {
                        mouseWheel: true,
                        pressedMouseMove: true,
                        horzTouchDrag: true,
                        vertTouchDrag: true,
                    },
                });
            }
            return;
        }

        if (
            tool === 'brush' &&
            active_drawing &&
            active_drawing.points &&
            active_drawing.points.length > 1
        ) {
            const new_drawing: Drawing = {
                id: generate_drawing_id(),
                type: 'brush',
                color: active_drawing.color || get_default_color('brush'),
                selected: false,
                points: active_drawing.points as ChartPoint[],
            };
            set_drawings((prev) => [...prev, new_drawing]);
            set_active_drawing(null);
        }
    }, [tool, active_drawing, resizing, chart_ref]);

    const handle_wheel = useCallback(() => {
        if (completed_measure_id) {
            set_drawings((prev) => prev.filter((d) => d.id !== completed_measure_id));
            set_completed_measure_id(null);
            set_measure_result(null);
            set_measure_points(null);
            set_tool('select');
        }
    }, [completed_measure_id]);

    const selected_drawing = drawings.find((d) => d.id === selected_id);
    const is_drawing_mode = tool !== 'select' && tool !== 'delete';
    const show_overlay = is_drawing_mode || resizing || active_drawing !== null;

    return {
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
    };
}
