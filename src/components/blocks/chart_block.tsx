import { useState } from 'preact/hooks';
import { TradingChart } from '../chart/trading_chart';
import type { Timeframe } from '../chart/chart_toolbar';

interface ChartBlockProps {
    on_remove?: () => void;
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

export function ChartBlock({ on_remove }: ChartBlockProps) {
    const [timeframe, set_timeframe] = useState<Timeframe>('15');

    return (
        <div class="h-full flex flex-col group">
            <div class="flex items-center justify-between px-3 py-1.5 bg-theme-header border-b border-base-300/50">
                <div class="flex items-center gap-3">
                    <span class="text-sm font-medium text-base-content">BTCUSDT</span>
                    <div class="flex items-center gap-0.5">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                onClick={() => set_timeframe(tf)}
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
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <div class="flex-1 relative min-h-0">
                <TradingChart />
            </div>
        </div>
    );
}
