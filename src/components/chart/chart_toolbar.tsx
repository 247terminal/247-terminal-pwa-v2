import { useState } from 'preact/hooks';

type Timeframe =
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

interface ChartToolbarProps {
    symbol: string;
    timeframe: Timeframe;
    on_timeframe_change: (tf: Timeframe) => void;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    S1: '1s',
    S5: '5s',
    S15: '15s',
    S30: '30s',
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '120': '2h',
    '240': '4h',
    '480': '8h',
    '720': '12h',
    D: '1D',
    W: '1W',
    M: '1M',
};

const SECONDS: Timeframe[] = ['S1', 'S5', 'S15', 'S30'];
const MINUTES: Timeframe[] = ['1', '5', '15', '30'];
const HOURS: Timeframe[] = ['60', '120', '240', '480'];
const DAYS: Timeframe[] = ['720', 'D', 'W', 'M'];

export function ChartToolbar({ symbol, timeframe, on_timeframe_change }: ChartToolbarProps) {
    const [is_open, set_is_open] = useState(false);

    const handle_select = (tf: Timeframe) => {
        on_timeframe_change(tf);
        set_is_open(false);
    };

    const render_row = (timeframes: Timeframe[]) => (
        <div class="flex gap-0.5">
            {timeframes.map((tf) => (
                <button
                    type="button"
                    key={tf}
                    onClick={() => handle_select(tf)}
                    class={`py-1 w-[36px] text-xs rounded transition-colors text-center ${
                        timeframe === tf
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                    }`}
                >
                    {TIMEFRAME_LABELS[tf]}
                </button>
            ))}
        </div>
    );

    return (
        <div class="flex items-center gap-3 px-3 py-1.5">
            <span class="text-sm font-medium text-base-content">{symbol}</span>
            <div class="relative">
                <button
                    type="button"
                    onClick={() => set_is_open(!is_open)}
                    class="px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors"
                >
                    {TIMEFRAME_LABELS[timeframe]}
                </button>
                {is_open && (
                    <>
                        <div class="fixed inset-0" onClick={() => set_is_open(false)} />
                        <div class="absolute top-full left-0 mt-1 bg-base-200 border border-base-300 rounded shadow-lg">
                            <div class="flex flex-col gap-0.5 p-1">
                                {render_row(SECONDS)}
                                {render_row(MINUTES)}
                                {render_row(HOURS)}
                                {render_row(DAYS)}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export type { Timeframe };
