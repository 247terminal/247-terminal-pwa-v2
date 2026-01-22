import { useState, useCallback, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { EmaSettingsPanelProps } from '../../types/chart.types';
import { EMA_CONSTANTS, COLOR_PALETTE_CONSTANTS } from '../../config/chart.constants';
import { parse_color, rgb_to_hex, format_color, hsv_to_rgb } from '../../utils/color';

const SATURATED_ROW = COLOR_PALETTE_CONSTANTS.COLOR_HUES.map((hue) => {
    const [r, g, b] = hsv_to_rgb(hue, 1, 0.85);
    return rgb_to_hex(r, g, b);
});

export const EmaSettingsPanel = memo(function EmaSettingsPanel({
    ref_,
    settings,
    on_period_change,
    on_line_width_change,
    on_color_change,
}: EmaSettingsPanelProps) {
    const [opacity, set_opacity] = useState(() => {
        const parsed = parse_color(settings.color);
        return parsed ? parsed.a : 1;
    });

    const current_color = useMemo(() => {
        const parsed = parse_color(settings.color);
        return parsed ? rgb_to_hex(parsed.r, parsed.g, parsed.b) : settings.color;
    }, [settings.color]);

    const handle_color_click = useCallback(
        (hex: string) => {
            const parsed = parse_color(hex);
            if (parsed) {
                on_color_change(format_color(parsed.r, parsed.g, parsed.b, opacity));
            }
        },
        [opacity, on_color_change]
    );

    const handle_opacity_change = useCallback(
        (e: Event) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            set_opacity(val);
            const parsed = parse_color(current_color);
            if (parsed) {
                on_color_change(format_color(parsed.r, parsed.g, parsed.b, val));
            }
        },
        [current_color, on_color_change]
    );

    const handle_opacity_input = useCallback(
        (e: Event) => {
            const input = (e.target as HTMLInputElement).value.replace('%', '');
            const val = Math.max(0, Math.min(100, parseInt(input, 10) || 0)) / 100;
            set_opacity(val);
            const parsed = parse_color(current_color);
            if (parsed) {
                on_color_change(format_color(parsed.r, parsed.g, parsed.b, val));
            }
        },
        [current_color, on_color_change]
    );

    return (
        <div
            ref={ref_}
            class="absolute top-0 left-full ml-2 bg-base-100 rounded-lg p-3 shadow-xl border border-base-content/10 z-40"
        >
            <div class="text-xs font-medium text-base-content mb-3">EMA Settings</div>
            <div class="space-y-3">
                <div>
                    <label class="text-xs text-base-content/60 mb-1 block">Period</label>
                    <div class="flex gap-1 mb-1.5">
                        {EMA_CONSTANTS.PERIOD_PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() =>
                                    on_period_change({
                                        target: { value: String(p) },
                                    } as unknown as Event)
                                }
                                class={`flex-1 py-1 text-xs rounded transition-colors ${
                                    settings.period === p
                                        ? 'bg-primary text-primary-content'
                                        : 'bg-base-200 hover:bg-base-300 text-base-content'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <input
                        type="number"
                        min="1"
                        max="500"
                        value={settings.period}
                        onInput={on_period_change}
                        class="w-full bg-base-200 text-base-content text-xs px-2 py-1.5 rounded border-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div>
                    <label class="text-xs text-base-content/60 mb-1 block">Width</label>
                    <div class="flex gap-1">
                        {EMA_CONSTANTS.LINE_WIDTH_OPTIONS.map((w) => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => on_line_width_change(w)}
                                class={`flex-1 py-1 text-xs rounded transition-colors ${
                                    settings.line_width === w
                                        ? 'bg-primary text-primary-content'
                                        : 'bg-base-200 hover:bg-base-300 text-base-content'
                                }`}
                            >
                                {w}px
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label class="text-xs text-base-content/60 mb-1 block">Color</label>
                    <div class="space-y-1 mb-2">
                        <div class="flex gap-1">
                            {COLOR_PALETTE_CONSTANTS.GRAYSCALE_ROW.map((hex) => (
                                <button
                                    key={hex}
                                    type="button"
                                    onClick={() => handle_color_click(hex)}
                                    class={`w-5 h-5 rounded-sm transition-transform hover:scale-110 ${
                                        current_color.toLowerCase() === hex.toLowerCase()
                                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100'
                                            : ''
                                    }`}
                                    style={{
                                        backgroundColor: hex,
                                        border:
                                            hex === '#ffffff'
                                                ? '1px solid rgba(0,0,0,0.1)'
                                                : 'none',
                                    }}
                                />
                            ))}
                        </div>
                        <div class="flex gap-1">
                            {SATURATED_ROW.map((hex) => (
                                <button
                                    key={hex}
                                    type="button"
                                    onClick={() => handle_color_click(hex)}
                                    class={`w-5 h-5 rounded-sm transition-transform hover:scale-110 ${
                                        current_color.toLowerCase() === hex.toLowerCase()
                                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100'
                                            : ''
                                    }`}
                                    style={{ backgroundColor: hex }}
                                />
                            ))}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="relative flex-1 h-3 flex items-center">
                            <div
                                class="absolute inset-0 rounded-full overflow-hidden"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                    backgroundSize: '6px 6px',
                                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                                }}
                            >
                                <div
                                    class="absolute inset-0"
                                    style={{
                                        background: `linear-gradient(to right, transparent, ${current_color})`,
                                    }}
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={opacity}
                                onInput={handle_opacity_change}
                                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div
                                class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-base-content/20 shadow-sm pointer-events-none"
                                style={{ left: `calc(${opacity * 100}% - ${opacity * 12}px)` }}
                            />
                        </div>
                        <input
                            type="text"
                            value={`${Math.round(opacity * 100)}%`}
                            onInput={handle_opacity_input}
                            class="w-12 bg-base-200 text-base-content text-xs px-1.5 py-1 rounded border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-center"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});
