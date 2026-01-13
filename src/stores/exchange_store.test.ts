import { describe, it, expect, beforeEach } from 'vitest';
import {
    connections,
    set_connection_status,
    get_connection_status,
    is_connected,
    update_ticker,
    update_ticker_price_1m_ago,
    get_ticker,
    get_all_tickers,
} from './exchange_store';
import type { TickerData } from '../services/exchange/types';

const mock_ticker: TickerData = {
    symbol: 'BTC/USDT',
    last_price: 50000,
    price_1m_ago: null,
    best_bid: 49999,
    best_ask: 50001,
    funding_rate: 0.0001,
    next_funding_time: Date.now() + 3600000,
    price_24h: 49000,
    timestamp: Date.now(),
};

function reset_store() {
    set_connection_status('binance', 'disconnected');
    set_connection_status('blofin', 'disconnected');
    set_connection_status('hyperliquid', 'disconnected');
    set_connection_status('bybit', 'disconnected');
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

    describe('ticker data', () => {
        it('should return null for non-existent ticker', () => {
            expect(get_ticker('binance', 'BTC/USDT')).toBeNull();
        });

        it('should update and retrieve ticker', () => {
            update_ticker('binance', mock_ticker);

            const ticker = get_ticker('binance', 'BTC/USDT');
            expect(ticker).not.toBeNull();
            expect(ticker?.last_price).toBe(50000);
            expect(ticker?.symbol).toBe('BTC/USDT');
        });

        it('should preserve price_1m_ago on subsequent updates', () => {
            update_ticker('binance', mock_ticker);

            const updated_ticker: TickerData = {
                ...mock_ticker,
                last_price: 51000,
                price_1m_ago: null,
            };
            update_ticker('binance', updated_ticker);

            const ticker = get_ticker('binance', 'BTC/USDT');
            expect(ticker?.last_price).toBe(51000);
            expect(ticker?.price_1m_ago).toBe(50000);
        });

        it('should update price_1m_ago correctly', () => {
            update_ticker('binance', { ...mock_ticker, last_price: 50000 });
            update_ticker_price_1m_ago('binance', 'BTC/USDT');

            const ticker = get_ticker('binance', 'BTC/USDT');
            expect(ticker?.price_1m_ago).toBe(50000);

            update_ticker('binance', { ...mock_ticker, last_price: 52000 });
            update_ticker_price_1m_ago('binance', 'BTC/USDT');

            const updated = get_ticker('binance', 'BTC/USDT');
            expect(updated?.price_1m_ago).toBe(52000);
        });

        it('should get all tickers for an exchange', () => {
            update_ticker('binance', mock_ticker);
            update_ticker('binance', { ...mock_ticker, symbol: 'ETH/USDT', last_price: 3000 });

            const tickers = get_all_tickers('binance');
            expect(Object.keys(tickers)).toHaveLength(2);
            expect(tickers['BTC/USDT'].last_price).toBe(50000);
            expect(tickers['ETH/USDT'].last_price).toBe(3000);
        });

        it('should keep tickers separate per exchange', () => {
            update_ticker('binance', mock_ticker);
            update_ticker('bybit', { ...mock_ticker, last_price: 50100 });

            expect(get_ticker('binance', 'BTC/USDT')?.last_price).toBe(50000);
            expect(get_ticker('bybit', 'BTC/USDT')?.last_price).toBe(50100);
        });
    });
});
