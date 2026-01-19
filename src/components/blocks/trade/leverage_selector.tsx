import { useState, useCallback } from 'preact/hooks';
import { selected_leverage, max_leverage, set_leverage } from '../../../stores/trade_store';

const PRESET_LEVERAGES = [1, 5, 10, 25, 50];

export function LeverageSelector() {
    const [open, set_open] = useState(false);
    const leverage = selected_leverage.value;
    const max = max_leverage.value;

    const handle_slider = useCallback((e: Event) => {
        const input = e.target as HTMLInputElement;
        set_leverage(parseInt(input.value, 10));
    }, []);

    const handle_preset = useCallback((value: number) => {
        set_leverage(value);
    }, []);

    const available_presets = PRESET_LEVERAGES.filter((p) => p <= max);

    return (
        <div class="relative">
            <button
                type="button"
                onClick={() => set_open(!open)}
                class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-300 hover:bg-base-content/10 transition-colors"
            >
                <span class="font-medium text-base-content">{leverage}x</span>
            </button>
            {open && (
                <>
                    <div
                        class="fixed inset-0 z-40 no-drag cursor-default"
                        onClick={() => set_open(false)}
                    />
                    <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 w-52 p-2 no-drag cursor-default">
                        <div class="flex items-center justify-between mb-2 text-xs">
                            <span class="text-base-content/50">1x</span>
                            <span class="font-medium text-base-content">{leverage}x</span>
                            <span class="text-base-content/50">{max}x</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={max}
                            value={leverage}
                            onInput={handle_slider}
                            class="range range-xs range-primary w-full mb-2"
                        />
                        <div class="grid grid-cols-5 gap-1">
                            {available_presets.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handle_preset(p)}
                                    class={`py-1 text-[10px] rounded transition-colors ${
                                        leverage === p
                                            ? 'bg-primary text-primary-content'
                                            : 'bg-base-300 text-base-content/70 hover:text-base-content'
                                    }`}
                                >
                                    {p}x
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
