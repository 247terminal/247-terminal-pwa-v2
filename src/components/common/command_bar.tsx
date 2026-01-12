import { useState, useRef, useEffect } from 'preact/hooks';
import { Icon } from './icon';

interface Command {
    name: string;
    params: string[];
    selected?: boolean;
}

const AVAILABLE_COMMANDS: Command[] = [
    { name: 'SEARCH', params: ['[EXCHANGE]', '[TICKER]'] },
    { name: 'OPEN', params: ['[MODULE NAME]'] },
    { name: 'BUY', params: ['[SYMBOL]', '[SIZE]', '[LEV]'] },
    { name: 'SELL', params: ['[SYMBOL]', '[SIZE]', '[LEV]'] },
    { name: 'CLOSE', params: ['[SYMBOL]'] },
    { name: 'SHARE', params: ['[SYMBOL]'] },
];

interface CommandBarProps {
    on_submit?: (command: string) => void;
}

export function CommandBar({ on_submit }: CommandBarProps) {
    const [value, set_value] = useState('');
    const [is_open, set_is_open] = useState(false);
    const [selected_index, set_selected_index] = useState(0);
    const input_ref = useRef<HTMLInputElement>(null);
    const container_ref = useRef<HTMLDivElement>(null);
    const is_mac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const filtered_commands = AVAILABLE_COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().includes(value.toLowerCase()) ||
        cmd.params.some(p => p.toLowerCase().includes(value.toLowerCase()))
    );

    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                input_ref.current?.focus();
                set_is_open(true);
            }
            if (e.key === 'Escape') {
                set_is_open(false);
                input_ref.current?.blur();
            }
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, []);

    useEffect(() => {
        const handle_click_outside = (e: MouseEvent) => {
            if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
                set_is_open(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, []);

    useEffect(() => {
        set_selected_index(0);
    }, [value]);

    const handle_submit = (e: Event) => {
        e.preventDefault();
        if (value.trim()) {
            on_submit?.(value.trim());
            set_value('');
            set_is_open(false);
        }
    };

    const handle_key_nav = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            set_selected_index(prev => Math.min(prev + 1, filtered_commands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            set_selected_index(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && is_open && filtered_commands.length > 0) {
            e.preventDefault();
            const cmd = filtered_commands[selected_index];
            set_value(cmd.name + ' ');
        }
    };

    const handle_command_click = (cmd: Command) => {
        set_value(cmd.name + ' ');
        input_ref.current?.focus();
    };

    return (
        <div ref={container_ref} class="relative">
            <form onSubmit={handle_submit} class={`flex items-center gap-1 px-2 py-1 bg-base-100 border border-base-300 text-xs min-w-[360px] transition-colors ${is_open ? 'rounded-t border-primary' : 'rounded'}`}>
                <Icon class="w-5 h-5" />
                <input
                    ref={input_ref}
                    type="text"
                    value={value}
                    placeholder="TERMINAL"
                    onInput={(e) => set_value((e.target as HTMLInputElement).value)}
                    onFocus={() => set_is_open(true)}
                    onKeyDown={handle_key_nav}
                    class="flex-1 bg-transparent outline-none text-base-content placeholder:text-base-content/50 placeholder:font-bold"
                />
                {!value && (
                    <kbd class="px-1.5 py-0.5 bg-base-300 rounded text-xs text-base-content/50 inline-flex items-center gap-1">{is_mac ? '⌘' : 'Ctrl'}<span class="text-[10px]">K</span></kbd>
                )}
            </form>
            {is_open && (
                <div class="absolute top-full left-0 right-0 bg-base-100 border border-t-0 border-primary rounded-b shadow-lg z-50">
                    <div class="flex items-center justify-between px-2 py-1.5 border-b border-base-300">
                        <span class="text-[10px] text-base-content/50 tracking-wider">AVAILABLE COMMANDS</span>
                        <span class="text-[10px] text-primary">{filtered_commands.length} FOUND</span>
                    </div>
                    <div class="py-0.5">
                        {filtered_commands.map((cmd, index) => (
                            <button
                                key={cmd.name}
                                type="button"
                                onClick={() => handle_command_click(cmd)}
                                class={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-base-200 transition-colors ${index === selected_index ? 'bg-base-200' : ''}`}
                            >
                                <span class="w-14 text-center px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-medium rounded border border-primary/30">
                                    {cmd.name}
                                </span>
                                <span class="text-xs text-base-content/70 font-mono">
                                    {cmd.params.join('  ')}
                                </span>
                                {index === selected_index && (
                                    <span class="ml-auto flex items-center gap-1 text-[10px] text-base-content/50">
                                        ENTER <span class="text-primary">✓</span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
