const BATCH_INTERVALS = {
    ticker: 100,
    bidask: 100,
    kline: 100,
};

const WS_STREAM_LIMIT = 200;
const WS_RECONNECT_DELAY = 5000;
const OHLCV_RETRY_DELAY = 2000;

const EXCHANGE_CONFIG = {
    binance: {
        ccxtClass: 'binanceusdm',
        defaultType: 'swap',
        watchBidsAsksName: '!bookTicker',
        enableBidAskStream: true,
        enableKlineStream: true,
    },
    blofin: {
        ccxtClass: 'blofin',
        defaultType: 'swap',
        proxy: 'https://proxy2.247terminal.com/',
        headers: {
            'x-proxy-auth': '5cbb9da977ea3740b4dcdfeea9b020c8f6de45c2d0314f549723e8a4207c288a',
        },
    },
    hyperliquid: {
        ccxtClass: 'hyperliquid',
        defaultType: 'swap',
        dexWsUrl: 'wss://api.hyperliquid.xyz/ws',
    },
    bybit: {
        ccxtClass: 'bybit',
        defaultType: 'swap',
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
