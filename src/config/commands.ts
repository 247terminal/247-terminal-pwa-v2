export interface Command {
    name: string;
    params: string[];
}

export const AVAILABLE_COMMANDS: Command[] = [
    { name: 'SEARCH', params: ['[EXCHANGE]', '[TICKER]'] },
    { name: 'OPEN', params: ['[MODULE NAME]'] },
    { name: 'BUY', params: ['[SYMBOL]', '[SIZE]', '[LEV]'] },
    { name: 'SELL', params: ['[SYMBOL]', '[SIZE]', '[LEV]'] },
    { name: 'CLOSE', params: ['[SYMBOL]'] },
    { name: 'SHARE', params: ['[SYMBOL]'] },
];
