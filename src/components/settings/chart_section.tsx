import { settings, set_setting } from '@/stores/settings_store';
import { TIMEFRAME_OPTIONS } from '@/services/settings/settings.constants';
import type { ToggleProps, ColorInputProps } from '@/types/settings.types';

function Toggle({ label, checked, on_change }: ToggleProps) {
    return (
        <label class="flex items-center justify-between cursor-pointer">
            <span class="text-xs text-base-content/70 uppercase">{label}</span>
            <input
                type="checkbox"
                class="toggle toggle-xs toggle-primary"
                checked={checked}
                onChange={(e) => on_change((e.target as HTMLInputElement).checked)}
            />
        </label>
    );
}

function ColorInput({ label, value, on_change }: ColorInputProps) {
    return (
        <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70 uppercase">{label}</span>
            <div class="flex items-center gap-2">
                <input
                    type="color"
                    class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    value={value}
                    onInput={(e) => on_change((e.target as HTMLInputElement).value)}
                />
                <input
                    type="text"
                    class="w-20 bg-base-300 px-2 py-1 rounded text-xs text-base-content uppercase outline-none"
                    value={value}
                    onInput={(e) => on_change((e.target as HTMLInputElement).value)}
                />
            </div>
        </div>
    );
}

export function ChartSection() {
    const chart = settings.value.chart;

    return (
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs text-base-content/70 uppercase">Default timeframe</span>
                <select
                    class="bg-base-300 px-2 py-1 rounded text-xs text-base-content outline-none"
                    value={chart.default_timeframe}
                    onChange={(e) =>
                        set_setting(
                            'chart',
                            'default_timeframe',
                            (e.target as HTMLSelectElement).value
                        )
                    }
                >
                    {TIMEFRAME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <Toggle
                label="Show order history on chart"
                checked={chart.order_history}
                on_change={(checked) => set_setting('chart', 'order_history', checked)}
            />

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">CANDLE COLORS</span>
                <ColorInput
                    label="Up candle"
                    value={chart.up_candle_color}
                    on_change={(value) => set_setting('chart', 'up_candle_color', value)}
                />
                <ColorInput
                    label="Down candle"
                    value={chart.down_candle_color}
                    on_change={(value) => set_setting('chart', 'down_candle_color', value)}
                />
            </div>

            <div class="pt-2 border-t border-base-300 space-y-2">
                <span class="text-xs font-medium text-base-content/50">FAVORITE TICKERS</span>
                <div class="flex flex-wrap gap-1">
                    {chart.favorite_tickers.length === 0 ? (
                        <span class="text-xs text-base-content/40">No favorites saved</span>
                    ) : (
                        chart.favorite_tickers.map((ticker) => (
                            <span
                                key={ticker}
                                class="px-2 py-0.5 bg-base-300 rounded text-xs text-base-content"
                            >
                                {ticker}
                            </span>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
