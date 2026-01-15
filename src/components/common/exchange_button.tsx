import type { ComponentChildren } from 'preact';

interface ExchangeButtonProps {
    connected: boolean;
    on_click?: () => void;
    children: ComponentChildren;
}

export function ExchangeButton({ connected, on_click, children }: ExchangeButtonProps) {
    return (
        <button
            onClick={on_click}
            class={`flex items-center justify-center px-1 py-0 rounded transition-colors ${
                connected
                    ? 'text-error hover:text-error/80'
                    : 'text-base-content/25 hover:text-base-content/40'
            }`}
        >
            {children}
        </button>
    );
}
