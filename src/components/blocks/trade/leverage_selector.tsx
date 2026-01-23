import { useState, useCallback, useEffect, useMemo } from 'preact/hooks';
import { selected_leverage, max_leverage, set_leverage } from '../../../stores/trade_store';

function get_presets(max: number): number[] {
    if (max < 10) return [1, 3, 5, 7, max].filter((v, i, a) => v <= max && a.indexOf(v) === i);
    if (max < 15) return [1, 3, 5, 10, max].filter((v, i, a) => v <= max && a.indexOf(v) === i);
    return [1, 5, 10, 15, 20].filter((v) => v <= max);
}

export function LeverageSelector() {
    const [open, set_open] = useState(false);
    const leverage = selected_leverage.value;
    const max = max_leverage.value;
    const [slider_value, set_slider_value] = useState(leverage);

    useEffect(() => {
        set_slider_value(leverage);
    }, [leverage]);

    const handle_slider_input = useCallback((e: Event) => {
        const input = e.target as HTMLInputElement;
        set_slider_value(parseInt(input.value, 10));
    }, []);

    const handle_slider_release = useCallback(
        (e: Event) => {
            const input = e.target as HTMLInputElement;
            const value = parseInt(input.value, 10);
            if (value !== leverage) {
                set_leverage(value);
            }
        },
        [leverage]
    );

    const handle_preset = useCallback((value: number) => {
        set_leverage(value);
    }, []);

    const available_presets = useMemo(() => get_presets(max), [max]);

    return (
        <div class="relative">
            <button
                type="button"
                onClick={() => set_open(!open)}
                class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 transition-colors"
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
                            <span class="font-medium text-base-content">{slider_value}x</span>
                            <span class="text-base-content/50">{max}x</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={max}
                            value={slider_value}
                            onInput={handle_slider_input}
                            onMouseUp={handle_slider_release}
                            onTouchEnd={handle_slider_release}
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
                                            : 'bg-base-200 text-base-content/70 hover:text-base-content hover:bg-base-300'
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
