import { THEME_COLORS } from '../utils/theme';

function hex_to_rgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const DRAWING_CONSTANTS = {
    DEFAULT_COLOR: '#2962ff',
    HIT_THRESHOLD: 8,
    HANDLE_SIZE: 6,
    HANDLE_RENDER_SIZE: 4,
    ARROW_SIZE: 6,
    MIN_DRAG_DISTANCE: 5,
    LINE_WIDTH: {
        DEFAULT: 1,
        SELECTED: 2,
        BRUSH: 1.5,
    },
    COLORS: {
        HORIZONTAL_LINE: '#2962ff',
        TREND_LINE: '#2962ff',
        RECTANGLE: '#2962ff',
        BRUSH: '#2962ff',
        MEASURE: '#9c27b0',
        BULLISH: THEME_COLORS.GREEN,
        BEARISH: THEME_COLORS.RED,
        BULLISH_FILL: hex_to_rgba(THEME_COLORS.GREEN, 0.18),
        BEARISH_FILL: hex_to_rgba(THEME_COLORS.RED, 0.18),
    },
    FILL_OPACITY: 0.3,
    DASH_PATTERN: [5, 5],
    TOOLTIP: {
        PADDING_X: 10,
        PADDING_Y: 8,
        ROW_GAP: 6,
        CORNER_RADIUS: 8,
        FONT_SIZE: 12,
        OFFSET: 10,
        MARGIN: 6,
    },
    CACHE: {
        MAX_COLOR_CACHE_SIZE: 100,
    },
    SMOOTHING: {
        FACTOR: 0.35,
        THRESHOLD: 0.5,
    },
};
