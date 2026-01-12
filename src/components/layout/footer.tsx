import { ThemeToggle } from '../common/theme_toggle';

export function Footer() {
    return (
        <footer class="h-8 bg-base-200 border-t border-base-300 flex items-center px-4 shrink-0">
            <span class="text-xs text-base-content/50">v2.0.0</span>
            <div class="ml-auto flex items-center gap-4 text-xs text-base-content/50">
                <span>Latency: 24ms</span>
                <div class="scale-75">
                    <ThemeToggle />
                </div>
            </div>
        </footer>
    );
}
