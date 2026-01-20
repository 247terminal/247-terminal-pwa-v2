import { signal, computed, batch } from '@preact/signals';
import type { ExchangeId } from '@/types/exchange.types';
import type { Position, Order } from '@/types/account.types';
import type {
    TradingAccounts,
    ExchangeAccountState,
    ExchangeConfig,
    SymbolSettings,
    Balance,
} from '@/types/trading.types';

export const trading_accounts = signal<TradingAccounts>({});
export const active_trading_exchange = signal<ExchangeId | null>(null);

export const active_account = computed(() => {
    const exchange = active_trading_exchange.value;
    if (!exchange) return null;
    return trading_accounts.value[exchange] ?? null;
});

export const active_balance = computed(() => active_account.value?.balance ?? null);

export const active_positions = computed(() => active_account.value?.positions ?? []);

export const active_orders = computed(() => active_account.value?.open_orders ?? []);

export const connected_exchanges = computed(() => {
    const accounts = trading_accounts.value;
    return Object.values(accounts)
        .filter((a): a is ExchangeAccountState => a?.connected === true)
        .map((a) => a.exchange_id);
});

export function get_account(exchange_id: ExchangeId): ExchangeAccountState | null {
    return trading_accounts.value[exchange_id] ?? null;
}

export function get_balance(exchange_id: ExchangeId): Balance | null {
    return trading_accounts.value[exchange_id]?.balance ?? null;
}

export function get_positions(exchange_id: ExchangeId): Position[] {
    return trading_accounts.value[exchange_id]?.positions ?? [];
}

export function get_orders(exchange_id: ExchangeId): Order[] {
    return trading_accounts.value[exchange_id]?.open_orders ?? [];
}

export function get_symbol_settings(
    exchange_id: ExchangeId,
    symbol: string
): SymbolSettings | null {
    return trading_accounts.value[exchange_id]?.symbol_settings[symbol] ?? null;
}

export function set_active_exchange(exchange_id: ExchangeId | null): void {
    active_trading_exchange.value = exchange_id;
}

export function initialize_account(
    exchange_id: ExchangeId,
    config: ExchangeConfig,
    symbol_settings: Record<string, SymbolSettings>
): void {
    const account: ExchangeAccountState = {
        exchange_id,
        connected: true,
        config,
        symbol_settings,
        balance: null,
        positions: [],
        open_orders: [],
        ws_connected: false,
        ws_last_ping: 0,
    };

    trading_accounts.value = {
        ...trading_accounts.value,
        [exchange_id]: account,
    };
}

export function update_balance(exchange_id: ExchangeId, balance: Balance): void {
    const accounts = trading_accounts.value;
    const account = accounts[exchange_id];
    if (!account) return;

    trading_accounts.value = {
        ...accounts,
        [exchange_id]: { ...account, balance },
    };
}

export function update_positions(exchange_id: ExchangeId, positions: Position[]): void {
    const accounts = trading_accounts.value;
    const account = accounts[exchange_id];
    if (!account) return;

    trading_accounts.value = {
        ...accounts,
        [exchange_id]: { ...account, positions },
    };
}

export function update_orders(exchange_id: ExchangeId, orders: Order[]): void {
    const accounts = trading_accounts.value;
    const account = accounts[exchange_id];
    if (!account) return;

    trading_accounts.value = {
        ...accounts,
        [exchange_id]: { ...account, open_orders: orders },
    };
}

export function update_account_data(
    exchange_id: ExchangeId,
    data: { balance?: Balance; positions?: Position[]; orders?: Order[] }
): void {
    batch(() => {
        const accounts = trading_accounts.value;
        const account = accounts[exchange_id];
        if (!account) return;

        trading_accounts.value = {
            ...accounts,
            [exchange_id]: {
                ...account,
                ...(data.balance !== undefined && { balance: data.balance }),
                ...(data.positions !== undefined && { positions: data.positions }),
                ...(data.orders !== undefined && { open_orders: data.orders }),
            },
        };
    });
}

export function update_symbol_settings(
    exchange_id: ExchangeId,
    symbol: string,
    settings: Partial<SymbolSettings>
): void {
    const accounts = trading_accounts.value;
    const account = accounts[exchange_id];
    if (!account) return;

    const current = account.symbol_settings[symbol];
    if (!current) return;

    trading_accounts.value = {
        ...accounts,
        [exchange_id]: {
            ...account,
            symbol_settings: {
                ...account.symbol_settings,
                [symbol]: { ...current, ...settings },
            },
        },
    };
}

export function set_ws_connected(exchange_id: ExchangeId, connected: boolean): void {
    const accounts = trading_accounts.value;
    const account = accounts[exchange_id];
    if (!account) return;

    trading_accounts.value = {
        ...accounts,
        [exchange_id]: {
            ...account,
            ws_connected: connected,
            ws_last_ping: connected ? Date.now() : account.ws_last_ping,
        },
    };
}

export function disconnect_account(exchange_id: ExchangeId): void {
    batch(() => {
        const accounts = trading_accounts.value;
        const account = accounts[exchange_id];
        if (!account) return;

        trading_accounts.value = {
            ...accounts,
            [exchange_id]: {
                ...account,
                connected: false,
                ws_connected: false,
                balance: null,
                positions: [],
                open_orders: [],
            },
        };

        if (active_trading_exchange.value === exchange_id) {
            const remaining = connected_exchanges.value.filter((e) => e !== exchange_id);
            active_trading_exchange.value = remaining[0] ?? null;
        }
    });
}

export function clear_all_accounts(): void {
    batch(() => {
        trading_accounts.value = {};
        active_trading_exchange.value = null;
    });
}
