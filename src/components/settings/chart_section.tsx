import { useState, useRef, useEffect } from 'preact/hooks';
import { settings, set_setting } from '@/stores/settings_store';
import { TIMEFRAME_OPTIONS } from '@/services/settings/settings.constants';

const GREEN_PRESETS = ['#0B3D0B', '#228B22', '#32CD32', '#57D657', '#7FE57F', '#A8F0A8'] as const;

const RED_PRESETS = ['#5C0A0A', '#8B1A1A', '#B22222', '#DC3545', '#E85C5C', '#F08080'] as const;

interface CandleColorPickerProps {
    label: string;
    value: string;
    presets: readonly string[];
    on_change: (value: string) => void;
}

function CandleColorPicker({ label, value, presets, on_change }: CandleColorPickerProps) {
    const [is_open, set_is_open] = useState(false);
    const [hex_input, set_hex_input] = useState(value);
    const picker_ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        set_hex_input(value);
    }, [value]);

    useEffect(() => {
        if (!is_open) return;

        function handle_click_outside(e: MouseEvent) {
            if (picker_ref.current && !picker_ref.current.contains(e.target as Node)) {
                set_is_open(false);
            }
        }

        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, [is_open]);

    function handle_hex_apply() {
        let hex = hex_input.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            on_change(hex.toUpperCase());
        } else {
            set_hex_input(value);
        }
    }

    return (
        <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70 uppercase">{label}</span>
            <div class="relative" ref={picker_ref}>
                <button
                    type="button"
                    class="w-6 h-6 rounded border border-base-content/20 cursor-pointer"
                    style={{ backgroundColor: value }}
                    onClick={() => set_is_open(!is_open)}
                />
                {is_open && (
                    <div class="absolute top-full right-0 mt-2 p-2 bg-base-200 rounded-lg shadow-lg z-50 w-28">
                        <div class="grid grid-cols-3 gap-1.5 mb-2">
                            {presets.map((color) => (
                                <button
                                    type="button"
                                    key={color}
                                    class={`w-7 h-7 rounded border-2 transition-transform hover:scale-110 ${
                                        value.toUpperCase() === color.toUpperCase()
                                            ? 'border-white'
                                            : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        on_change(color);
                                        set_is_open(false);
                                    }}
                                />
                            ))}
                        </div>
                        <input
                            type="text"
                            class="w-full bg-base-300 px-2 py-1 rounded text-xs text-base-content uppercase outline-none"
                            value={hex_input}
                            onInput={(e) => set_hex_input((e.target as HTMLInputElement).value)}
                            onBlur={handle_hex_apply}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handle_hex_apply();
                                    set_is_open(false);
                                }
                            }}
                            placeholder="#000000"
                        />
                    </div>
                )}
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

            <div class="space-y-3">
                <CandleColorPicker
                    label="Up candle"
                    value={chart.up_candle_color}
                    presets={GREEN_PRESETS}
                    on_change={(value) => set_setting('chart', 'up_candle_color', value)}
                />
                <CandleColorPicker
                    label="Down candle"
                    value={chart.down_candle_color}
                    presets={RED_PRESETS}
                    on_change={(value) => set_setting('chart', 'down_candle_color', value)}
                />
            </div>
        </div>
    );
}
