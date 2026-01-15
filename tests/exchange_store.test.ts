import { describe, it, expect, beforeEach } from 'vitest';
import {
    connections,
    markets,
    set_connection_status,
    get_connection_status,
    is_connected,
    set_markets,
    update_ticker,
    update_tickers_batch,
    update_ticker_price_1m_ago,
    get_symbol,
    get_market,
    get_ticker,
    get_ticker_signal,
    get_exchange_markets,
    has_markets,
    clear_ticker_signals,
} from '../src/stores/exchange_store';

const mock_market = {
    symbol: 'BTC/USDT',
    base: 'BTC',
    quote: 'USDT',
    settle: 'USDT',
    active: true,
    type: 'swap',
    tick_size: 0.1,
    min_qty: 0.001,
    max_qty: 1000,
    qty_step: 0.001,
    contract_size: 1,
    max_leverage: 125,
};

const mock_ticker = {
    symbol: 'BTC/USDT',
    last_price: 50000,
    best_bid: 49999,
    best_ask: 50001,
    funding_rate: 0.0001,
    next_funding_time: Date.now() + 3600000,
    price_24h: 49000,
    volume_24h: 1000000000,
};

function reset_store() {
    set_connection_status('binance', 'disconnected');
    set_connection_status('blofin', 'disconnected');
    set_connection_status('hyperliquid', 'disconnected');
    set_connection_status('bybit', 'disconnected');
    markets.value = { binance: {}, blofin: {}, hyperliquid: {}, bybit: {} };
    clear_ticker_signals();
}

