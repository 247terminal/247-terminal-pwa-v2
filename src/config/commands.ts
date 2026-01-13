export type CommandCategory = 'trading' | 'search' | 'chart' | 'blocks';

export interface Command {
    name: string;
    prefix: string;
    params: string[];
    category: CommandCategory;
}

export const COMMAND_CATEGORIES: Record<CommandCategory, string> = {
    trading: 'TRADING',
    search: 'SEARCH',
    chart: 'CHART',
    blocks: 'BLOCKS',
};

export const CATEGORY_ORDER: CommandCategory[] = ['trading', 'search', 'chart', 'blocks'];

export const AVAILABLE_COMMANDS: Command[] = [
    { name: 'LONG', prefix: 'l', params: ['SYMBOL', 'SIZE'], category: 'trading' },
    { name: 'SHORT', prefix: 's', params: ['SYMBOL', 'SIZE'], category: 'trading' },
    { name: 'CLOSE', prefix: 'c', params: ['SYMBOL', '%'], category: 'trading' },
    { name: 'TAKE', prefix: 'tp', params: ['SYMBOL', 'PRICE'], category: 'trading' },
    { name: 'STOP', prefix: 'sl', params: ['SYMBOL', 'PRICE'], category: 'trading' },

    { name: 'PRICE', prefix: 'p', params: ['PRICE'], category: 'search' },
    { name: 'FUNDING', prefix: 'f', params: ['RATE'], category: 'search' },
    { name: 'SEARCH', prefix: '/', params: ['QUERY'], category: 'search' },

    { name: 'CHART', prefix: 'ch', params: ['SYMBOL'], category: 'chart' },
    { name: 'TIMEFRAME', prefix: 'tf', params: ['TF'], category: 'chart' },

    { name: 'ADD', prefix: 'b', params: ['BLOCK'], category: 'blocks' },
];

export function filter_commands(query: string): Command[] {
    if (!query.trim()) return AVAILABLE_COMMANDS;

    const lower_query = query.toLowerCase();
    return AVAILABLE_COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().includes(lower_query) ||
        cmd.prefix.toLowerCase().startsWith(lower_query) ||
        cmd.params.some(p => p.toLowerCase().includes(lower_query))
    );
}

export interface ParsedCommand {
    command: Command;
    filled_params: string[];
    current_param_index: number;
    is_complete: boolean;
}

export function parse_input(input: string): ParsedCommand | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    const prefix = parts[0].toLowerCase();

    const matched_command = AVAILABLE_COMMANDS.find(cmd => cmd.prefix === prefix);
    if (!matched_command) return null;

    const filled_params = parts.slice(1);
    const current_param_index = filled_params.length;
    const is_complete = filled_params.length >= matched_command.params.length;

    return {
        command: matched_command,
        filled_params,
        current_param_index,
        is_complete,
    };
}

export function get_active_command(input: string): Command | null {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 0) return null;

    const prefix = parts[0].toLowerCase();
    return AVAILABLE_COMMANDS.find(cmd => cmd.prefix === prefix) || null;
}
