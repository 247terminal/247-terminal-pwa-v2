export type Timeframe =
    | 'S1'
    | 'S5'
    | 'S15'
    | 'S30'
    | '1'
    | '5'
    | '15'
    | '30'
    | '60'
    | '120'
    | '240'
    | '480'
    | '720'
    | 'D'
    | 'W'
    | 'M';

export type SubMinuteTimeframe = 'S1' | 'S5' | 'S15' | 'S30';

export const SUB_MINUTE_TIMEFRAMES: SubMinuteTimeframe[] = ['S1', 'S5', 'S15', 'S30'];

export const TIMEFRAME_SECONDS: Record<SubMinuteTimeframe, number> = {
    S1: 1,
    S5: 5,
    S15: 15,
    S30: 30,
};

export function is_sub_minute_timeframe(tf: Timeframe): tf is SubMinuteTimeframe {
    return SUB_MINUTE_TIMEFRAMES.includes(tf as SubMinuteTimeframe);
}

export function get_timeframe_seconds(tf: SubMinuteTimeframe): number {
    return TIMEFRAME_SECONDS[tf];
}
