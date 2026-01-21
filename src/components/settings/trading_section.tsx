import { settings, set_setting, update_settings } from '@/stores/settings_store';
import type { TradingSettings } from '@/types/settings.types';

interface ToggleProps {
    label: string;
    checked: boolean;
    on_change: (checked: boolean) => void;
}

function Toggle({ label, checked, on_change }: ToggleProps) {
    return (
        <label class="flex items-center justify-between cursor-pointer">
            <span class="text-xs text-base-content/70">{label}</span>
            <input
                type="checkbox"
                class="toggle toggle-xs toggle-primary"
                checked={checked}
                onChange={(e) => on_change((e.target as HTMLInputElement).checked)}
            />
        </label>
    );
}

interface NumberInputProps {
    label: string;
    value: number;
    on_change: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}

function NumberInput({ label, value, on_change, min, max, step = 1, suffix }: NumberInputProps) {
    return (
        <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70">{label}</span>
            <div class="flex items-center gap-1">
                <input
                    type="number"
                    class="w-20 bg-base-300 px-2 py-1 rounded text-xs text-base-content text-right outline-none"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onInput={(e) => on_change(Number((e.target as HTMLInputElement).value))}
                />
                {suffix && <span class="text-xs text-base-content/50">{suffix}</span>}
            </div>
        </div>
    );
}

const SLIPPAGE_OPTIONS = [
    { value: 1, label: '1%' },
    { value: 2, label: '2%' },
    { value: 3, label: '3%' },
    { value: 5, label: '5%' },
    { value: 'MARKET', label: 'Market' },
] as const;

const SIZE_COUNT_OPTIONS = [1, 2, 3, 4] as const;

export function TradingSection() {
    const trading = settings.value.trading;

    function update_size(index: number, value: number): void {
        const new_sizes = [...trading.sizes] as TradingSettings['sizes'];
        new_sizes[index] = value;
        update_settings('trading', { sizes: new_sizes });
    }

    return (
        <div class="space-y-4">
            <div class="space-y-2">
                <span class="text-xs font-medium text-base-content/50">POSITION SIZES (USDT)</span>
                <div class="grid grid-cols-2 gap-2">
                    {trading.sizes.map((size, index) => (
                        <div key={index} class="flex items-center gap-2">
                            <span class="text-xs text-base-content/40 w-4">{index + 1}.</span>
                            <input
                                type="number"
                                class="flex-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                                value={size}
                                min={1}
                                onInput={(e) =>
                                    update_size(index, Number((e.target as HTMLInputElement).value))
                                }
                                disabled={index >= trading.size_count}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div class="flex items-center justify-between">
                <span class="text-xs text-base-content/70">Active size buttons</span>
                <div class="flex gap-1">
                    {SIZE_COUNT_OPTIONS.map((count) => (
                        <button
                            key={count}
                            type="button"
                            onClick={() => set_setting('trading', 'size_count', count)}
                            class={`w-6 h-6 rounded text-xs transition-colors ${
                                trading.size_count === count
                                    ? 'bg-primary text-primary-content'
                                    : 'bg-base-300 text-base-content/60 hover:bg-base-200'
                            }`}
                        >
                            {count}
                        </button>
                    ))}
                </div>
            </div>

            <div class="flex items-center justify-between">
                <span class="text-xs text-base-content/70">Slippage</span>
                <select
                    class="bg-base-300 px-2 py-1 rounded text-xs text-base-content outline-none"
                    value={trading.slippage}
                    onChange={(e) => {
                        const val = (e.target as HTMLSelectElement).value;
                        const slippage = val === 'MARKET' ? 'MARKET' : Number(val);
                        set_setting('trading', 'slippage', slippage);
                    }}
                >
                    {SLIPPAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">AUTO TAKE PROFIT</span>
                <Toggle
                    label="Enable auto TP"
                    checked={trading.auto_tp_enabled}
                    on_change={(checked) => set_setting('trading', 'auto_tp_enabled', checked)}
                />
                {trading.auto_tp_enabled && (
                    <>
                        <NumberInput
                            label="TP percentage"
                            value={trading.auto_tp_value}
                            on_change={(value) => set_setting('trading', 'auto_tp_value', value)}
                            min={0.1}
                            max={100}
                            step={0.1}
                            suffix="%"
                        />
                        <Toggle
                            label="Use limit orders"
                            checked={trading.auto_tp_limit}
                            on_change={(checked) => set_setting('trading', 'auto_tp_limit', checked)}
                        />
                    </>
                )}
            </div>

            <div class="pt-2 border-t border-base-300 space-y-3">
                <span class="text-xs font-medium text-base-content/50">AUTO STOP LOSS</span>
                <Toggle
                    label="Enable auto SL"
                    checked={trading.auto_sl_enabled}
                    on_change={(checked) => set_setting('trading', 'auto_sl_enabled', checked)}
                />
                {trading.auto_sl_enabled && (
                    <NumberInput
                        label="SL percentage"
                        value={trading.auto_sl_value}
                        on_change={(value) => set_setting('trading', 'auto_sl_value', value)}
                        min={0.1}
                        max={100}
                        step={0.1}
                        suffix="%"
                    />
                )}
            </div>

            <div class="pt-2 border-t border-base-300">
                <Toggle
                    label="Unique coin shortcuts"
                    checked={trading.unique_shortcuts}
                    on_change={(checked) => set_setting('trading', 'unique_shortcuts', checked)}
                />
            </div>
        </div>
    );
}
