import { describe, it, expect } from 'vitest';
import { DRAWING_CONSTANTS } from '../config/drawing.constants';

describe('drawing_constants', () => {
    describe('structure', () => {
        it('should have all required top-level keys', () => {
            expect(DRAWING_CONSTANTS).toHaveProperty('DEFAULT_COLOR');
            expect(DRAWING_CONSTANTS).toHaveProperty('HIT_THRESHOLD');
            expect(DRAWING_CONSTANTS).toHaveProperty('HANDLE_SIZE');
            expect(DRAWING_CONSTANTS).toHaveProperty('HANDLE_RENDER_SIZE');
            expect(DRAWING_CONSTANTS).toHaveProperty('ARROW_SIZE');
            expect(DRAWING_CONSTANTS).toHaveProperty('MIN_DRAG_DISTANCE');
            expect(DRAWING_CONSTANTS).toHaveProperty('LINE_WIDTH');
            expect(DRAWING_CONSTANTS).toHaveProperty('COLORS');
            expect(DRAWING_CONSTANTS).toHaveProperty('FILL_OPACITY');
            expect(DRAWING_CONSTANTS).toHaveProperty('DASH_PATTERN');
            expect(DRAWING_CONSTANTS).toHaveProperty('TOOLTIP');
            expect(DRAWING_CONSTANTS).toHaveProperty('CACHE');
        });

        it('should have all LINE_WIDTH variants', () => {
            expect(DRAWING_CONSTANTS.LINE_WIDTH).toHaveProperty('DEFAULT');
            expect(DRAWING_CONSTANTS.LINE_WIDTH).toHaveProperty('SELECTED');
            expect(DRAWING_CONSTANTS.LINE_WIDTH).toHaveProperty('BRUSH');
        });

        it('should have all COLORS', () => {
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('HORIZONTAL_LINE');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('TREND_LINE');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('RECTANGLE');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('BRUSH');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('MEASURE');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('BULLISH');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('BEARISH');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('BULLISH_FILL');
            expect(DRAWING_CONSTANTS.COLORS).toHaveProperty('BEARISH_FILL');
        });

        it('should have all TOOLTIP properties', () => {
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('PADDING_X');
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('PADDING_Y');
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('ROW_GAP');
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('CORNER_RADIUS');
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('FONT_SIZE');
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('OFFSET');
            expect(DRAWING_CONSTANTS.TOOLTIP).toHaveProperty('MARGIN');
        });

        it('should have CACHE properties', () => {
            expect(DRAWING_CONSTANTS.CACHE).toHaveProperty('MAX_COLOR_CACHE_SIZE');
        });
    });

    describe('values', () => {
        it('should have positive HIT_THRESHOLD', () => {
            expect(DRAWING_CONSTANTS.HIT_THRESHOLD).toBeGreaterThan(0);
        });

        it('should have positive HANDLE_SIZE', () => {
            expect(DRAWING_CONSTANTS.HANDLE_SIZE).toBeGreaterThan(0);
        });

        it('should have positive HANDLE_RENDER_SIZE', () => {
            expect(DRAWING_CONSTANTS.HANDLE_RENDER_SIZE).toBeGreaterThan(0);
        });

        it('should have positive ARROW_SIZE', () => {
            expect(DRAWING_CONSTANTS.ARROW_SIZE).toBeGreaterThan(0);
        });

        it('should have LINE_WIDTH.SELECTED greater than DEFAULT', () => {
            expect(DRAWING_CONSTANTS.LINE_WIDTH.SELECTED).toBeGreaterThan(
                DRAWING_CONSTANTS.LINE_WIDTH.DEFAULT
            );
        });

        it('should have FILL_OPACITY between 0 and 1', () => {
            expect(DRAWING_CONSTANTS.FILL_OPACITY).toBeGreaterThan(0);
            expect(DRAWING_CONSTANTS.FILL_OPACITY).toBeLessThanOrEqual(1);
        });

        it('should have DASH_PATTERN as non-empty array', () => {
            expect(Array.isArray(DRAWING_CONSTANTS.DASH_PATTERN)).toBe(true);
            expect(DRAWING_CONSTANTS.DASH_PATTERN.length).toBeGreaterThan(0);
        });

        it('should have valid color format for DEFAULT_COLOR', () => {
            expect(DRAWING_CONSTANTS.DEFAULT_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
        });

        it('should have reasonable cache size', () => {
            expect(DRAWING_CONSTANTS.CACHE.MAX_COLOR_CACHE_SIZE).toBeGreaterThan(0);
            expect(DRAWING_CONSTANTS.CACHE.MAX_COLOR_CACHE_SIZE).toBeLessThanOrEqual(1000);
        });
    });
});
