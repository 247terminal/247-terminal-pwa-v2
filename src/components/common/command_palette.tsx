import { useState, useEffect, useRef } from 'preact/hooks';

interface Command {
    name: string;
    params: string;
}

const COMMANDS: Command[] = [
    { name: 'SEARCH', params: '[EXCHANGE] [TICKER]' },
    { name: 'OPEN', params: '[MODULE NAME]' },
    { name: 'BUY', params: '[SYMBOL] [SIZE] [LEV]' },
    { name: 'SELL', params: '[SYMBOL] [SIZE] [LEV]' },
    { name: 'CLOSE', params: '[SYMBOL]' },
    { name: 'SHARE', params: '[SYMBOL]' },
];

interface CommandPaletteProps {
    is_open: boolean;
    on_close: () => void;
}

export function CommandPalette({ is_open, on_close }: CommandPaletteProps) {
    const [query, set_query] = useState('');
    const [selected_index, set_selected_index] = useState(0);
    const input_ref = useRef<HTMLInputElement>(null);

    const filtered_commands = COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().includes(query.toLowerCase()) ||
        cmd.params.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (is_open) {
            input_ref.current?.focus();
            set_query('');
            set_selected_index(0);
        }
    }, [is_open]);

    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (!is_open) return;

            if (e.key === 'Escape') {
                on_close();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                set_selected_index(i => Math.min(i + 1, filtered_commands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                set_selected_index(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                console.log('Execute command:', filtered_commands[selected_index]);
                on_close();
            }
        };

        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, [is_open, on_close, filtered_commands, selected_index]);

    useEffect(() => {
        set_selected_index(0);
    }, [query]);

    if (!is_open) return null;

    return (
        <div class="fixed inset-0 z-50 flex items-start justify-center pt-20">
            <div class="absolute inset-0 bg-black/50" onClick={on_close} />
            <div class="relative w-full max-w-2xl bg-base-200 border border-base-300 rounded-lg shadow-2xl overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 border-b border-base-300">
                    <svg class="w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={input_ref}
                        type="text"
                        value={query}
                        onInput={(e) => set_query((e.target as HTMLInputElement).value)}
                        placeholder="COMMAND / SEARCH..."
                        class="flex-1 bg-transparent text-base-content placeholder-base-content/50 outline-none tracking-wider"
                    />
                    <kbd class="px-2 py-1 bg-base-300 rounded text-xs text-base-content/50">ESC</kbd>
                </div>

                <div class="px-4 py-2 flex items-center justify-between text-xs tracking-wider">
                    <span class="text-base-content/50">AVAILABLE COMMANDS</span>
                    <span class="text-primary">{filtered_commands.length} FOUND</span>
                </div>

                <div class="max-h-80 overflow-y-auto">
                    {filtered_commands.map((cmd, index) => (
                        <div
                            key={cmd.name}
                            class={`flex items-center gap-4 px-4 py-2 cursor-pointer ${
                                index === selected_index ? 'bg-base-300' : 'hover:bg-base-300/50'
                            }`}
                            onClick={() => {
                                console.log('Execute command:', cmd);
                                on_close();
                            }}
                        >
                            <span class="px-3 py-1 bg-primary text-primary-content text-xs font-bold rounded tracking-wider min-w-[80px] text-center">
                                {cmd.name}
                            </span>
                            <span class="flex-1 text-base-content/70 tracking-wider">{cmd.params}</span>
                            {index === selected_index && (
                                <span class="flex items-center gap-1 text-xs text-base-content/50">
                                    ENTER <span class="text-primary">✓</span>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
