const RGBA_REGEX = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/;
const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export function parse_color(color: string): RGBA | null {
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

export function rgb_to_hex(r: number, g: number, b: number): string {
    const rh = r.toString(16).padStart(2, '0');
    const gh = g.toString(16).padStart(2, '0');
    const bh = b.toString(16).padStart(2, '0');
    return '#' + rh + gh + bh;
}

export function format_color(r: number, g: number, b: number, a: number): string {
    if (a >= 1) return rgb_to_hex(r, g, b);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export function rgb_to_hsv(r: number, g: number, b: number): [number, number, number] {
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

export function hsv_to_rgb(h: number, s: number, v: number): [number, number, number] {
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
