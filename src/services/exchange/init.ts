import { EXCHANGE_IDS, type ExchangeId } from '../../types/exchange.types';
import {
    fetch_markets,
    fetch_tickers,
    fetch_funding_rates,
    fetch_binance_max_leverage,
    start_ticker_stream,
} from './chart_data';
import {
    set_markets,
    has_markets,
    set_initial_tickers,
    update_initial_funding,
    update_max_leverage,
} from '../../stores/exchange_store';
import {
    init_credentials,
    exchange_connection_status,
    credentials_state,
    get_exchange_credentials,
} from '../../stores/credentials_store';
import { init_default_exchange } from '../../stores/trade_store';
import { refresh_account, recalculate_blofin_positions } from '../../stores/account_store';
import { init_exchange } from './account_bridge';

let initialized = false;

export async function load_exchange(ex: ExchangeId): Promise<void> {
    try {
        const market_list = await fetch_markets(ex);
        set_markets(ex, market_list);

        if (ex === 'blofin') {
            recalculate_blofin_positions();
        }

        const [tickersResult, fundingResult] = await Promise.allSettled([
            fetch_tickers(ex),
            fetch_funding_rates(ex),
        ]);
        if (tickersResult.status === 'fulfilled') {
            set_initial_tickers(ex, tickersResult.value);
        } else {
            console.error(
                `failed to load ${ex} tickers:`,
                (tickersResult.reason as Error)?.message
            );
        }
        if (fundingResult.status === 'fulfilled') {
            update_initial_funding(ex, fundingResult.value);
        } else {
            console.error(
                `failed to load ${ex} funding:`,
                (fundingResult.reason as Error)?.message
            );
        }
        start_ticker_stream(ex);
    } catch (err) {
        console.error(`failed to load ${ex} markets:`, (err as Error).message);
        set_markets(ex, []);
    }
}

function get_connected_exchanges(): ExchangeId[] {
    const status = exchange_connection_status.value;
    return EXCHANGE_IDS.filter((ex) => status[ex]);
}

async function init_connected_exchange_instances(connected: ExchangeId[]): Promise<void> {
    await Promise.all(
        connected.map(async (ex) => {
            const creds = get_exchange_credentials(ex);
            if (creds.api_key || creds.wallet_address) {
                await init_exchange(ex, {
                    api_key: creds.api_key,
                    api_secret: creds.api_secret,
                    passphrase: creds.passphrase,
                    wallet_address: creds.wallet_address,
                    private_key: creds.private_key,
                });
                refresh_account(ex).catch(console.error);

                if (ex === 'binance') {
                    fetch_binance_max_leverage()
                        .then((leverages) => update_max_leverage('binance', leverages))
                        .catch(console.error);
                }
            }
        })
    );
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

    const markets_promise = Promise.all(
        exchanges_to_load.filter((ex) => !has_markets(ex)).map((ex) => load_exchange(ex))
    );

    markets_promise.catch(() => {});

    if (connected.length > 0) {
        await init_connected_exchange_instances(connected);
    }
}
