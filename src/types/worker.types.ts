import type { MarketData } from './chart.types';

export type ExchangeId = 'binance' | 'blofin' | 'bybit' | 'hyperliquid';

export type StreamState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface TickerEntry {
    symbol: string;
    last_price: number;
    best_bid: number;
    best_ask: number;
    price_24h: number | null;
    volume_24h: number | null;
    funding_rate: number | null;
    next_funding_time: number | null;
}

export type MarketInfo = MarketData;

export interface WorkerMessage {
    type: string;
    payload?: Record<string, unknown>;
    requestId?: number;
}

export interface WorkerResponse {
    type: string;
    payload?: unknown;
    requestId?: number;
    error?: string;
    streamId?: string;
    data?: unknown;
    exchangeId?: ExchangeId;
    count?: number;
    result?: unknown;
}

export interface StreamConfig {
    backoffBase: number;
    backoffMax: number;
    backoffJitter: number;
    poolGrowthFactor: number;
    minPoolSize: number;
}

export interface ExchangeStreamConfig {
    ccxtClass: string;
    defaultType: string;
    proxy?: string;
    headers?: Record<string, string>;
    wsUrls?: Record<string, string>;
    wsUrl?: string;
    dexWsUrl?: string;
    restUrl?: string;
    pingInterval?: number;
    poolKey?: string;
    poolKeys?: Record<string, string>;
    maxSubsPerConnection?: number;
    subscribeBatch?: number;
    klineStreamsPerConnection?: number;
}

export type PostUpdateFn = (type: string, updates: TickerEntry[], count: number) => void;
export type PostUpdateSimpleFn = (updates: TickerEntry[], count: number) => void;

export interface CcxtMarket {
    symbol: string;
    base: string;
    quote: string;
    settle: string;
    active: boolean;
    type: string;
    id: string;
    precision?: {
        price?: number;
        amount?: number;
    };
    limits?: {
        amount?: {
            min?: number;
            max?: number;
        };
        leverage?: {
            max?: number | null;
        };
    };
    contractSize?: number;
    info?: {
        isPreListing?: boolean;
    };
}

export interface CcxtExchange {
    markets: Record<string, CcxtMarket>;
    loadMarkets(): Promise<Record<string, CcxtMarket>>;
    fetchTickers(symbols?: string[]): Promise<Record<string, CcxtTicker>>;
    fetchFundingRates(symbols: string[]): Promise<Record<string, CcxtFundingRate>>;
    fetchOHLCV(
        symbol: string,
        timeframe: string,
        since?: number,
        limit?: number
    ): Promise<number[][]>;
    watchOHLCV(symbol: string, timeframe: string): Promise<number[][]>;
    watchTickers(symbols: string[]): Promise<Record<string, CcxtTicker>>;
    has?: Record<string, boolean>;
}

export interface CcxtTicker {
    symbol: string;
    last?: number;
    close?: number;
    open?: number;
    previousClose?: number;
    bid?: number;
    ask?: number;
    baseVolume?: number;
    quoteVolume?: number;
}

export interface CcxtFundingRate {
    symbol: string;
    fundingRate?: number;
    fundingTimestamp?: number;
    nextFundingTimestamp?: number;
}

export interface TickerStreamState {
    active: boolean;
    pending: Map<string, CcxtTickerData>;
    timeout: ReturnType<typeof setTimeout> | null;
    lastFlush: number;
}

export interface CcxtTickerData {
    last?: number;
    close?: number;
    open?: number;
    previousClose?: number;
    bid?: number;
    ask?: number;
    baseVolume?: number;
    quoteVolume?: number;
}

export interface BinanceBookTicker {
    s: string;
    b: string;
    a: string;
}

export interface BinanceKline {
    s: string;
    c: string;
}

export interface BinanceStreamsState {
    ticker: WebSocket | null;
    bookTicker: WebSocket | null;
    markPrice: WebSocket | null;
    klineConnections: WebSocket[];
    klineSymbolBatches: string[][];
    state: StreamState;
    reconnectAttempts: Record<string, number>;
    klineReconnectAttempts: Map<number, number>;
    reconnectTimeouts: Record<string, ReturnType<typeof setTimeout>>;
    tickerData: Map<string, TickerEntry>;
    pending: Set<string>;
    flushTimeout: ReturnType<typeof setTimeout> | null;
    postUpdate: PostUpdateFn | null;
    batchInterval: number;
    tickerBuffer: string[];
    bookTickerBuffer: Map<string, BinanceBookTicker>;
    markPriceBuffer: string[];
    klineBuffer: Map<string, BinanceKline>;
}

