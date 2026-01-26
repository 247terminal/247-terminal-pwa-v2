import type { ThemeColors } from '../types/chart.types';

export const THEME_COLORS = {
    GREEN: '#25B28E',
    RED: '#CC3E50',
} as const;

let theme_colors_cache: ThemeColors | null = null;
let theme_cache_key: string | null = null;

export function get_css_variable(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function get_theme_colors(force_refresh = false): ThemeColors {
    const current_theme = document.documentElement.getAttribute('data-theme');

    if (!force_refresh && theme_colors_cache && theme_cache_key === current_theme) {
        return theme_colors_cache;
    }

    const is_dark = current_theme === 'terminal-dark';
    const base_content = get_css_variable('--color-base-content');
    const base_300 = get_css_variable('--color-base-300');
    const success = get_css_variable('--color-success');
    const error = get_css_variable('--color-error');

    theme_colors_cache = {
        background: is_dark ? '#121215' : '#ffffff',
        text: base_content || '#fafafa',
        grid: base_300
            ? `color-mix(in oklch, ${base_300}, transparent 50%)`
            : 'rgba(40, 41, 45, 0.5)',
        up: success || THEME_COLORS.GREEN,
        down: error || THEME_COLORS.RED,
    };
    theme_cache_key = current_theme;

    return theme_colors_cache;
}
