import type { IChartApi, ISeriesApi, Time, Logical } from 'lightweight-charts';
import type {
    ChartPoint,
    PixelPoint,
    Drawing,
    MeasureResult,
    DrawingTool,
    HandleType,
    HandleInfo,
} from '../../types/drawing.types';
import { DRAWING_CONSTANTS } from '../../config/drawing.constants';

export type { HandleType, HandleInfo };

const DEFAULT_COLORS: Record<string, string> = {
    horizontal_line: DRAWING_CONSTANTS.COLORS.HORIZONTAL_LINE,
    trend_line: DRAWING_CONSTANTS.COLORS.TREND_LINE,
    rectangle: DRAWING_CONSTANTS.COLORS.RECTANGLE,
    brush: DRAWING_CONSTANTS.COLORS.BRUSH,
    measure: DRAWING_CONSTANTS.COLORS.MEASURE,
};

let id_counter = 0;

export function generate_drawing_id(): string {
    return 'drawing_' + ++id_counter + '_' + Date.now();
}

export function get_default_color(tool: DrawingTool): string {
    return DEFAULT_COLORS[tool] || DRAWING_CONSTANTS.DEFAULT_COLOR;
}

export function pixel_to_chart(
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    pixel: PixelPoint,
    timeframe_seconds: number = 60
): ChartPoint | null {
    const price = series.coordinateToPrice(pixel.y);
    if (price === null) return null;

    const logical = chart.timeScale().coordinateToLogical(pixel.x);
    if (logical === null) return null;

    let time = chart.timeScale().coordinateToTime(pixel.x) as number | null;

    if (time === null) {
        const visible_range = chart.timeScale().getVisibleLogicalRange();
        if (!visible_range) return null;

        let ref_logical = Math.floor(logical);
        let ref_bar = series.dataByIndex(ref_logical);

        if (!ref_bar) {
            ref_logical = Math.ceil(logical);
            ref_bar = series.dataByIndex(ref_logical);
        }
        if (!ref_bar) {
            ref_logical = Math.floor(visible_range.to);
            ref_bar = series.dataByIndex(ref_logical);
            while (!ref_bar && ref_logical > visible_range.from) {
                ref_logical--;
                ref_bar = series.dataByIndex(ref_logical);
            }
        }

        if (ref_bar && 'time' in ref_bar) {
            const bars_diff = logical - ref_logical;
            time = (ref_bar.time as number) + bars_diff * timeframe_seconds;
        } else {
            return null;
        }
    }

    return { time, price, _logical: logical };
}

export function chart_to_pixel(
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    point: ChartPoint,
    timeframe_seconds: number = 60
): PixelPoint | null {
    const y = series.priceToCoordinate(point.price);
    if (y === null) return null;

    let x: number | null = null;

    if (point._logical !== undefined) {
        x = chart.timeScale().logicalToCoordinate(point._logical as Logical);
    }

    if (x !== null) {
        return { x, y };
    }

    x = chart.timeScale().timeToCoordinate(point.time as Time);
    if (x !== null) {
        return { x, y };
    }

    const visible_range = chart.timeScale().getVisibleLogicalRange();
    if (!visible_range) return null;

    let ref_logical = Math.floor(visible_range.to);
    let ref_bar = series.dataByIndex(ref_logical);

    while (!ref_bar && ref_logical > visible_range.from) {
        ref_logical--;
        ref_bar = series.dataByIndex(ref_logical);
    }

    if (!ref_bar) {
        ref_logical = Math.ceil(visible_range.from);
        ref_bar = series.dataByIndex(ref_logical);
        while (!ref_bar && ref_logical < visible_range.to) {
            ref_logical++;
            ref_bar = series.dataByIndex(ref_logical);
        }
    }

    if (ref_bar && 'time' in ref_bar) {
        const ref_time = ref_bar.time as number;
        const bars_diff = (point.time - ref_time) / timeframe_seconds;
        const target_logical = (ref_logical + bars_diff) as Logical;
        x = chart.timeScale().logicalToCoordinate(target_logical);
    }

    if (x === null) return null;

    return { x, y };
}

export function calculate_measure(
    start: ChartPoint,
    end: ChartPoint,
    timeframe_seconds: number
): MeasureResult {
    const price_diff = end.price - start.price;
    const percent_change = start.price !== 0 ? (price_diff / start.price) * 100 : 0;
    const time_diff = Math.abs(end.time - start.time);
    const bars = timeframe_seconds > 0 ? Math.round(time_diff / timeframe_seconds) : 0;
    const time_seconds = bars * timeframe_seconds;

    return {
        price_diff,
        percent_change,
        bars,
        time_seconds,
        start_price: start.price,
        end_price: end.price,
    };
}

export function is_point_near_line(
    point: PixelPoint,
    line_start: PixelPoint,
    line_end: PixelPoint,
    threshold: number = DRAWING_CONSTANTS.HIT_THRESHOLD
): boolean {
    const dx = line_end.x - line_start.x;
    const dy = line_end.y - line_start.y;
    const length_sq = dx * dx + dy * dy;

    if (length_sq === 0) {
        const pdx = point.x - line_start.x;
        const pdy = point.y - line_start.y;
        return pdx * pdx + pdy * pdy <= threshold * threshold;
    }

    let t = ((point.x - line_start.x) * dx + (point.y - line_start.y) * dy) / length_sq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;

    const closest_x = line_start.x + t * dx;
    const closest_y = line_start.y + t * dy;
    const dist_x = point.x - closest_x;
    const dist_y = point.y - closest_y;

    return dist_x * dist_x + dist_y * dist_y <= threshold * threshold;
}

