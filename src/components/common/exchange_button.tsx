import type { ComponentChildren } from 'preact';

interface ExchangeButtonProps {
    connected: boolean;
    is_selected?: boolean;
    on_click?: () => void;
    children: ComponentChildren;
}

export function ExchangeButton({ connected, is_selected, on_click, children }: ExchangeButtonProps) {
    const base_classes = 'flex items-center justify-center px-2 py-1.5 rounded transition-colors';

    const state_classes = connected
        ? 'text-error hover:text-error/80'
        : 'text-base-content/25 hover:text-base-content/40';

    const selected_classes = is_selected ? 'bg-error/10' : '';

    function handle_mousedown(e: MouseEvent): void {
        e.stopPropagation();
    }

    return (
        <button
            type="button"
            onMouseDown={handle_mousedown}
            onClick={on_click}
            class={`${base_classes} ${state_classes} ${selected_classes}`}
        >
            {children}
        </button>
    );
}
