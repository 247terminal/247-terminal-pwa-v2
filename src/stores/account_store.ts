import { signal, computed, batch } from '@preact/signals';
import type { ExchangeId } from '../types/exchange.types';
import type { Balance } from '../types/trading.types';
import type { Position, Order, TradeHistory, AccountTab } from '../types/account.types';
import {
    fetch_balance as fetch_balance_api,
    fetch_positions as fetch_positions_api,
    fetch_orders as fetch_orders_api,
    has_exchange,
} from '../services/exchange/account';

const PRIVACY_STORAGE_KEY = '247terminal_account_privacy';
const HISTORY_LIMIT = 100;

function load_privacy_mode(): boolean {
    try {
        const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
        if (stored) return stored === 'true';
    } catch {}
    return false;
}

function save_privacy_mode(value: boolean): void {
    try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(value));
    } catch {}
}

export const balances = signal<Map<ExchangeId, Balance>>(new Map());
export const positions = signal<Map<string, Position>>(new Map());
export const orders = signal<Map<string, Order>>(new Map());
export const history = signal<TradeHistory[]>([]);
export const active_tab = signal<AccountTab>('positions');
export const privacy_mode = signal(load_privacy_mode());
export const loading = signal({ balance: false, positions: false, orders: false });

export const positions_count = computed(() => positions.value.size);
export const orders_count = computed(() => orders.value.size);
export const positions_list = computed(() => Array.from(positions.value.values()));
export const orders_list = computed(() => Array.from(orders.value.values()));

export function get_balance(exchange_id: ExchangeId): Balance | null {
    return balances.value.get(exchange_id) ?? null;
}

export const total_balance = computed(() => {
    let total = 0;
    for (const b of balances.value.values()) {
        total += b.total;
    }
    return total;
});

export const total_available = computed(() => {
    let available = 0;
    for (const b of balances.value.values()) {
        available += b.available;
    }
    return available;
});

export function set_active_tab(tab: AccountTab): void {
    active_tab.value = tab;
}

export function toggle_privacy(): void {
    const new_value = !privacy_mode.value;
    privacy_mode.value = new_value;
    save_privacy_mode(new_value);
}

export function update_position(position: Position): void {
    const map = new Map(positions.value);
    if (position.size === 0) {
        map.delete(position.id);
    } else {
        map.set(position.id, position);
    }
    positions.value = map;
}

export function update_positions_batch(updates: Position[]): void {
    batch(() => {
        const map = new Map(positions.value);
        for (const pos of updates) {
            if (pos.size === 0) {
                map.delete(pos.id);
            } else {
                map.set(pos.id, pos);
            }
        }
        positions.value = map;
    });
}

export function clear_positions(): void {
    positions.value = new Map();
}

export function update_order(order: Order): void {
    const map = new Map(orders.value);
    if (order.status === 'closed' || order.status === 'canceled') {
        map.delete(order.id);
    } else {
        map.set(order.id, order);
    }
    orders.value = map;
}

export function update_orders_batch(updates: Order[]): void {
    batch(() => {
        const map = new Map(orders.value);
        for (const order of updates) {
            if (order.status === 'closed' || order.status === 'canceled') {
                map.delete(order.id);
            } else {
                map.set(order.id, order);
            }
        }
        orders.value = map;
    });
}

export function clear_orders(): void {
    orders.value = new Map();
}

export function add_history(trade: TradeHistory): void {
    history.value = [trade, ...history.value].slice(0, HISTORY_LIMIT);
}

export function add_history_batch(trades: TradeHistory[]): void {
    batch(() => {
        const sorted = [...trades].sort((a, b) => b.closed_at - a.closed_at);
        history.value = [...sorted, ...history.value].slice(0, HISTORY_LIMIT);
    });
}

export function clear_history(): void {
    history.value = [];
}

export function update_balance(exchange_id: ExchangeId, balance: Balance): void {
    const map = new Map(balances.value);
    map.set(exchange_id, balance);
    balances.value = map;
}

export function clear_balance(exchange_id: ExchangeId): void {
    const map = new Map(balances.value);
    map.delete(exchange_id);
    balances.value = map;
}

export function clear_exchange_data(exchange_id: ExchangeId): void {
    batch(() => {
        clear_balance(exchange_id);

        const pos_map = new Map<string, Position>();
        for (const [id, p] of positions.value) {
            if (p.exchange !== exchange_id) pos_map.set(id, p);
        }
        positions.value = pos_map;

        const ord_map = new Map<string, Order>();
        for (const [id, o] of orders.value) {
            if (o.exchange !== exchange_id) ord_map.set(id, o);
        }
        orders.value = ord_map;
    });
}

export async function refresh_balance(exchange_id: ExchangeId): Promise<void> {
    if (!has_exchange(exchange_id)) return;

    loading.value = { ...loading.value, balance: true };
    try {
        const balance = await fetch_balance_api(exchange_id);
        if (balance) {
            update_balance(exchange_id, balance);
        }
    } catch (err) {
        console.error(`[balance] ${exchange_id} error:`, err);
    } finally {
        loading.value = { ...loading.value, balance: false };
    }
}

export async function refresh_positions(exchange_id: ExchangeId): Promise<void> {
    if (!has_exchange(exchange_id)) return;

    loading.value = { ...loading.value, positions: true };
    try {
        const fetched = await fetch_positions_api(exchange_id);
        const map = new Map<string, Position>();
        for (const [id, p] of positions.value) {
            if (p.exchange !== exchange_id) map.set(id, p);
        }
        for (const pos of fetched) {
            map.set(pos.id, pos);
        }
        positions.value = map;
    } catch (err) {
        console.error(`[positions] ${exchange_id} error:`, err);
    } finally {
        loading.value = { ...loading.value, positions: false };
    }
}

export async function refresh_orders(exchange_id: ExchangeId): Promise<void> {
    if (!has_exchange(exchange_id)) return;

    loading.value = { ...loading.value, orders: true };
    try {
        const fetched = await fetch_orders_api(exchange_id);
        const map = new Map<string, Order>();
        for (const [id, o] of orders.value) {
            if (o.exchange !== exchange_id) map.set(id, o);
        }
        for (const order of fetched) {
            map.set(order.id, order);
        }
        orders.value = map;
    } catch (err) {
        console.error(`[orders] ${exchange_id} error:`, err);
    } finally {
        loading.value = { ...loading.value, orders: false };
    }
}

export async function refresh_account(exchange_id: ExchangeId): Promise<void> {
    await Promise.all([
        refresh_balance(exchange_id),
        refresh_positions(exchange_id),
        refresh_orders(exchange_id),
    ]);
}

export async function refresh_all_accounts(exchange_ids: ExchangeId[]): Promise<void> {
    await Promise.all(exchange_ids.map((id) => refresh_account(id)));
}
