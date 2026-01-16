import type { PixelPoint, MeasureResult } from '../../types/drawing.types';
import { DRAWING_CONSTANTS } from '../../config/drawing.constants';
import { parse_color, type RGBA } from '../../utils/color';

const COLOR_CACHE = new Map<string, RGBA>();
const MAX_CACHE_SIZE = DRAWING_CONSTANTS.CACHE.MAX_COLOR_CACHE_SIZE;
const DEFAULT_RGBA: RGBA = { r: 41, g: 98, b: 255, a: 1 };

function parse_color_cached(color: string): RGBA {
    const cached = COLOR_CACHE.get(color);
    if (cached) return cached;

    const result = parse_color(color) || DEFAULT_RGBA;

    if (COLOR_CACHE.size >= MAX_CACHE_SIZE) {
        const firstKey = COLOR_CACHE.keys().next().value;
        if (firstKey) COLOR_CACHE.delete(firstKey);
    }
    COLOR_CACHE.set(color, result);

    return result;
}

function get_fill_and_stroke(color: string): { fill: string; stroke: string } {
    const { r, g, b, a } = parse_color_cached(color);
    const fill_alpha = Math.min(a * DRAWING_CONSTANTS.FILL_OPACITY, DRAWING_CONSTANTS.FILL_OPACITY);
    return {
        fill: `rgba(${r}, ${g}, ${b}, ${fill_alpha})`,
        stroke: `rgba(${r}, ${g}, ${b}, ${a})`,
    };
}

function get_stroke_color(color: string): string {
    const { r, g, b, a } = parse_color_cached(color);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function draw_handle(ctx: CanvasRenderingContext2D, x: number, y: number, is_dark: boolean) {
    const size = DRAWING_CONSTANTS.HANDLE_RENDER_SIZE;
    ctx.fillStyle = is_dark ? '#fff' : '#000';
    ctx.strokeStyle = is_dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x - size, y - size, size * 2, size * 2);
    ctx.fill();
    ctx.stroke();
}