export interface BybitTicker {
    symbol: string;
    lastPrice?: string;
    bid1Price?: string;
    ask1Price?: string;
    prevPrice24h?: string;
    turnover24h?: string;
    fundingRate?: string;
    nextFundingTime?: string;
}

export interface BybitStreamsState {
    connections: WebSocket[];
    pingIntervals: (ReturnType<typeof setInterval> | null)[];
    state: StreamState;
    markets: Map<string, string>;
    tickerData: Map<string, TickerEntry>;
    pending: Set<string>;
    flushTimeout: ReturnType<typeof setTimeout> | null;
    reconnectAttempts: Map<number, number>;
    reconnectTimeouts: Map<number, ReturnType<typeof setTimeout>>;
    postUpdate: PostUpdateFn | null;
    batchInterval: number;
    marketBatches: string[][];
    tickerBuffer: Map<string, BybitTicker>;
}

export interface BlofinTicker {
    instId: string;
    last: string;
    bidPrice?: string;
    askPrice?: string;
    open24h?: string;
    volCurrency24h?: string;
    fundingRate?: string;
    nextFundingTs?: string;
}

export interface BlofinFunding {
    instId: string;
    fundingRate?: string;
    fundingTime?: string;
}

export interface BlofinStreamsState {
    ws: WebSocket | null;
    fundingWs: WebSocket | null;
    state: StreamState;
    symbols: string[];
    tickerData: Map<string, TickerEntry>;
    pending: Set<string>;
    flushTimeout: ReturnType<typeof setTimeout> | null;
    reconnectAttempt: number;
    reconnectTimeout: ReturnType<typeof setTimeout> | null;
    fundingReconnectTimeout: ReturnType<typeof setTimeout> | null;
    pingInterval: ReturnType<typeof setInterval> | null;
    fundingPingInterval: ReturnType<typeof setInterval> | null;
    postUpdate: PostUpdateFn | null;
    batchInterval: number;
    tickerBuffer: Map<string, BlofinTicker>;
    fundingBuffer: Map<string, BlofinFunding>;
}

export interface CexAssetCtx {
    prevDayPx?: string;
    dayNtlVlm?: string;
    impactPxs?: string[];
    funding?: string;
    markPx?: string;
    midPx?: string;
}

export interface CexAllMidsData {
    mids?: Record<string, string>;
}

export interface CexAssetCtxsData {
    ctxs?: [string, CexAssetCtx[]][];
}

export interface CexStreamsState {
    ws: WebSocket | null;
    state: StreamState;
    markets: Map<string, string>;
    assetIndexMap: Map<number, string>;
    tickerData: Map<string, TickerEntry>;
    pending: Set<string>;
    flushTimeout: ReturnType<typeof setTimeout> | null;
    pingInterval: ReturnType<typeof setInterval> | null;
    reconnectAttempt: number;
    reconnectTimeout: ReturnType<typeof setTimeout> | null;
    postUpdate: PostUpdateSimpleFn | null;
    batchInterval: number;
    messageBuffer: string[];
}

export interface DexAssetCtx {
    prevDayPx?: string;
    dayNtlVlm?: string;
    impactPxs?: string[];
    funding?: string;
    markPx?: string;
    midPx?: string;
}

export interface DexAllMidsData {
    dex?: string;
    mids?: Record<string, string>;
}

export interface DexAssetCtxsData {
    ctxs?: [string, DexAssetCtx[]][];
}

export interface DexStreamsState {
    ws: WebSocket | null;
    state: StreamState;
    markets: Record<string, string>;
    assetMaps: Record<string, Record<number, string>>;
    baseIds: Record<string, number>;
    tickerData: Map<string, TickerEntry>;
    pending: Set<string>;
    flushTimeout: ReturnType<typeof setTimeout> | null;
    pingInterval: ReturnType<typeof setInterval> | null;
    reconnectAttempt: number;
    reconnectTimeout: ReturnType<typeof setTimeout> | null;
    postUpdate: PostUpdateSimpleFn | null;
    batchInterval: number;
    messageBuffer: string[];
}

export type IsLinearSwapFn = (market: CcxtMarket) => boolean;

export interface RawPosition {
    symbol: string;
    contracts: number;
    side: string;
    entry_price: string | number;
    mark_price: string | number;
    liquidation_price: string | number | null;
    unrealized_pnl: string | number;
    leverage: string | number;
    margin_mode: 'cross' | 'isolated';
    initial_margin: string | number;
}

export interface RawOrder {
    symbol: string;
    id: string;
    side: 'buy' | 'sell';
    type: string;
    amount: number;
    price: number;
    filled: number;
    timestamp: number;
}

export interface RawClosedPosition {
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entry_price: number;
    exit_price: number;
    realized_pnl: number;
    close_time: number;
}
