import { useState, useRef, useEffect } from 'preact/hooks';
import { Icon } from './icon';
import {
    COMMAND_CATEGORIES,
    CATEGORY_ORDER,
    filter_commands,
    parse_input,
    type Command,
    type CommandCategory,
    type ParsedCommand,
} from '../../config/commands';

interface CommandBarProps {
    on_submit?: (command: string) => void;
}

function get_filtered_by_category(query: string): Record<CommandCategory, Command[]> {
    const filtered = filter_commands(query);
    return CATEGORY_ORDER.reduce((acc, category) => {
        const commands = filtered.filter(cmd => cmd.category === category);
        if (commands.length > 0) {
            acc[category] = commands;
        }
        return acc;
    }, {} as Record<CommandCategory, Command[]>);
}

const DOLLAR_PARAMS = ['SIZE', 'PRICE'];
const PERCENT_PARAMS = ['%'];

function is_dollar_param(param: string): boolean {
    return DOLLAR_PARAMS.includes(param.toUpperCase());
}

function is_percent_param(param: string): boolean {
    return PERCENT_PARAMS.includes(param);
}

function format_dollar_value(value: string): string {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return value;
    return '$' + num.toLocaleString('en-US');
}

function format_percent_value(value: string): string {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return value;
    return num + '%';
}

function format_param_display(param: string): string {
    if (is_dollar_param(param)) {
        return '$' + param;
    }
    if (is_percent_param(param)) {
        return param + '%';
    }
    return param;
}

function format_filled_value(value: string, param: string): string {
    if (is_dollar_param(param)) {
        return format_dollar_value(value);
    }
    if (is_percent_param(param)) {
        return format_percent_value(value);
    }
    return value;
}

function CommandGuide({ parsed }: { parsed: ParsedCommand }) {
    const { command, filled_params, is_complete } = parsed;

    return (
        <div class="flex items-center gap-2 px-2 py-2 border-t border-base-300">
            <span class="w-20 text-center py-0.5 bg-success/20 text-success text-[10px] font-medium rounded border border-success/30">
                {command.name}
            </span>
            <span class="text-[10px] text-success/60 font-mono w-6">
                {command.prefix}
            </span>
            {command.params.map((param, i) => {
                const is_filled = i < filled_params.length;
                const is_current = i === filled_params.length;
                const value = filled_params[i];

                if (is_filled) {
                    return (
                        <span key={i} class="px-2 py-0.5 bg-success/20 text-success text-[10px] rounded border border-success/30 font-mono">
                            {format_filled_value(value, param)}
                        </span>
                    );
                }

                return (
                    <span
                        key={i}
                        class={`px-1.5 py-0.5 text-[9px] rounded ${
                            is_current
                                ? 'bg-primary/10 text-primary border border-primary/30 animate-pulse'
                                : 'bg-base-300/50 text-base-content/30'
                        }`}
                    >
                        {format_param_display(param)}
                    </span>
                );
            })}
            {is_complete && (
                <span class="ml-auto text-[9px] text-success font-medium">
                    READY
                </span>
            )}
            {!is_complete && (
                <span class="ml-auto text-[9px] text-base-content/30">
                    ENTER to submit
                </span>
            )}
        </div>
    );
}

export function CommandBar({ on_submit }: CommandBarProps) {
    const [value, set_value] = useState('');
    const [is_open, set_is_open] = useState(false);
    const [selected_index, set_selected_index] = useState(0);
    const [is_shaking, set_is_shaking] = useState(false);
    const input_ref = useRef<HTMLInputElement>(null);
    const container_ref = useRef<HTMLDivElement>(null);
    const is_mac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const parsed_command = parse_input(value);
    const show_command_list = !parsed_command;
    const is_command_complete = parsed_command?.is_complete ?? false;
    const filtered_commands = filter_commands(value);
    const commands_by_category = get_filtered_by_category(value);

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

    const trigger_shake = () => {
        set_is_shaking(true);
        setTimeout(() => set_is_shaking(false), 500);
    };

    const handle_submit = (e: Event) => {
        e.preventDefault();
        if (!value.trim()) return;

        if (parsed_command && !is_command_complete) {
            trigger_shake();
            return;
        }

        on_submit?.(value.trim());
        set_value('');
    };

    const handle_key_nav = (e: KeyboardEvent) => {
        if (!show_command_list) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            set_selected_index(prev => Math.min(prev + 1, filtered_commands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            set_selected_index(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && is_open && filtered_commands.length > 0) {
            e.preventDefault();
            const cmd = filtered_commands[selected_index];
            set_value(cmd.prefix + ' ');
        }
    };

    const handle_command_click = (cmd: Command) => {
        set_value(cmd.prefix + ' ');
        input_ref.current?.focus();
    };

    let flat_index = 0;

    return (
        <div ref={container_ref} class="relative">
            <form onSubmit={handle_submit} class={`flex items-center gap-1 px-2 py-1 bg-base-100 border border-base-300 text-xs min-w-[360px] transition-colors ${is_open ? 'rounded-t' : 'rounded'} ${is_shaking ? 'animate-shake' : ''}`}>
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
                <div class="absolute top-full left-0 right-0 bg-base-100 border border-t-0 border-base-300 rounded-b shadow-lg z-50">
                    {parsed_command ? (
                        <CommandGuide parsed={parsed_command} />
                    ) : (
                        <>
                            {CATEGORY_ORDER.map(category => {
                                const commands = commands_by_category[category];
                                if (!commands || commands.length === 0) return null;

                                return (
                                    <div key={category} class="py-0.5">
                                        <div class="px-2 py-0.5">
                                            <span class="text-[9px] text-base-content/40 tracking-wider font-medium">
                                                {COMMAND_CATEGORIES[category]}
                                            </span>
                                        </div>
                                        {commands.map((cmd) => {
                                            const current_index = flat_index++;
                                            const is_selected = current_index === selected_index;

                                            return (
                                                <button
                                                    key={cmd.name}
                                                    type="button"
                                                    onClick={() => handle_command_click(cmd)}
                                                    class={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-base-200 transition-colors ${is_selected ? 'bg-base-200' : ''}`}
                                                >
                                                    <span class="w-20 text-center py-0.5 bg-primary/20 text-primary text-[10px] font-medium rounded border border-primary/30">
                                                        {cmd.name}
                                                    </span>
                                                    <span class="text-[10px] text-base-content/40 font-mono w-6">
                                                        {cmd.prefix}
                                                    </span>
                                                    {cmd.params.map((param, i) => (
                                                        <span key={i} class="px-1.5 py-0.5 bg-base-300/50 text-[9px] text-base-content/50 rounded">
                                                            {format_param_display(param)}
                                                        </span>
                                                    ))}
                                                    {is_selected && (
                                                        <span class="ml-auto text-[9px] text-base-content/40">
                                                            ENTER
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {filtered_commands.length === 0 && (
                                <div class="px-2 py-3 text-center text-xs text-base-content/50">
                                    No commands found
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