export function draw_horizontal_line(
    ctx: CanvasRenderingContext2D,
    pixels: PixelPoint[],
    color: string,
    selected: boolean,
    width: number,
    is_dark: boolean
) {
    if (pixels.length < 1) return;
    ctx.strokeStyle = get_stroke_color(color);
    ctx.lineWidth = selected
        ? DRAWING_CONSTANTS.LINE_WIDTH.SELECTED
        : DRAWING_CONSTANTS.LINE_WIDTH.DEFAULT;
    ctx.setLineDash(selected ? DRAWING_CONSTANTS.DASH_PATTERN : []);
    ctx.beginPath();
    ctx.moveTo(0, pixels[0].y);
    ctx.lineTo(width, pixels[0].y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (selected) {
        draw_handle(ctx, width / 2, pixels[0].y, is_dark);
    }
}

export function draw_trend_line(
    ctx: CanvasRenderingContext2D,
    pixels: PixelPoint[],
    color: string,
    selected: boolean,
    is_dark: boolean
) {
    if (pixels.length < 2) return;
    ctx.strokeStyle = get_stroke_color(color);
    ctx.lineWidth = selected
        ? DRAWING_CONSTANTS.LINE_WIDTH.SELECTED
        : DRAWING_CONSTANTS.LINE_WIDTH.DEFAULT;
    ctx.setLineDash(selected ? DRAWING_CONSTANTS.DASH_PATTERN : []);
    ctx.beginPath();
    ctx.moveTo(pixels[0].x, pixels[0].y);
    ctx.lineTo(pixels[1].x, pixels[1].y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (selected) {
        draw_handle(ctx, pixels[0].x, pixels[0].y, is_dark);
        draw_handle(ctx, pixels[1].x, pixels[1].y, is_dark);
    }
}

export function draw_rectangle(
    ctx: CanvasRenderingContext2D,
    pixels: PixelPoint[],
    color: string,
    selected: boolean,
    is_dark: boolean
) {
    if (pixels.length < 2) return;
    const x = Math.min(pixels[0].x, pixels[1].x);
    const y = Math.min(pixels[0].y, pixels[1].y);
    const w = Math.abs(pixels[1].x - pixels[0].x);
    const h = Math.abs(pixels[1].y - pixels[0].y);

    const { fill, stroke } = get_fill_and_stroke(color);

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = selected
        ? DRAWING_CONSTANTS.LINE_WIDTH.SELECTED
        : DRAWING_CONSTANTS.LINE_WIDTH.DEFAULT;
    ctx.setLineDash(selected ? DRAWING_CONSTANTS.DASH_PATTERN : []);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    if (selected) {
        draw_handle(ctx, x, y, is_dark);
        draw_handle(ctx, x + w, y, is_dark);
        draw_handle(ctx, x, y + h, is_dark);
        draw_handle(ctx, x + w, y + h, is_dark);
    }
}

export function draw_brush(
    ctx: CanvasRenderingContext2D,
    pixels: PixelPoint[],
    color: string,
    selected: boolean,
    is_dark: boolean
) {
    if (pixels.length < 2) return;
    ctx.strokeStyle = get_stroke_color(color);
    ctx.lineWidth = selected
        ? DRAWING_CONSTANTS.LINE_WIDTH.SELECTED
        : DRAWING_CONSTANTS.LINE_WIDTH.BRUSH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(selected ? DRAWING_CONSTANTS.DASH_PATTERN : []);
    ctx.beginPath();
    ctx.moveTo(pixels[0].x, pixels[0].y);
    const len = pixels.length;
    for (let i = 1; i < len; i++) {
        ctx.lineTo(pixels[i].x, pixels[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (selected) {
        draw_handle(ctx, pixels[0].x, pixels[0].y, is_dark);
        draw_handle(ctx, pixels[len - 1].x, pixels[len - 1].y, is_dark);
    }
}

export function draw_measure(ctx: CanvasRenderingContext2D, pixels: PixelPoint[]) {
    if (pixels.length < 2) return;
    const x = Math.min(pixels[0].x, pixels[1].x);
    const y = Math.min(pixels[0].y, pixels[1].y);
    const w = Math.abs(pixels[1].x - pixels[0].x);
    const h = Math.abs(pixels[1].y - pixels[0].y);
    const is_bullish = pixels[1].y < pixels[0].y;
    const color = is_bullish ? DRAWING_CONSTANTS.COLORS.BULLISH : DRAWING_CONSTANTS.COLORS.BEARISH;
    const color_fill = is_bullish
        ? DRAWING_CONSTANTS.COLORS.BULLISH_FILL
        : DRAWING_CONSTANTS.COLORS.BEARISH_FILL;

    ctx.fillStyle = color_fill;
    ctx.fillRect(x, y, w, h);

    const center_x = x + w / 2;
    const top_y = y;
    const bottom_y = y + h;
    const arrow_size = DRAWING_CONSTANTS.ARROW_SIZE;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(center_x, top_y);
    ctx.lineTo(center_x, bottom_y);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (is_bullish) {
        ctx.moveTo(center_x - arrow_size, top_y + arrow_size);
        ctx.lineTo(center_x, top_y);
        ctx.lineTo(center_x + arrow_size, top_y + arrow_size);
    } else {
        ctx.moveTo(center_x - arrow_size, bottom_y - arrow_size);
        ctx.lineTo(center_x, bottom_y);
        ctx.lineTo(center_x + arrow_size, bottom_y - arrow_size);
    }
    ctx.stroke();
}

function format_price_diff(diff: number, tick_size: number): string {
    const precision = Math.max(0, -Math.floor(Math.log10(tick_size)));
    const sign = diff >= 0 ? '+' : '';
    return sign + diff.toFixed(precision);
}

function format_percent(percent: number): string {
    const sign = percent >= 0 ? '+' : '';
    return sign + percent.toFixed(2) + '%';
}

function format_duration(seconds: number): string {
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return mins > 0 ? hours + 'h ' + mins + 'm' : hours + 'h';
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? days + 'd ' + hours + 'h' : days + 'd';
}

export function draw_measure_tooltip(
    ctx: CanvasRenderingContext2D,
    pixels: PixelPoint[],
    result: MeasureResult,
    tick_size: number,
    chart_width: number,
    chart_height: number,
    is_dark: boolean
) {
    if (pixels.length < 2) return;

    const is_positive = result.price_diff >= 0;
    const left = Math.min(pixels[0].x, pixels[1].x);
    const right = Math.max(pixels[0].x, pixels[1].x);
    const top_y = Math.min(pixels[0].y, pixels[1].y);
    const bottom_y = Math.max(pixels[0].y, pixels[1].y);
    const center_x = left + (right - left) / 2;

    const accent = is_positive
        ? DRAWING_CONSTANTS.COLORS.BULLISH
        : DRAWING_CONSTANTS.COLORS.BEARISH;

    const price_text = format_price_diff(result.price_diff, tick_size);
    const percent_text = format_percent(result.percent_change);
    const time_text = format_duration(result.time_seconds);

    ctx.save();

    const { PADDING_X, PADDING_Y, ROW_GAP, CORNER_RADIUS, FONT_SIZE, OFFSET, MARGIN } =
        DRAWING_CONSTANTS.TOOLTIP;

    const font_family = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

    ctx.font = '600 ' + FONT_SIZE + 'px ' + font_family;
    const percent_width = ctx.measureText(percent_text).width;
    const price_width = ctx.measureText(price_text).width;
    const meta_text = result.bars + ' bars · ' + time_text;
    const meta_width = ctx.measureText(meta_text).width;

    const content_width = Math.max(percent_width, price_width, meta_width);
    const tooltip_width = content_width + PADDING_X * 2;
    const tooltip_height = PADDING_Y * 2 + FONT_SIZE * 3 + ROW_GAP * 2;

    let tooltip_left = center_x - tooltip_width / 2;
    let tooltip_top = is_positive ? top_y - tooltip_height - OFFSET : bottom_y + OFFSET;

    tooltip_left = Math.max(MARGIN, Math.min(tooltip_left, chart_width - tooltip_width - MARGIN));
    tooltip_top = Math.max(MARGIN, Math.min(tooltip_top, chart_height - tooltip_height - MARGIN));

    ctx.shadowColor = is_dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = is_dark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.roundRect(tooltip_left, tooltip_top, tooltip_width, tooltip_height, CORNER_RADIUS);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = is_dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(tooltip_left, tooltip_top, 3, tooltip_height, [
        CORNER_RADIUS,
        0,
        0,
        CORNER_RADIUS,
    ]);
    ctx.fill();

    const text_left = tooltip_left + PADDING_X + 2;
    let y = tooltip_top + PADDING_Y;

    ctx.font = '600 ' + FONT_SIZE + 'px ' + font_family;
    ctx.fillStyle = accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(percent_text, text_left, y);
    y += FONT_SIZE + ROW_GAP;

    ctx.font = '500 ' + FONT_SIZE + 'px ' + font_family;
    ctx.fillStyle = is_dark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(price_text, text_left, y);
    y += FONT_SIZE + ROW_GAP;

    ctx.font = '400 ' + FONT_SIZE + 'px ' + font_family;
    ctx.fillStyle = is_dark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
    ctx.fillText(meta_text, text_left, y);

    ctx.restore();
}
