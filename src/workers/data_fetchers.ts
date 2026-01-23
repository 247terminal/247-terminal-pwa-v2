import { EXCHANGE_CONFIG, VALID_SETTLE, TIMEFRAME_MAP, PROXY_CONFIG } from '@/config';
import { fetchBlofinFundingRates } from './streams/blofin';
import type {
    ExchangeId,
    ExchangeAuthParams,
    MarketInfo,
    CcxtExchange,
    CcxtMarket,
} from '@/types/worker.types';
import { binance as binanceSym } from './symbol_utils';

export type { ExchangeAuthParams };

type ExchangeClassType = new (options: Record<string, unknown>) => CcxtExchange;

const EXCHANGE_CLASSES: Record<string, ExchangeClassType> = {};

export function registerExchangeClass(name: string, cls: ExchangeClassType): void {
    EXCHANGE_CLASSES[name] = cls;
}

const exchanges: Record<string, CcxtExchange> = {};
const exchangeCredentials: Record<string, ExchangeAuthParams> = {};
const marketCache: Record<string, Record<string, CcxtMarket>> = {};
const marketsByIdCache: Record<string, Record<string, CcxtMarket>> = {};
const marketLoadPromises: Record<string, Promise<Record<string, CcxtMarket>>> = {};
const binanceMaxLeverageCache: Record<string, number> = {};
let binanceLeveragePromise: Promise<void> | null = null;

function getProxyOptions(exchangeId: ExchangeId): {
    proxy?: string;
    headers?: Record<string, string>;
} {
    const proxy = PROXY_CONFIG[exchangeId];
    if (!proxy) return {};
    return {
        proxy: proxy.url,
        headers: { 'x-proxy-auth': proxy.auth },
    };
}

function createExchangeInstance(
    exchangeId: ExchangeId,
    credentials?: ExchangeAuthParams
): CcxtExchange {
    const config = EXCHANGE_CONFIG[exchangeId];
    if (!config) throw new Error(`unknown exchange: ${exchangeId}`);

    const ExchangeClass = EXCHANGE_CLASSES[config.ccxtClass];
    if (!ExchangeClass) throw new Error(`ccxt class not found: ${config.ccxtClass}`);

    const proxyOptions = getProxyOptions(exchangeId);

    const exchangeOptions: Record<string, unknown> = {
        ...proxyOptions,
        enableRateLimit: false,
        options: {
            defaultType: config.defaultType,
            warnOnFetchOpenOrdersWithoutSymbol: false,
        },
    };

    if (credentials?.api_key) {
        exchangeOptions.apiKey = credentials.api_key;
        exchangeOptions.secret = credentials.api_secret;
        if (credentials.passphrase) {
            exchangeOptions.password = credentials.passphrase;
        }
    }
    if (credentials?.wallet_address) {
        exchangeOptions.walletAddress = credentials.wallet_address;
        exchangeOptions.privateKey = credentials.private_key;
    }

    return new ExchangeClass(exchangeOptions) as unknown as CcxtExchange;
}

function hasMarkets(markets: Record<string, CcxtMarket> | undefined): boolean {
    if (!markets) return false;
    for (const key in markets) {
        if (Object.hasOwn(markets, key)) return true;
    }
    return false;
}

function replaceExchangeInstance(exchangeId: ExchangeId, credentials?: ExchangeAuthParams): void {
    const oldExchange = exchanges[exchangeId];

    const newExchange = createExchangeInstance(exchangeId, credentials);

    if (marketCache[exchangeId]) {
        newExchange.markets = marketCache[exchangeId];
        newExchange.markets_by_id = marketsByIdCache[exchangeId] || {};
    }

    exchanges[exchangeId] = newExchange;

    if (credentials) {
        exchangeCredentials[exchangeId] = credentials;
    } else {
        delete exchangeCredentials[exchangeId];
    }

    if (oldExchange?.close) {
        oldExchange.close().catch((err) => {
            console.error('failed to close exchange:', exchangeId, (err as Error).message);
        });
    }
}

