import type { StreamConfig, ExchangeStreamConfig } from '@/types/worker.types';

interface AppConfig {
    api_base_url: string;
    ws_url: string;
    credentials_key: string;
    environment: 'development' | 'production';
    is_dev: boolean;
    is_prod: boolean;
}

interface ProxyConfig {
    url: string;
    auth: string;
}

export const PROXY_CONFIG: Record<string, ProxyConfig | null> = {
    binance: {
        url: 'https://proxy1.247terminal.com/',
        auth: import.meta.env.VITE_PROXY_BINANCE_AUTH || '',
    },
    blofin: {
        url: 'https://proxy2.247terminal.com/',
        auth: import.meta.env.VITE_PROXY_BLOFIN_AUTH || '',
    },
    bybit: null,
    hyperliquid: null,
};

function get_config(): AppConfig {
    const env = import.meta.env;
    const environment = env.MODE === 'production' ? 'production' : 'development';

    return {
        api_base_url: env.VITE_API_URL || '',
        ws_url: env.VITE_WS_URL || '',
        credentials_key: env.VITE_CREDENTIALS_KEY || '',
        environment,
        is_dev: environment === 'development',
        is_prod: environment === 'production',
    };
}

export const config = get_config();

export const BATCH_INTERVALS = {
    ticker: 200,
};

export const WS_STREAM_LIMIT = 200;
export const WS_RECONNECT_DELAY = 5000;
export const OHLCV_RETRY_DELAY = 2000;
export const WORKER_REQUEST_TIMEOUT = 30000;
export const MARKET_MAP_CACHE_TTL = 60000;
export const HYPERLIQUID_CACHE_TTL = 100;

export const VALID_SETTLE = new Set(['USDT', 'USDC', 'USDH', 'USDE']);
export const VALID_QUOTES = new Set(['USDT', 'USDC']);

export const STREAM_CONFIG: StreamConfig = {
    backoffBase: 1000,
    backoffMax: 30000,
    backoffJitter: 0.3,
    poolGrowthFactor: 1.5,
    minPoolSize: 128,
};

export const EXCHANGE_CONFIG: Record<string, ExchangeStreamConfig> = {
    binance: {
        ccxtClass: 'binanceusdm',
        defaultType: 'swap',
        wsUrls: {
            ticker: 'wss://fstream.binance.com/ws/!miniTicker@arr',
            bookTicker: 'wss://fstream.binance.com/ws/!bookTicker',
            markPrice: 'wss://fstream.binance.com/ws/!markPrice@arr@1s',
            klineBase: 'wss://fstream.binance.com/stream?streams=',
        },
        klineStreamsPerConnection: 200,
        poolKey: 'binance',
        restUrl: 'https://fapi.binance.com',
    },
    blofin: {
        ccxtClass: 'blofin',
        defaultType: 'swap',
        proxy: PROXY_CONFIG.blofin?.url,
        headers: {
            'x-proxy-auth': PROXY_CONFIG.blofin?.auth ?? '',
        },
        restUrl: 'https://openapi.blofin.com',
        wsUrl: 'wss://openapi.blofin.com/ws/public',
        subscribeBatch: 100,
        pingInterval: 25000,
        poolKey: 'blofin',
    },
    hyperliquid: {
        ccxtClass: 'hyperliquid',
        defaultType: 'swap',
        wsUrl: 'wss://api.hyperliquid.xyz/ws',
        dexWsUrl: 'wss://api.hyperliquid.xyz/ws',
        pingInterval: 30000,
        poolKeys: {
            cex: 'hyperliquid_cex',
            dex: 'hyperliquid_dex',
        },
        restUrl: 'https://api.hyperliquid.xyz',
    },
    bybit: {
        ccxtClass: 'bybit',
        defaultType: 'swap',
        wsUrl: 'wss://stream.bybit.com/v5/public/linear',
        maxSubsPerConnection: 500,
        subscribeBatch: 100,
        pingInterval: 20000,
        poolKey: 'bybit',
        restUrl: 'https://api.bybit.com',
    },
};

export const TIMEFRAME_MAP: Record<string | number, string> = {
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
