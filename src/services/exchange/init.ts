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
import {
    init_credentials,
    exchange_connection_status,
    credentials_state,
} from '../../stores/credentials_store';
import { init_default_exchange } from '../../stores/trade_store';

let initialized = false;

export async function load_exchange(ex: ExchangeId): Promise<void> {
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

function get_connected_exchanges(): ExchangeId[] {
    const status = exchange_connection_status.value;
    return EXCHANGE_IDS.filter((ex) => status[ex]);
}

export async function init_exchanges(): Promise<void> {
    if (initialized) return;
    initialized = true;

    if (!credentials_state.value.loaded) {
        await init_credentials();
    }

    init_default_exchange();

    const connected = get_connected_exchanges();
    const exchanges_to_load = connected.length > 0 ? connected : EXCHANGE_IDS;

    for (const ex of exchanges_to_load) {
        if (has_markets(ex)) continue;
        load_exchange(ex);
    }
}
