import { Settings } from 'lucide-preact';

interface SettingsButtonProps {
    on_click?: () => void;
    is_active?: boolean;
}

export function SettingsButton({ on_click, is_active = false }: SettingsButtonProps) {
    return (
        <button
            type="button"
            onClick={on_click}
            class={`p-1.5 rounded transition-colors ${
                is_active
                    ? 'bg-primary/10 text-primary'
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
            }`}
        >
            <Settings class="w-3.5 h-3.5" />
        </button>
    );
}
