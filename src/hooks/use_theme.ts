import { signal, effect } from '@preact/signals';

type Theme = 'terminal-dark' | 'terminal-light';

const STORAGE_KEY = '247-terminal-theme';

function get_initial_theme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored) return stored;

    const prefers_light = window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefers_light ? 'terminal-light' : 'terminal-dark';
}

export const current_theme = signal<Theme>(get_initial_theme());

effect(() => {
    document.documentElement.setAttribute('data-theme', current_theme.value);
    localStorage.setItem(STORAGE_KEY, current_theme.value);
});

export function toggle_theme() {
    current_theme.value =
        current_theme.value === 'terminal-dark' ? 'terminal-light' : 'terminal-dark';
}

export function set_theme(theme: Theme) {
    current_theme.value = theme;
}
