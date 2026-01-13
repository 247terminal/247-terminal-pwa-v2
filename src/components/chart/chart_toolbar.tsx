type Timeframe = '1' | '5' | '15' | '60' | '240' | 'D';

interface ChartToolbarProps {
    symbol: string;
    timeframe: Timeframe;
    on_timeframe_change: (tf: Timeframe) => void;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '60': '1H',
    '240': '4H',
    'D': '1D',
};

const TIMEFRAMES: Timeframe[] = ['1', '5', '15', '60', '240', 'D'];

export function ChartToolbar({ symbol, timeframe, on_timeframe_change }: ChartToolbarProps) {
    return (
        <div class="flex items-center justify-between px-3 py-1.5 bg-theme-header border-b border-base-300/50">
            <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-base-content">{symbol}</span>
                <div class="flex items-center gap-0.5">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => on_timeframe_change(tf)}
                            class={`px-2 py-0.5 text-xs rounded transition-colors ${
                                timeframe === tf
                                    ? 'bg-primary text-primary-content'
                                    : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                            }`}
                        >
                            {TIMEFRAME_LABELS[tf]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export type { Timeframe };
