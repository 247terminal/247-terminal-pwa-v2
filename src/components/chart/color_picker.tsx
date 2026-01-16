import { useRef, useEffect, useCallback, useMemo, useReducer } from 'preact/hooks';
import type { ColorPickerProps, ColorState, ColorAction } from '../../types/drawing.types';

const RGBA_REGEX = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/;
const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

const PRESET_COLORS = [
    '#ff0000',
    '#ff8000',
    '#ffff00',
    '#80ff00',
    '#00ff00',
    '#00ff80',
    '#00ffff',
    '#0080ff',
    '#0000ff',
    '#8000ff',
    '#ff00ff',
    '#ff0080',
] as const;

const PRESET_HSV_CACHE: Map<string, [number, number, number]> = new Map();
for (const preset of PRESET_COLORS) {
    const r = parseInt(preset.slice(1, 3), 16);
    const g = parseInt(preset.slice(3, 5), 16);
    const b = parseInt(preset.slice(5, 7), 16);
    PRESET_HSV_CACHE.set(preset, rgb_to_hsv_static(r, g, b));
}

function rgb_to_hsv_static(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
                break;
            case g:
                h = ((b - r) / d + 2) * 60;
                break;
            case b:
                h = ((r - g) / d + 4) * 60;
                break;
        }
    }
    return [h, s, v];
}

