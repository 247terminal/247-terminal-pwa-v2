import type { ComponentChildren } from 'preact';

type IconButtonVariant = 'primary' | 'ghost';

interface IconButtonProps {
    variant?: IconButtonVariant;
    on_click?: () => void;
    children: ComponentChildren;
    class_name?: string;
}

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
    primary: 'bg-primary/10 text-primary/60 hover:bg-primary/20 hover:text-primary/80',
    ghost: 'text-base-content/50 hover:text-base-content/70',
};

export function IconButton({ variant = 'primary', on_click, children, class_name = '' }: IconButtonProps) {
    return (
        <button
            onClick={on_click}
            class={`flex items-center justify-center px-2 py-1 rounded transition-colors ${VARIANT_STYLES[variant]} ${class_name}`}
        >
            {children}
        </button>
    );
}