export function is_point_in_rect(
    point: PixelPoint,
    corner1: PixelPoint,
    corner2: PixelPoint,
    threshold: number = DRAWING_CONSTANTS.HIT_THRESHOLD
): boolean {
    const min_x = (corner1.x < corner2.x ? corner1.x : corner2.x) - threshold;
    const max_x = (corner1.x > corner2.x ? corner1.x : corner2.x) + threshold;
    const min_y = (corner1.y < corner2.y ? corner1.y : corner2.y) - threshold;
    const max_y = (corner1.y > corner2.y ? corner1.y : corner2.y) + threshold;

    return point.x >= min_x && point.x <= max_x && point.y >= min_y && point.y <= max_y;
}

function get_drawing_pixels(
    drawing: Drawing,
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    timeframe_seconds: number
): PixelPoint[] {
    const points = drawing.points;
    const len = points.length;
    const result: PixelPoint[] = [];
    for (let i = 0; i < len; i++) {
        const px = chart_to_pixel(chart, series, points[i], timeframe_seconds);
        if (px) result.push(px);
    }
    return result;
}

export function find_drawing_at_point(
    drawings: Drawing[],
    pixel: PixelPoint,
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    timeframe_seconds: number = 60
): Drawing | null {
    const len = drawings.length;
    for (let i = len - 1; i >= 0; i--) {
        const drawing = drawings[i];
        if (drawing.type === 'measure') continue;

        const pixels = get_drawing_pixels(drawing, chart, series, timeframe_seconds);
        const plen = pixels.length;
        if (plen === 0) continue;

        if (drawing.type === 'horizontal_line' && plen >= 1) {
            const dy = pixel.y - pixels[0].y;
            const threshold = DRAWING_CONSTANTS.HIT_THRESHOLD;
            if (dy >= -threshold && dy <= threshold) return drawing;
        }

        if (drawing.type === 'trend_line' && plen === 2) {
            if (is_point_near_line(pixel, pixels[0], pixels[1])) return drawing;
        }

        if (drawing.type === 'rectangle' && plen === 2) {
            if (is_point_in_rect(pixel, pixels[0], pixels[1])) return drawing;
        }

        if (drawing.type === 'brush' && plen >= 2) {
            for (let j = 0; j < plen - 1; j++) {
                if (is_point_near_line(pixel, pixels[j], pixels[j + 1])) return drawing;
            }
        }
    }

    return null;
}

export function get_timeframe_seconds(timeframe: string): number {
    switch (timeframe) {
        case 'S1':
            return 1;
        case 'S5':
            return 5;
        case 'S15':
            return 15;
        case 'S30':
            return 30;
        case '1':
            return 60;
        case '5':
            return 300;
        case '15':
            return 900;
        case '30':
            return 1800;
        case '60':
            return 3600;
        case '120':
            return 7200;
        case '240':
            return 14400;
        case '480':
            return 28800;
        case '720':
            return 43200;
        case 'D':
            return 86400;
        case 'W':
            return 604800;
        case 'M':
            return 2592000;
        default:
            return 60;
    }
}

const HANDLE_SIZE = DRAWING_CONSTANTS.HANDLE_SIZE;
const HANDLE_SIZE_SQ = HANDLE_SIZE * HANDLE_SIZE;

function is_near_point(px: PixelPoint, target: PixelPoint): boolean {
    const dx = px.x - target.x;
    const dy = px.y - target.y;
    return dx * dx + dy * dy <= HANDLE_SIZE_SQ;
}

export function find_handle_at_point(
    drawings: Drawing[],
    pixel: PixelPoint,
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    selected_id: string | null,
    timeframe_seconds: number = 60
): HandleInfo | null {
    if (!selected_id) return null;

    const len = drawings.length;
    let selected: Drawing | null = null;
    for (let i = 0; i < len; i++) {
        if (drawings[i].id === selected_id) {
            selected = drawings[i];
            break;
        }
    }
    if (!selected) return null;

    const pixels = get_drawing_pixels(selected, chart, series, timeframe_seconds);
    const plen = pixels.length;
    if (plen === 0) return null;

    if (selected.type === 'horizontal_line' && plen >= 1) {
        const chart_width = chart.timeScale().width();
        const center_x = chart_width / 2;
        if (is_near_point(pixel, { x: center_x, y: pixels[0].y })) {
            return { drawing_id: selected_id, handle_type: 'center' };
        }
    }

    if (selected.type === 'trend_line' && plen === 2) {
        if (is_near_point(pixel, pixels[0])) {
            return { drawing_id: selected_id, handle_type: 'start' };
        }
        if (is_near_point(pixel, pixels[1])) {
            return { drawing_id: selected_id, handle_type: 'end' };
        }
    }

    if (selected.type === 'rectangle' && plen === 2) {
        const x1 = pixels[0].x < pixels[1].x ? pixels[0].x : pixels[1].x;
        const x2 = pixels[0].x > pixels[1].x ? pixels[0].x : pixels[1].x;
        const y1 = pixels[0].y < pixels[1].y ? pixels[0].y : pixels[1].y;
        const y2 = pixels[0].y > pixels[1].y ? pixels[0].y : pixels[1].y;

        if (is_near_point(pixel, { x: x1, y: y1 })) {
            return { drawing_id: selected_id, handle_type: 'top-left' };
        }
        if (is_near_point(pixel, { x: x2, y: y1 })) {
            return { drawing_id: selected_id, handle_type: 'top-right' };
        }
        if (is_near_point(pixel, { x: x1, y: y2 })) {
            return { drawing_id: selected_id, handle_type: 'bottom-left' };
        }
        if (is_near_point(pixel, { x: x2, y: y2 })) {
            return { drawing_id: selected_id, handle_type: 'bottom-right' };
        }
    }

    return null;
}
