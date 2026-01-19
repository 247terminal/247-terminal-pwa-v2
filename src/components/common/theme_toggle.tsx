import { Moon, Sun } from 'lucide-preact';
import { current_theme, toggle_theme } from '@/hooks/use_theme';

export function ThemeToggle() {
    const is_dark = current_theme.value === 'terminal-dark';

    return (
        <button
            onClick={toggle_theme}
            class="flex items-center justify-center px-2 py-1 rounded transition-colors text-base-content/50 hover:text-base-content/70"
        >
            {is_dark ? <Moon class="w-3.5 h-3.5" /> : <Sun class="w-3.5 h-3.5" />}
        </button>
    );
}