describe('exchange_store', () => {
    beforeEach(() => {
        reset_store();
    });

    describe('connection status', () => {
        it('should initialize with disconnected status', () => {
            expect(get_connection_status('binance')).toBe('disconnected');
            expect(get_connection_status('blofin')).toBe('disconnected');
            expect(get_connection_status('hyperliquid')).toBe('disconnected');
            expect(get_connection_status('bybit')).toBe('disconnected');
        });

        it('should update connection status', () => {
            set_connection_status('binance', 'connecting');
            expect(get_connection_status('binance')).toBe('connecting');

            set_connection_status('binance', 'connected');
            expect(get_connection_status('binance')).toBe('connected');
        });

        it('should set error message on error status', () => {
            set_connection_status('binance', 'error', 'connection timeout');
            expect(get_connection_status('binance')).toBe('error');
            expect(connections.value.binance.error).toBe('connection timeout');
        });

        it('should set last_connected timestamp when connected', () => {
            const before = Date.now();
            set_connection_status('binance', 'connected');
            const after = Date.now();

            const last_connected = connections.value.binance.last_connected;
            expect(last_connected).toBeGreaterThanOrEqual(before);
            expect(last_connected).toBeLessThanOrEqual(after);
        });

        it('should return correct is_connected value', () => {
            expect(is_connected('binance')).toBe(false);

            set_connection_status('binance', 'connecting');
            expect(is_connected('binance')).toBe(false);

            set_connection_status('binance', 'connected');
            expect(is_connected('binance')).toBe(true);

            set_connection_status('binance', 'error');
            expect(is_connected('binance')).toBe(false);
        });
    });

    describe('markets', () => {
        it('should set markets from market data', () => {
            set_markets('binance', [mock_market]);

            const market = get_market('binance', 'BTC/USDT');
            expect(market).not.toBeNull();
            expect(market?.tick_size).toBe(0.1);
            expect(market?.max_leverage).toBe(125);
        });

        it('should get all markets for exchange', () => {
            const eth_market = { ...mock_market, symbol: 'ETH/USDT', base: 'ETH' };
            set_markets('binance', [mock_market, eth_market]);

            const all = get_exchange_markets('binance');
            expect(Object.keys(all)).toHaveLength(2);
            expect(all['BTC/USDT'].base).toBe('BTC');
            expect(all['ETH/USDT'].base).toBe('ETH');
        });

        it('should check has_markets correctly', () => {
            expect(has_markets('binance')).toBe(false);
            set_markets('binance', [mock_market]);
            expect(has_markets('binance')).toBe(true);
        });

        it('should keep markets separate per exchange', () => {
            set_markets('binance', [mock_market]);
            set_markets('bybit', [{ ...mock_market, tick_size: 0.01 }]);

            expect(get_market('binance', 'BTC/USDT')?.tick_size).toBe(0.1);
            expect(get_market('bybit', 'BTC/USDT')?.tick_size).toBe(0.01);
        });
    });

    describe('tickers (per-symbol signals)', () => {
        it('should return null for non-existent ticker', () => {
            expect(get_ticker('binance', 'BTC/USDT')).toBeNull();
        });

        it('should create signal on first access', () => {
            const sig1 = get_ticker_signal('binance', 'BTC/USDT');
            const sig2 = get_ticker_signal('binance', 'BTC/USDT');
            expect(sig1).toBe(sig2);
            expect(sig1.value).toBeNull();
        });

        it('should update ticker via signal', () => {
            update_ticker('binance', mock_ticker);

            const ticker = get_ticker('binance', 'BTC/USDT');
            expect(ticker?.last_price).toBe(50000);
            expect(ticker?.best_bid).toBe(49999);
        });

        it('should preserve price_1m_ago on subsequent updates', () => {
            update_ticker('binance', mock_ticker);
            update_ticker('binance', { ...mock_ticker, last_price: 51000 });

            const ticker = get_ticker('binance', 'BTC/USDT');
            expect(ticker?.last_price).toBe(51000);
            expect(ticker?.price_1m_ago).toBe(50000);
        });

        it('should update price_1m_ago correctly', () => {
            update_ticker('binance', mock_ticker);
            update_ticker_price_1m_ago('binance', 'BTC/USDT');

            expect(get_ticker('binance', 'BTC/USDT')?.price_1m_ago).toBe(50000);

            update_ticker('binance', { ...mock_ticker, last_price: 52000 });
            update_ticker_price_1m_ago('binance', 'BTC/USDT');

            expect(get_ticker('binance', 'BTC/USDT')?.price_1m_ago).toBe(52000);
        });

        it('should batch update tickers', () => {
            const tickers_list = [
                mock_ticker,
                { ...mock_ticker, symbol: 'ETH/USDT', last_price: 3000 },
            ];
            update_tickers_batch('binance', tickers_list);

            expect(get_ticker('binance', 'BTC/USDT')?.last_price).toBe(50000);
            expect(get_ticker('binance', 'ETH/USDT')?.last_price).toBe(3000);
        });

        it('should keep tickers separate per exchange', () => {
            update_ticker('binance', mock_ticker);
            update_ticker('bybit', { ...mock_ticker, last_price: 50100 });

            expect(get_ticker('binance', 'BTC/USDT')?.last_price).toBe(50000);
            expect(get_ticker('bybit', 'BTC/USDT')?.last_price).toBe(50100);
        });

        it('should have independent signals per symbol', () => {
            const btc_sig = get_ticker_signal('binance', 'BTC/USDT');
            const eth_sig = get_ticker_signal('binance', 'ETH/USDT');

            update_ticker('binance', mock_ticker);

            expect(btc_sig.value?.last_price).toBe(50000);
            expect(eth_sig.value).toBeNull();
        });
    });

    describe('get_symbol (unified view)', () => {
        it('should return null if market does not exist', () => {
            expect(get_symbol('binance', 'BTC/USDT')).toBeNull();
        });

        it('should combine market and ticker data', () => {
            set_markets('binance', [mock_market]);
            update_ticker('binance', mock_ticker);

            const symbol = get_symbol('binance', 'BTC/USDT');
            expect(symbol?.tick_size).toBe(0.1);
            expect(symbol?.last_price).toBe(50000);
            expect(symbol?.best_bid).toBe(49999);
        });

        it('should return null ticker fields if no ticker yet', () => {
            set_markets('binance', [mock_market]);

            const symbol = get_symbol('binance', 'BTC/USDT');
            expect(symbol?.tick_size).toBe(0.1);
            expect(symbol?.last_price).toBeNull();
            expect(symbol?.best_bid).toBeNull();
        });
    });
});
