import { useState, useCallback, useEffect } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { ColorPickerProps } from '../../types/drawing.types';
import { COLOR_PALETTE_CONSTANTS } from '../../config/chart.constants';
import { parse_color, rgb_to_hex, format_color, hsv_to_rgb } from '../../utils/color';

function generate_color_rows(): string[][] {
    const rows: string[][] = [];
    const saturations = [1, 0.5, 0.6, 0.7, 0.5, 0.4];
    const values = [1, 0.9, 0.85, 0.8, 0.95, 0.95];
    const saturation_mods = [1, 0.3, 0.4, 0.5, 0.25, 0.15];

    for (let row = 0; row < 6; row++) {
        const row_colors: string[] = [];
        for (const hue of COLOR_PALETTE_CONSTANTS.COLOR_HUES) {
            const s = saturations[row] * saturation_mods[row] + (1 - saturation_mods[row]) * 0.8;
            const v = values[row];
            const actual_s = row === 0 ? 1 : Math.min(1, s * (1 - row * 0.1));
            const actual_v = row === 0 ? 0.85 : Math.min(1, v + row * 0.02);
            const [r, g, b] = hsv_to_rgb(hue, actual_s, actual_v);
            row_colors.push(rgb_to_hex(r, g, b));
        }
        rows.push(row_colors);
    }
    return rows;
}

const COLOR_PALETTE = [COLOR_PALETTE_CONSTANTS.GRAYSCALE_ROW, ...generate_color_rows()];

export const ColorPicker = memo(function ColorPicker({ color, on_change }: ColorPickerProps) {
    const [opacity, set_opacity] = useState(1);
    const [current_color, set_current_color] = useState(color);

    useEffect(() => {
        const parsed = parse_color(color);
        if (parsed) {
            set_opacity(parsed.a);
            set_current_color(rgb_to_hex(parsed.r, parsed.g, parsed.b));
        }
    }, [color]);

    const handle_color_click = useCallback(
        (hex: string) => {
            set_current_color(hex);
            const parsed = parse_color(hex);
            if (parsed) {
                on_change(format_color(parsed.r, parsed.g, parsed.b, opacity));
            }
        },
        [opacity, on_change]
    );

    const handle_opacity_change = useCallback(
        (e: Event) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            set_opacity(val);
            const parsed = parse_color(current_color);
            if (parsed) {
                on_change(format_color(parsed.r, parsed.g, parsed.b, val));
            }
        },
        [current_color, on_change]
    );

    const handle_opacity_input = useCallback(
        (e: Event) => {
            const input = (e.target as HTMLInputElement).value.replace('%', '');
            const val = Math.max(0, Math.min(100, parseInt(input, 10) || 0)) / 100;
            set_opacity(val);
            const parsed = parse_color(current_color);
            if (parsed) {
                on_change(format_color(parsed.r, parsed.g, parsed.b, val));
            }
        },
        [current_color, on_change]
    );

    return (
        <div
            class="bg-base-100 rounded-xl p-3 shadow-2xl border border-base-content/10"
            style={{ width: '260px' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div class="space-y-1 mb-3">
                {COLOR_PALETTE.map((row, row_idx) => (
                    <div key={row_idx} class="flex gap-1">
                        {row.map((hex) => (
                            <button
                                key={hex + row_idx}
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
                                        hex === '#ffffff' ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div class="border-t border-base-content/10 pt-3">
                <div class="text-xs text-base-content/60 mb-1.5">Opacity</div>
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
    );
});
