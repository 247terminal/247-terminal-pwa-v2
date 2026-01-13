import { useState } from 'preact/hooks';
import { TradingChart } from '../chart/trading_chart';
import { ChartToolbar, type Timeframe } from '../chart/chart_toolbar';

interface ChartBlockProps {
    on_remove?: () => void;
}

export function ChartBlock({ on_remove }: ChartBlockProps) {
    const [timeframe, set_timeframe] = useState<Timeframe>('1');

    return (
        <div class="h-full flex flex-col group">
            <div class="flex items-center justify-between bg-theme-header border-b border-base-300/50 relative z-10">
                <ChartToolbar
                    symbol="BTCUSDT"
                    timeframe={timeframe}
                    on_timeframe_change={set_timeframe}
                />
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="px-3 text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <div class="flex-1 relative min-h-0 overflow-hidden">
                <TradingChart />
            </div>
        </div>
    );
}
