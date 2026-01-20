import { EXCHANGE_CONFIG, VALID_SETTLE, TIMEFRAME_MAP } from '@/config';
import { fetchBlofinFundingRates } from './streams/blofin';
import type { ExchangeId, MarketInfo, CcxtExchange, CcxtMarket } from '@/types/worker.types';

type ExchangeClassType = new (options: Record<string, unknown>) => CcxtExchange;

const EXCHANGE_CLASSES: Record<string, ExchangeClassType> = {};

export function registerExchangeClass(name: string, cls: ExchangeClassType): void {
    EXCHANGE_CLASSES[name] = cls;
}

const exchanges: Record<string, CcxtExchange> = {};

export function getExchange(exchangeId: ExchangeId): CcxtExchange {
    if (exchanges[exchangeId]) return exchanges[exchangeId];

    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config) throw new Error(`unknown exchange: ${exchangeId}`);

    const ExchangeClass = EXCHANGE_CLASSES[config.ccxtClass];
    if (!ExchangeClass) throw new Error(`ccxt class not found: ${config.ccxtClass}`);

    const exchangeOptions: Record<string, unknown> = {
        enableRateLimit: false,
        options: { defaultType: config.defaultType },
    };

    if (config.proxy) exchangeOptions.proxy = config.proxy;
    if (config.headers) exchangeOptions.headers = config.headers;

    exchanges[exchangeId] = new ExchangeClass(exchangeOptions) as unknown as CcxtExchange;
    return exchanges[exchangeId];
}

export async function loadMarkets(exchangeId: ExchangeId): Promise<Record<string, CcxtMarket>> {
    const exchange = getExchange(exchangeId);
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
        await exchange.loadMarkets();
    }
    return exchange.markets;
}

export function isLinearSwap(market: CcxtMarket): boolean {
    const isActive = market.active || market.info?.isPreListing;
    return Boolean(isActive && market.type === 'swap' && VALID_SETTLE.has(market.settle));
}

function isLinearSwapForExchange(market: CcxtMarket, exchangeId: ExchangeId): boolean {
    if (!isLinearSwap(market)) return false;
    if (exchangeId === 'bybit') return market.settle === 'USDT';
    return true;
}

export function getSwapSymbols(exchange: CcxtExchange): string[] {
    return Object.values(exchange.markets)
        .filter(isLinearSwap)
        .map((m) => m.symbol);
}

export async function fetchMarkets(exchangeId: ExchangeId): Promise<MarketInfo[]> {
    const markets = await loadMarkets(exchangeId);
    return Object.values(markets)
        .filter((m) => isLinearSwapForExchange(m, exchangeId))
        .map((market) => ({
            symbol: market.symbol,
            base: market.base || '',
            quote: market.quote || '',
            settle: market.settle || market.quote || '',
            active: market.active,
            type: market.type,
            tick_size: market.precision?.price ?? 0.01,
            min_qty: market.limits?.amount?.min ?? 0.001,
            max_qty: market.limits?.amount?.max ?? 1000000,
            qty_step: market.precision?.amount ?? 0.001,
            contract_size: market.contractSize ?? 1,
            max_leverage: market.limits?.leverage?.max ?? null,
        }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function fetchTickers(
    exchangeId: ExchangeId
): Promise<
    Record<string, { last_price: number; price_24h: number | null; volume_24h: number | null }>
> {
    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    const tickers = await exchange.fetchTickers();

    const result: Record<
        string,
        { last_price: number; price_24h: number | null; volume_24h: number | null }
    > = {};

    for (const [symbol, ticker] of Object.entries(tickers)) {
        const market = exchange.markets[symbol];
        if (!market || !isLinearSwap(market)) continue;

        result[symbol] = {
            last_price: ticker.last ?? ticker.close ?? 0,
            price_24h: ticker.open ?? ticker.previousClose ?? null,
            volume_24h: ticker.quoteVolume ?? ticker.baseVolume ?? null,
        };
    }

    return result;
}

export async function fetchFundingRates(
    exchangeId: ExchangeId
): Promise<Record<string, { funding_rate: number | null; next_funding_time: number | null }>> {
    const exchange = getExchange(exchangeId);
    const symbols = getSwapSymbols(exchange);
    if (!symbols || symbols.length === 0) return {};

    if (exchangeId === 'blofin') {
        return fetchBlofinFundingRates(exchange);
    }

    const fundingRates = await exchange.fetchFundingRates(symbols);
    const result: Record<
        string,
        { funding_rate: number | null; next_funding_time: number | null }
    > = {};

    for (const [symbol, funding] of Object.entries(fundingRates)) {
        const market = exchange.markets[symbol];
        if (!market || !isLinearSwap(market)) continue;

        result[symbol] = {
            funding_rate: funding.fundingRate ?? null,
            next_funding_time: funding.fundingTimestamp ?? funding.nextFundingTimestamp ?? null,
        };
    }

    return result;
}

export async function fetchOHLCV(
    exchangeId: ExchangeId,
    symbol: string,
    timeframe: string,
    limit = 500
): Promise<
    { time: number; open: number; high: number; low: number; close: number; volume: number }[]
> {
    const exchange = getExchange(exchangeId);
    await loadMarkets(exchangeId);

    const ccxtTimeframe = TIMEFRAME_MAP[timeframe] || timeframe;
    const ohlcv = await exchange.fetchOHLCV(symbol, ccxtTimeframe, undefined, limit);

    return ohlcv.map((candle) => ({
        time: Math.floor(candle[0] / 1000),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
    }));
}
