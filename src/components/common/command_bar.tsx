import { useState, useRef, useEffect } from 'preact/hooks';
import { Icon } from './icon';

interface CommandBarProps {
    on_submit?: (command: string) => void;
}

export function CommandBar({ on_submit }: CommandBarProps) {
    const [value, set_value] = useState('');
    const input_ref = useRef<HTMLInputElement>(null);
    const is_mac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                input_ref.current?.focus();
            }
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, []);

    const handle_submit = (e: Event) => {
        e.preventDefault();
        if (value.trim()) {
            on_submit?.(value.trim());
            set_value('');
        }
    };

    return (
        <form onSubmit={handle_submit} class="flex items-center gap-1 px-2 py-1 bg-base-100 border border-base-300 rounded text-xs min-w-[280px] focus-within:border-primary transition-colors">
            <Icon class="w-5 h-5" />
            <input
                ref={input_ref}
                type="text"
                value={value}
                placeholder="TERMINAL"
                onInput={(e) => set_value((e.target as HTMLInputElement).value)}
                class="flex-1 bg-transparent outline-none text-base-content placeholder:text-base-content/50 placeholder:font-bold"
            />
            {!value && (
                <kbd class="px-1.5 py-0.5 bg-base-300 rounded text-xs text-base-content/50 inline-flex items-center gap-1">{is_mac ? '⌘' : 'Ctrl'}<span class="text-[10px]">K</span></kbd>
            )}
        </form>
    );
}
