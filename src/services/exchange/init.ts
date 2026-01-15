import { EXCHANGE_IDS, type ExchangeId } from '../../types/exchange.types';
import {
    fetch_markets,
    fetch_tickers,
    fetch_funding_rates,
    start_ticker_stream,
} from './chart_data';
import {
    set_markets,
    has_markets,
    set_initial_tickers,
    update_initial_funding,
} from '../../stores/exchange_store';

let initialized = false;

async function load_exchange(ex: ExchangeId): Promise<void> {
    try {
        const market_list = await fetch_markets(ex);
        set_markets(ex, market_list);
        const [tickersResult, fundingResult] = await Promise.allSettled([
            fetch_tickers(ex),
            fetch_funding_rates(ex),
        ]);
        if (tickersResult.status === 'fulfilled') {
            set_initial_tickers(ex, tickersResult.value);
        } else {
            console.error(`failed to load ${ex} tickers:`, tickersResult.reason);
        }
        if (fundingResult.status === 'fulfilled') {
            update_initial_funding(ex, fundingResult.value);
        } else {
            console.error(`failed to load ${ex} funding:`, fundingResult.reason);
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
