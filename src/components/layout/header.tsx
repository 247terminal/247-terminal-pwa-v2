import { ThemeToggle } from '../common/theme_toggle';

export function Header() {
    return (
        <header class="h-10 bg-base-200 border-b border-base-300 flex items-center px-3 shrink-0">
            <img src="/logo.svg" alt="247" class="h-5 w-5 rounded self-center" />
            <div class="ml-auto scale-75">
                <ThemeToggle />
            </div>
        </header>
    );
}
