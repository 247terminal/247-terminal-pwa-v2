export const binance = {
    toUnified: (raw: string): string => raw.replace(/USDT$/, '/USDT:USDT'),
    fromUnified: (symbol: string): string => symbol.replace(/\/USDT:USDT$/, 'USDT'),
};

export const bybit = binance;

export const blofin = {
    toUnified: (instId: string): string => instId.replace(/-/g, '/') + ':USDT',
    fromUnified: (symbol: string): string => symbol.replace(/\//, '-').replace(/:[A-Z]+$/, ''),
};

export const hyperliquid = {
    toUnified: (coin: string): string => `${coin}/USDC:USDC`,
    fromUnified: (symbol: string): string => symbol.split('/')[0],
    getDexPrefix: (symbol: string): string => symbol.split('-')[0],
    getDexTicker: (symbol: string): string => symbol.split('-')[1]?.split('/')[0] ?? '',
};