export function getExchange(exchangeId: ExchangeId): CcxtExchange {
    if (exchanges[exchangeId]) return exchanges[exchangeId];

    exchanges[exchangeId] = createExchangeInstance(exchangeId);
    return exchanges[exchangeId];
}

export function setExchangeAuth(exchangeId: ExchangeId, credentials: ExchangeAuthParams): void {
    replaceExchangeInstance(exchangeId, credentials);
}

export function clearExchangeAuth(exchangeId: ExchangeId): void {
    replaceExchangeInstance(exchangeId);
}

export function isExchangeAuthenticated(exchangeId: ExchangeId): boolean {
    return !!exchangeCredentials[exchangeId];
}

export async function loadMarkets(exchangeId: ExchangeId): Promise<Record<string, CcxtMarket>> {
    const assignToCurrentExchange = (markets: Record<string, CcxtMarket>) => {
        const exchange = exchanges[exchangeId];
        if (exchange && !hasMarkets(exchange.markets)) {
            exchange.markets = markets;
            exchange.markets_by_id = marketsByIdCache[exchangeId] || {};
        }
        return markets;
    };

    if (marketCache[exchangeId]) {
        return assignToCurrentExchange(marketCache[exchangeId]);
    }

    if (marketLoadPromises[exchangeId]) {
        return marketLoadPromises[exchangeId].then(assignToCurrentExchange);
    }

    const exchange = getExchange(exchangeId);

    marketLoadPromises[exchangeId] = exchange
        .loadMarkets()
        .then((markets) => {
            marketCache[exchangeId] = markets;
            marketsByIdCache[exchangeId] = exchange.markets_by_id || {};
            return markets;
        })
        .finally(() => {
            delete marketLoadPromises[exchangeId];
        });

    return marketLoadPromises[exchangeId].then(assignToCurrentExchange);
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
    if (!exchange.markets) return [];
    return Object.values(exchange.markets)
        .filter(isLinearSwap)
        .map((m) => m.symbol);
}

interface BinanceLeverageBracket {
    symbol: string;
    brackets: { initialLeverage: number }[];
}

export async function fetchBinanceMaxLeverage(): Promise<Record<string, number>> {
    if (Object.keys(binanceMaxLeverageCache).length > 0) {
        return binanceMaxLeverageCache;
    }

    if (binanceLeveragePromise) {
        await binanceLeveragePromise;
        return binanceMaxLeverageCache;
    }

    const exchange = exchanges.binance;
    if (!exchange || !exchangeCredentials.binance) {
        return binanceMaxLeverageCache;
    }

    binanceLeveragePromise = (async () => {
        try {
            const response = await exchange.fapiPrivateGetLeverageBracket();
            if (!Array.isArray(response)) return;

            for (const item of response as BinanceLeverageBracket[]) {
                const symbol = binanceSym.toUnified(item.symbol);
                const maxLev = item.brackets?.[0]?.initialLeverage;
                if (maxLev) {
                    binanceMaxLeverageCache[symbol] = maxLev;
                }
            }
        } catch (err) {
            console.error('failed to fetch binance leverage brackets:', (err as Error).message);
        }
    })();

    await binanceLeveragePromise;
    binanceLeveragePromise = null;
    return binanceMaxLeverageCache;
}

function getMaxLeverage(market: CcxtMarket, exchangeId: ExchangeId): number | null {
    if (exchangeId === 'binance') {
        return binanceMaxLeverageCache[market.symbol] ?? null;
    }
    return market.limits?.leverage?.max ?? null;
}

export async function fetchMarkets(exchangeId: ExchangeId): Promise<MarketInfo[]> {
    const markets = await loadMarkets(exchangeId);

    if (exchangeId === 'binance') {
        await fetchBinanceMaxLeverage();
    }

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
            max_leverage: getMaxLeverage(market, exchangeId),
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
    await loadMarkets(exchangeId);

    const symbols = getSwapSymbols(exchange);
    if (symbols.length === 0) return {};

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
