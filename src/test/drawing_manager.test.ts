import { describe, it, expect } from 'vitest';
import {
    generate_drawing_id,
    get_default_color,
    is_point_near_line,
    is_point_in_rect,
    calculate_measure,
    get_timeframe_seconds,
} from '../services/chart/drawing_manager';
import { DRAWING_CONSTANTS } from '../config/drawing.constants';

describe('drawing_manager', () => {
    describe('generate_drawing_id', () => {
        it('should generate unique ids', () => {
            const id1 = generate_drawing_id();
            const id2 = generate_drawing_id();
            expect(id1).not.toBe(id2);
        });

        it('should have drawing_ prefix', () => {
            const id = generate_drawing_id();
            expect(id.startsWith('drawing_')).toBe(true);
        });
    });

    describe('get_default_color', () => {
        it('should return correct color for horizontal_line', () => {
            expect(get_default_color('horizontal_line')).toBe(
                DRAWING_CONSTANTS.COLORS.HORIZONTAL_LINE
            );
        });

        it('should return correct color for trend_line', () => {
            expect(get_default_color('trend_line')).toBe(DRAWING_CONSTANTS.COLORS.TREND_LINE);
        });

        it('should return correct color for rectangle', () => {
            expect(get_default_color('rectangle')).toBe(DRAWING_CONSTANTS.COLORS.RECTANGLE);
        });

        it('should return correct color for brush', () => {
            expect(get_default_color('brush')).toBe(DRAWING_CONSTANTS.COLORS.BRUSH);
        });

        it('should return correct color for measure', () => {
            expect(get_default_color('measure')).toBe(DRAWING_CONSTANTS.COLORS.MEASURE);
        });

        it('should return default color for unknown tool', () => {
            expect(get_default_color('unknown' as any)).toBe(DRAWING_CONSTANTS.DEFAULT_COLOR);
        });
    });

    describe('is_point_near_line', () => {
        it('should return true when point is on the line', () => {
            const result = is_point_near_line({ x: 50, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 });
            expect(result).toBe(true);
        });

        it('should return true when point is within threshold', () => {
            const result = is_point_near_line(
                { x: 55, y: 50 },
                { x: 0, y: 0 },
                { x: 100, y: 100 },
                10
            );
            expect(result).toBe(true);
        });

        it('should return false when point is far from line', () => {
            const result = is_point_near_line({ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 100, y: 0 });
            expect(result).toBe(false);
        });

        it('should handle horizontal lines', () => {
            const result = is_point_near_line(
                { x: 50, y: 5 },
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                10
            );
            expect(result).toBe(true);
        });

        it('should handle vertical lines', () => {
            const result = is_point_near_line(
                { x: 5, y: 50 },
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                10
            );
            expect(result).toBe(true);
        });

        it('should handle zero-length lines (point)', () => {
            const result = is_point_near_line({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 10);
            expect(result).toBe(true);
        });

        it('should handle point beyond line endpoints', () => {
            const on_extension = is_point_near_line(
                { x: 150, y: 150 },
                { x: 0, y: 0 },
                { x: 100, y: 100 }
            );
            expect(on_extension).toBe(false);
        });
    });

    describe('is_point_in_rect', () => {
        it('should return true when point is inside rectangle', () => {
            const result = is_point_in_rect({ x: 50, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 });
            expect(result).toBe(true);
        });

        it('should return true when point is on edge', () => {
            const result = is_point_in_rect({ x: 0, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 });
            expect(result).toBe(true);
        });

        it('should return false when point is outside', () => {
            const result = is_point_in_rect({ x: 150, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 });
            expect(result).toBe(false);
        });

        it('should handle corners defined in any order', () => {
            const result = is_point_in_rect({ x: 50, y: 50 }, { x: 100, y: 100 }, { x: 0, y: 0 });
            expect(result).toBe(true);
        });

        it('should respect custom threshold', () => {
            const outside_no_threshold = is_point_in_rect(
                { x: 105, y: 50 },
                { x: 0, y: 0 },
                { x: 100, y: 100 },
                0
            );
            expect(outside_no_threshold).toBe(false);

            const inside_with_threshold = is_point_in_rect(
                { x: 105, y: 50 },
                { x: 0, y: 0 },
                { x: 100, y: 100 },
                10
            );
            expect(inside_with_threshold).toBe(true);
        });
    });

    describe('calculate_measure', () => {
        it('should calculate positive price difference', () => {
            const result = calculate_measure(
                { time: 1000, price: 100, _logical: 0 },
                { time: 2000, price: 150, _logical: 1 },
                60
            );
            expect(result.price_diff).toBe(50);
            expect(result.percent_change).toBe(50);
            expect(result.start_price).toBe(100);
            expect(result.end_price).toBe(150);
        });

        it('should calculate negative price difference', () => {
            const result = calculate_measure(
                { time: 1000, price: 100, _logical: 0 },
                { time: 2000, price: 80, _logical: 1 },
                60
            );
            expect(result.price_diff).toBe(-20);
            expect(result.percent_change).toBe(-20);
        });

        it('should calculate bars correctly', () => {
            const result = calculate_measure(
                { time: 0, price: 100, _logical: 0 },
                { time: 300, price: 100, _logical: 5 },
                60
            );
            expect(result.bars).toBe(5);
            expect(result.time_seconds).toBe(300);
        });

        it('should handle zero start price', () => {
            const result = calculate_measure(
                { time: 0, price: 0, _logical: 0 },
                { time: 60, price: 100, _logical: 1 },
                60
            );
            expect(result.percent_change).toBe(0);
        });

        it('should handle zero timeframe', () => {
            const result = calculate_measure(
                { time: 0, price: 100, _logical: 0 },
                { time: 300, price: 150, _logical: 5 },
                0
            );
            expect(result.bars).toBe(0);
        });
    });

    describe('get_timeframe_seconds', () => {
        it('should return correct seconds for sub-minute timeframes', () => {
            expect(get_timeframe_seconds('S1')).toBe(1);
            expect(get_timeframe_seconds('S5')).toBe(5);
            expect(get_timeframe_seconds('S15')).toBe(15);
            expect(get_timeframe_seconds('S30')).toBe(30);
        });

        it('should return correct seconds for minute timeframes', () => {
            expect(get_timeframe_seconds('1')).toBe(60);
            expect(get_timeframe_seconds('5')).toBe(300);
            expect(get_timeframe_seconds('15')).toBe(900);
            expect(get_timeframe_seconds('30')).toBe(1800);
        });

        it('should return correct seconds for hour timeframes', () => {
            expect(get_timeframe_seconds('60')).toBe(3600);
            expect(get_timeframe_seconds('120')).toBe(7200);
            expect(get_timeframe_seconds('240')).toBe(14400);
            expect(get_timeframe_seconds('480')).toBe(28800);
            expect(get_timeframe_seconds('720')).toBe(43200);
        });

        it('should return correct seconds for day/week/month', () => {
            expect(get_timeframe_seconds('D')).toBe(86400);
            expect(get_timeframe_seconds('W')).toBe(604800);
            expect(get_timeframe_seconds('M')).toBe(2592000);
        });

        it('should return 60 for unknown timeframes', () => {
            expect(get_timeframe_seconds('unknown')).toBe(60);
            expect(get_timeframe_seconds('')).toBe(60);
        });
    });
});
