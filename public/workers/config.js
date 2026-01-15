const BATCH_INTERVALS = {
    ticker: 200,
};

const WS_STREAM_LIMIT = 200;
const WS_RECONNECT_DELAY = 5000;
const OHLCV_RETRY_DELAY = 2000;
const PONG_TIMEOUT_MS = 10000;

const VALID_SETTLE = new Set(['USDT', 'USDC', 'USDH', 'USDE']);
const VALID_QUOTES = new Set(['USDT', 'USDC']);

const EXCHANGE_CONFIG = {
    binance: {
        ccxtClass: 'binanceusdm',
        defaultType: 'swap',
        wsUrls: {
            ticker: 'wss://fstream.binance.com/ws/!miniTicker@arr',
            bookTicker: 'wss://fstream.binance.com/ws/!bookTicker',
        },
        pingInterval: 30000,
        poolKey: 'binance',
    },
    blofin: {
        ccxtClass: 'blofin',
        defaultType: 'swap',
        proxy: 'https://proxy2.247terminal.com/',
        headers: {
            'x-proxy-auth': '5cbb9da977ea3740b4dcdfeea9b020c8f6de45c2d0314f549723e8a4207c288a',
        },
        wsUrl: 'wss://openapi.blofin.com/ws/public',
        pingInterval: 25000,
        subscribeBatch: 100,
        poolKey: 'blofin',
    },
    hyperliquid: {
        ccxtClass: 'hyperliquid',
        defaultType: 'swap',
        wsUrl: 'wss://api.hyperliquid.xyz/ws',
        dexWsUrl: 'wss://api.hyperliquid.xyz/ws',
        poolKeys: {
            cex: 'hyperliquid_cex',
            dex: 'hyperliquid_dex',
        },
    },
    bybit: {
        ccxtClass: 'bybit',
        defaultType: 'swap',
        wsUrl: 'wss://stream.bybit.com/v5/public/linear',
        pingInterval: 20000,
        maxSubsPerConnection: 500,
        poolKey: 'bybit',
    },
};

const TIMEFRAME_MAP = {
    1: '1m',
    5: '5m',
    15: '15m',
    30: '30m',
    60: '1h',
    120: '2h',
    240: '4h',
    480: '8h',
    720: '12h',
    D: '1d',
    W: '1w',
    M: '1M',
};
