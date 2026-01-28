import type { CcxtMarket } from '@/types/worker.types';

export const binance = {
    toUnified: (raw: string): string => raw.replace(/USDT$/, '/USDT:USDT'),
    fromUnified: (symbol: string): string => symbol.replace(/\/USDT:USDT$/, 'USDT'),
};

export const bybit = binance;

export const blofin = {
    toUnified: (instId: string): string => instId.replace(/-/g, '/') + ':USDT',
    fromUnified: (symbol: string): string => symbol.replace(/\//, '-').replace(/:[A-Z]+$/, ''),
};

type MarketsMap = Record<string, CcxtMarket> | null | undefined;

const coinToSymbolCache: WeakMap<object, Map<string, string>> = new WeakMap();

function getOrCreateCoinCache(markets: NonNullable<MarketsMap>): Map<string, string> {
    let cache = coinToSymbolCache.get(markets);
    if (!cache) {
        cache = new Map();
        for (const market of Object.values(markets)) {
            if (market.id) cache.set(`@${market.id}`, market.symbol);
            if (market.base) cache.set(market.base, market.symbol);
        }
        coinToSymbolCache.set(markets, cache);
    }
    return cache;
}

export const hyperliquid = {
    toUnified: (coin: string): string => `${coin}/USDC:USDC`,
    coinToSymbol: (coin: string): string => {
        if (coin.includes(':')) {
            const colonIdx = coin.indexOf(':');
            const dex = coin.slice(0, colonIdx).toUpperCase();
            const ticker = coin.slice(colonIdx + 1);
            return `${dex}-${ticker}/USDC:USDC`;
        }
        return `${coin}/USDC:USDC`;
    },
    fromUnified: (symbol: string): string => symbol.split('/')[0],
    getDexPrefix: (symbol: string): string => symbol.split('-')[0],
    getDexTicker: (symbol: string): string => symbol.split('-')[1]?.split('/')[0] ?? '',

    resolveCoin: (coin: string, markets: MarketsMap): string => {
        if (coin.includes(':')) {
            const colonIdx = coin.indexOf(':');
            const dex = coin.slice(0, colonIdx).toUpperCase();
            const ticker = coin.slice(colonIdx + 1);
            return `${dex}-${ticker}/USDC:USDC`;
        }

        const expectedSymbol = `${coin}/USDC:USDC`;
        if (!markets) return expectedSymbol;
        if (markets[expectedSymbol]) return expectedSymbol;

        if (coin.startsWith('@')) {
            const cache = getOrCreateCoinCache(markets);
            const cached = cache.get(coin);
            if (cached) return cached;
        }

        const cache = getOrCreateCoinCache(markets);
        return cache.get(coin) ?? expectedSymbol;
    },

    toDexCoin: (symbol: string): { dex: string; coin: string } | null => {
        const slashIdx = symbol.indexOf('/');
        const base = slashIdx > 0 ? symbol.slice(0, slashIdx) : symbol;
        const dashIdx = base.indexOf('-');
        if (dashIdx <= 0) return null;
        const dex = base.slice(0, dashIdx).toLowerCase();
        const ticker = base.slice(dashIdx + 1);
        return { dex, coin: `${dex}:${ticker}` };
    },
};
