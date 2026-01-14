import { EXCHANGE_IDS, type ExchangeId } from './types';
import { fetch_markets, fetch_tickers, start_ticker_stream } from './chart_data';
import { set_markets, has_markets, set_initial_tickers } from '../../stores/exchange_store';

let initialized = false;

async function load_exchange(ex: ExchangeId): Promise<void> {
    try {
        const market_list = await fetch_markets(ex);
        set_markets(ex, market_list);
        try {
            const tickers = await fetch_tickers(ex);
            set_initial_tickers(ex, tickers);
        } catch (err) {
            console.error(`failed to load ${ex} tickers:`, err);
        }
        start_ticker_stream(ex);
    } catch (err) {
        console.error(`failed to load ${ex} markets:`, err);
        set_markets(ex, []);
    }
}

export function init_exchanges(): void {
    if (initialized) return;
    initialized = true;

    for (const ex of EXCHANGE_IDS) {
        if (has_markets(ex)) continue;
        load_exchange(ex);
    }
}
