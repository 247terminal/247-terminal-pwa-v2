import { settings, set_setting } from '@/stores/settings_store';

interface ToggleProps {
    label: string;
    checked: boolean;
    on_change: (checked: boolean) => void;
}

function Toggle({ label, checked, on_change }: ToggleProps) {
    return (
        <label class="flex items-center cursor-pointer">
            <span class="w-1/4 text-xs text-base-content/70">{label}</span>
            <div class="w-3/4 flex justify-end">
                <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={checked}
                    onChange={(e) => on_change((e.target as HTMLInputElement).checked)}
                />
            </div>
        </label>
    );
}

interface ToggleWithSliderProps {
    label: string;
    checked: boolean;
    on_toggle: (checked: boolean) => void;
    value: number;
    on_value_change: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
}

function ToggleWithSlider({ label, checked, on_toggle, value, on_value_change, min, max, step = 1, suffix }: ToggleWithSliderProps) {
    return (
        <div class="flex items-center">
            <span class="w-1/4 text-xs text-base-content/70">{label}</span>
            <div class="w-3/4 flex items-center justify-end gap-2">
                {checked && (
                    <>
                        <input
                            type="range"
                            class="range range-xs range-primary flex-1"
                            value={value}
                            min={min}
                            max={max}
                            step={step}
                            onInput={(e) => on_value_change(Number((e.target as HTMLInputElement).value))}
                        />
                        <span class="text-xs w-10 text-right tabular-nums text-base-content">
                            {value}{suffix}
                        </span>
                    </>
                )}
                <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-primary"
                    checked={checked}
                    onChange={(e) => on_toggle((e.target as HTMLInputElement).checked)}
                />
            </div>
        </div>
    );
}

const SLIPPAGE_OPTIONS = [
    { value: 'MARKET', label: 'Market' },
    { value: 1, label: '1%' },
    { value: 2, label: '2%' },
    { value: 3, label: '3%' },
    { value: 5, label: '5%' },
] as const;

export function TradingSection() {
    const trading = settings.value.trading;

    return (
        <div class="space-y-4">
            <div class="flex items-center">
                <span class="w-1/4 text-xs text-base-content/70">Slippage</span>
                <div class="w-3/4 flex gap-2">
                    {SLIPPAGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                const slippage = opt.value === 'MARKET' ? 'MARKET' : Number(opt.value);
                                set_setting('trading', 'slippage', slippage);
                            }}
                            class={`flex-1 h-7 rounded text-xs font-medium transition-colors border ${
                                trading.slippage === opt.value
                                    ? 'bg-primary text-primary-content border-primary'
                                    : 'bg-transparent text-base-content/60 border-primary/30 hover:border-primary/50 hover:text-base-content'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <ToggleWithSlider
                label="Auto Take Profit"
                checked={trading.auto_tp_enabled}
                on_toggle={(checked) => set_setting('trading', 'auto_tp_enabled', checked)}
                value={trading.auto_tp_value}
                on_value_change={(value) => set_setting('trading', 'auto_tp_value', value)}
                min={1}
                max={100}
                step={1}
                suffix="%"
            />

            <ToggleWithSlider
                label="Auto Stop Loss"
                checked={trading.auto_sl_enabled}
                on_toggle={(checked) => set_setting('trading', 'auto_sl_enabled', checked)}
                value={trading.auto_sl_value}
                on_value_change={(value) => set_setting('trading', 'auto_sl_value', value)}
                min={1}
                max={100}
                step={1}
                suffix="%"
            />

            <Toggle
                label="Limit orders"
                checked={trading.auto_tp_limit}
                on_change={(checked) => set_setting('trading', 'auto_tp_limit', checked)}
            />

            <Toggle
                label="Unique shortcuts"
                checked={trading.unique_shortcuts}
                on_change={(checked) => set_setting('trading', 'unique_shortcuts', checked)}
            />
        </div>
    );
}