function hsv_to_rgb(h: number, s: number, v: number): [number, number, number] {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0,
        g = 0,
        b = 0;

    if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
    else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
    else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
    else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
    else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function parse_color(color: string): { r: number; g: number; b: number; a: number } | null {
    const rgba_match = RGBA_REGEX.exec(color);
    if (rgba_match) {
        return {
            r: parseInt(rgba_match[1]),
            g: parseInt(rgba_match[2]),
            b: parseInt(rgba_match[3]),
            a: rgba_match[4] ? parseFloat(rgba_match[4]) : 1,
        };
    }
    const hex_match = HEX_REGEX.exec(color);
    if (hex_match) {
        return {
            r: parseInt(hex_match[1], 16),
            g: parseInt(hex_match[2], 16),
            b: parseInt(hex_match[3], 16),
            a: 1,
        };
    }
    return null;
}

function rgb_to_hex(r: number, g: number, b: number): string {
    const rh = r.toString(16).padStart(2, '0');
    const gh = g.toString(16).padStart(2, '0');
    const bh = b.toString(16).padStart(2, '0');
    return '#' + rh + gh + bh;
}

function format_color(r: number, g: number, b: number, a: number): string {
    if (a >= 1) return rgb_to_hex(r, g, b);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

function color_reducer(state: ColorState, action: ColorAction): ColorState {
    switch (action.type) {
        case 'SET_HSV':
            return {
                ...state,
                hue: action.hue,
                saturation: action.saturation,
                value: action.value,
                hex_input: action.hex_input,
            };
        case 'SET_OPACITY':
            return { ...state, opacity: action.opacity };
        case 'SET_HEX_INPUT':
            return { ...state, hex_input: action.hex_input };
        case 'SET_DRAGGING':
            return { ...state, dragging_wheel: action.dragging_wheel };
        case 'INIT':
            return {
                hue: action.hue,
                saturation: action.saturation,
                value: action.value,
                opacity: action.opacity,
                hex_input: action.hex_input,
                dragging_wheel: false,
            };
        default:
            return state;
    }
}

const WHEEL_SIZE = 160;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

export function ColorPicker({ color, on_change, on_close }: ColorPickerProps) {
    const wheel_ref = useRef<HTMLCanvasElement>(null);
    const [state, dispatch] = useReducer(color_reducer, {
        hue: 217,
        saturation: 1,
        value: 1,
        opacity: 1,
        hex_input: '#2962ff',
        dragging_wheel: false,
    });

    const { hue, saturation, value, opacity, hex_input, dragging_wheel } = state;

    useEffect(() => {
        const parsed = parse_color(color);
        if (parsed) {
            const [h, s, v] = rgb_to_hsv_static(parsed.r, parsed.g, parsed.b);
            dispatch({
                type: 'INIT',
                hue: h,
                saturation: s,
                value: v,
                opacity: parsed.a,
                hex_input: rgb_to_hex(parsed.r, parsed.g, parsed.b),
            });
        }
    }, []);

    useEffect(() => {
        const canvas = wheel_ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const size = WHEEL_SIZE * dpr;
        canvas.width = size;
        canvas.height = size;
        ctx.scale(dpr, dpr);

        for (let angle = 0; angle < 360; angle += 1) {
            const startAngle = ((angle - 1) * Math.PI) / 180;
            const endAngle = ((angle + 1) * Math.PI) / 180;

            const gradient = ctx.createRadialGradient(
                WHEEL_RADIUS,
                WHEEL_RADIUS,
                0,
                WHEEL_RADIUS,
                WHEEL_RADIUS,
                WHEEL_RADIUS
            );
            const [r1, g1, b1] = hsv_to_rgb(angle, 0, 1);
            const [r2, g2, b2] = hsv_to_rgb(angle, 1, 1);
            gradient.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
            gradient.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);

            ctx.beginPath();
            ctx.moveTo(WHEEL_RADIUS, WHEEL_RADIUS);
            ctx.arc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }, []);

    const emit_color = useCallback(
        (h: number, s: number, v: number, a: number) => {
            const [r, g, b] = hsv_to_rgb(h, s, v);
            on_change(format_color(r, g, b, a));
        },
        [on_change]
    );

    const handle_wheel_interaction = useCallback(
        (e: MouseEvent | TouchEvent) => {
            const canvas = wheel_ref.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const client_x = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const client_y = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const x = client_x - rect.left;
            const y = client_y - rect.top;

            const dx = x - WHEEL_RADIUS;
            const dy = y - WHEEL_RADIUS;
            const distance = Math.min(Math.sqrt(dx * dx + dy * dy), WHEEL_RADIUS);
            const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
            const sat = distance / WHEEL_RADIUS;

            const [r, g, b] = hsv_to_rgb(angle, sat, 1);
            const hex = rgb_to_hex(r, g, b);
            dispatch({ type: 'SET_HSV', hue: angle, saturation: sat, value: 1, hex_input: hex });
            emit_color(angle, sat, 1, opacity);
        },
        [opacity, emit_color]
    );

    const handle_wheel_mouse_down = useCallback(
        (e: MouseEvent) => {
            e.preventDefault();
            dispatch({ type: 'SET_DRAGGING', dragging_wheel: true });
            handle_wheel_interaction(e);
        },
        [handle_wheel_interaction]
    );

    useEffect(() => {
        if (!dragging_wheel) return;
        const handle_move = (e: MouseEvent) => handle_wheel_interaction(e);
        const handle_up = () => dispatch({ type: 'SET_DRAGGING', dragging_wheel: false });
        window.addEventListener('mousemove', handle_move);
        window.addEventListener('mouseup', handle_up);
        return () => {
            window.removeEventListener('mousemove', handle_move);
            window.removeEventListener('mouseup', handle_up);
        };
    }, [dragging_wheel, handle_wheel_interaction]);

    const handle_opacity_change = useCallback(
        (e: Event) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            dispatch({ type: 'SET_OPACITY', opacity: val });
            emit_color(hue, saturation, value, val);
        },
        [hue, saturation, value, emit_color]
    );

    const handle_hex_change = useCallback((e: Event) => {
        dispatch({ type: 'SET_HEX_INPUT', hex_input: (e.target as HTMLInputElement).value });
    }, []);

    const handle_hex_apply = useCallback(() => {
        let hex = hex_input.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        const parsed = parse_color(hex);
        if (parsed) {
            const [h, s, v] = rgb_to_hsv_static(parsed.r, parsed.g, parsed.b);
            dispatch({ type: 'SET_HSV', hue: h, saturation: s, value: v, hex_input: hex });
            emit_color(h, s, v, opacity);
        }
    }, [hex_input, opacity, emit_color]);

    const handle_preset_click = useCallback(
        (preset: string) => {
            const cached = PRESET_HSV_CACHE.get(preset);
            if (cached) {
                const [h, s, v] = cached;
                dispatch({ type: 'SET_HSV', hue: h, saturation: s, value: v, hex_input: preset });
                emit_color(h, s, v, opacity);
            }
        },
        [opacity, emit_color]
    );

    const handle_apply = useCallback(() => {
        on_close();
    }, [on_close]);

    const { selector_x, selector_y } = useMemo(() => {
        const angle_rad = (hue * Math.PI) / 180;
        const dist = saturation * WHEEL_RADIUS;
        return {
            selector_x: WHEEL_RADIUS + Math.cos(angle_rad) * dist,
            selector_y: WHEEL_RADIUS + Math.sin(angle_rad) * dist,
        };
    }, [hue, saturation]);

    const { preview_color, preview_hex } = useMemo(() => {
        const [r, g, b] = hsv_to_rgb(hue, saturation, value);
        return {
            preview_color: format_color(r, g, b, opacity),
            preview_hex: rgb_to_hex(r, g, b),
        };
    }, [hue, saturation, value, opacity]);

    return (
        <div
            class="ml-3 bg-base-100 rounded-xl p-3 shadow-2xl border border-base-content/10 overflow-hidden"
            style={{ width: '200px' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div class="flex items-center gap-2 mb-3">
                <div
                    class="w-7 h-7 rounded border border-base-content/10 shrink-0"
                    style={{
                        backgroundColor: preview_color,
                        backgroundImage:
                            opacity < 1
                                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                                : 'none',
                        backgroundSize: '6px 6px',
                        backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                    }}
                >
                    <div class="w-full h-full rounded" style={{ backgroundColor: preview_color }} />
                </div>
                <input
                    type="text"
                    value={hex_input}
                    onInput={handle_hex_change}
                    onBlur={handle_hex_apply}
                    onKeyDown={(e) => e.key === 'Enter' && handle_hex_apply()}
                    class="min-w-0 flex-1 bg-base-200 text-base-content text-xs px-2 py-1.5 rounded border-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    placeholder="#000000"
                />
            </div>

            <div class="flex justify-center mb-3">
                <div class="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
                    <canvas
                        ref={wheel_ref}
                        class="rounded-full cursor-crosshair"
                        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
                        onMouseDown={handle_wheel_mouse_down}
                    />
                    <div
                        class="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: selector_x,
                            top: selector_y,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.1)',
                        }}
                    />
                </div>
            </div>

            <div class="mb-3">
                <div class="flex justify-between text-xs text-base-content/60 mb-1.5 font-medium">
                    <span>Opacity</span>
                    <span>{Math.round(opacity * 100)}%</span>
                </div>
                <div class="relative h-4 flex items-center px-2">
                    <div
                        class="relative flex-1 h-2.5 rounded-full overflow-hidden"
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
                                background: `linear-gradient(to right, transparent, ${preview_hex})`,
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
                        class="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-base-content/20 shadow-md pointer-events-none"
                        style={{ left: `calc(8px + (100% - 16px) * ${opacity} - 7px)` }}
                    />
                </div>
            </div>

            <div class="mb-3">
                <div class="text-xs text-base-content/60 mb-1.5 font-medium">Colors</div>
                <div class="grid grid-cols-6 gap-1">
                    {PRESET_COLORS.map((preset) => (
                        <button
                            type="button"
                            key={preset}
                            class="w-6 h-6 rounded border border-base-content/10 hover:scale-110 transition-transform hover:border-base-content/30"
                            style={{ backgroundColor: preset }}
                            onClick={() => handle_preset_click(preset)}
                        />
                    ))}
                </div>
            </div>

            <button
                type="button"
                class="w-full py-1 rounded bg-base-200 text-base-content font-medium text-xs hover:bg-base-300 transition-colors"
                onClick={handle_apply}
            >
                Done
            </button>
        </div>
    );
}
