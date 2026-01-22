import { signal, computed, batch } from '@preact/signals';
import type { ExchangeId } from '../types/exchange.types';
import type { Balance } from '../types/trading.types';
import type { Position, Order, TradeHistory, AccountTab } from '../types/account.types';
import {
    fetch_balance as fetch_balance_api,
    fetch_positions as fetch_positions_api,
    fetch_orders as fetch_orders_api,
    fetch_closed_positions as fetch_closed_positions_api,
    has_exchange,
} from '../services/exchange/account_bridge';
import { get_market, has_markets } from './exchange_store';
import { STORAGE_CONSTANTS, ACCOUNT_CONSTANTS } from '../config/chart.constants';

function load_privacy_mode(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_CONSTANTS.ACCOUNT_PRIVACY_KEY);
        if (stored) return stored === 'true';
    } catch {}
    return false;
}

function save_privacy_mode(value: boolean): void {
    try {
        localStorage.setItem(STORAGE_CONSTANTS.ACCOUNT_PRIVACY_KEY, String(value));
    } catch {}
}

export const balances = signal<Map<ExchangeId, Balance>>(new Map());
export const positions = signal<Map<string, Position>>(new Map());
export const orders = signal<Map<string, Order>>(new Map());
export const history = signal<TradeHistory[]>([]);
export const active_tab = signal<AccountTab>('positions');
export const privacy_mode = signal(load_privacy_mode());
export const loading = signal({ balance: false, positions: false, orders: false, history: false });

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
    const current = positions.value;
    if (position.size === 0) {
        if (!current.has(position.id)) return;
        const map = new Map(current);
        map.delete(position.id);
        positions.value = map;
    } else {
        if (current.get(position.id) === position) return;
        const map = new Map(current);
        map.set(position.id, position);
        positions.value = map;
    }
}

export function update_positions_batch(updates: Position[]): void {
    if (updates.length === 0) return;
    const current = positions.value;
    const map = new Map(current);
    let changed = false;
    for (const pos of updates) {
        if (pos.size === 0) {
            if (map.has(pos.id)) {
                map.delete(pos.id);
                changed = true;
            }
        } else if (map.get(pos.id) !== pos) {
            map.set(pos.id, pos);
            changed = true;
        }
    }
    if (changed) positions.value = map;
}

export function clear_positions(): void {
    if (positions.value.size === 0) return;
    positions.value = new Map();
}

export function recalculate_blofin_positions(): void {
    const current = positions.value;
    let has_blofin = false;

    for (const pos of current.values()) {
        if (pos.exchange === 'blofin' && pos.contracts !== undefined) {
            has_blofin = true;
            break;
        }
    }

    if (!has_blofin) return;

    let changed = false;
    const map = new Map(current);

    for (const [id, pos] of map) {
        if (pos.exchange !== 'blofin' || pos.contracts === undefined) continue;

        const market = get_market('blofin', pos.symbol);
        const contract_size = market?.contract_size;
        if (!contract_size || contract_size <= 0) continue;

        const new_size = pos.contracts * contract_size;
        if (new_size !== pos.size) {
            map.set(id, { ...pos, size: new_size });
            changed = true;
        }
    }

    if (changed) positions.value = map;
}

export function update_order(order: Order): void {
    const current = orders.value;
    const shouldRemove = order.status === 'closed' || order.status === 'canceled';
    if (shouldRemove) {
        if (!current.has(order.id)) return;
        const map = new Map(current);
        map.delete(order.id);
        orders.value = map;
    } else {
        if (current.get(order.id) === order) return;
        const map = new Map(current);
        map.set(order.id, order);
        orders.value = map;
    }
}

export function update_orders_batch(updates: Order[]): void {
    if (updates.length === 0) return;
    const current = orders.value;
    const map = new Map(current);
    let changed = false;
    for (const order of updates) {
        const shouldRemove = order.status === 'closed' || order.status === 'canceled';
        if (shouldRemove) {
            if (map.has(order.id)) {
                map.delete(order.id);
                changed = true;
            }
        } else if (map.get(order.id) !== order) {
            map.set(order.id, order);
            changed = true;
        }
    }
    if (changed) orders.value = map;
}

export function clear_orders(): void {
    if (orders.value.size === 0) return;
    orders.value = new Map();
}

export function add_history(trade: TradeHistory): void {
    history.value = [trade, ...history.value].slice(0, ACCOUNT_CONSTANTS.HISTORY_LIMIT);
}

export function add_history_batch(trades: TradeHistory[]): void {
    if (trades.length === 0) return;
    const current = history.value;
    const merged = new Array<TradeHistory>(
        Math.min(trades.length + current.length, ACCOUNT_CONSTANTS.HISTORY_LIMIT)
    );
    let ti = 0,
        ci = 0,
        mi = 0;
    const sorted_trades = trades.toSorted((a, b) => b.closed_at - a.closed_at);
    while (
        mi < ACCOUNT_CONSTANTS.HISTORY_LIMIT &&
        (ti < sorted_trades.length || ci < current.length)
    ) {
        if (ti >= sorted_trades.length) {
            merged[mi++] = current[ci++];
        } else if (ci >= current.length) {
            merged[mi++] = sorted_trades[ti++];
        } else if (sorted_trades[ti].closed_at >= current[ci].closed_at) {
            merged[mi++] = sorted_trades[ti++];
        } else {
            merged[mi++] = current[ci++];
        }
    }
    history.value = merged;
}

export function clear_history(): void {
    if (history.value.length === 0) return;
    history.value = [];
}

export function update_balance(exchange_id: ExchangeId, balance: Balance): void {
    const current = balances.value;
    if (current.get(exchange_id) === balance) return;
    const map = new Map(current);
    map.set(exchange_id, balance);
    balances.value = map;
}

export function clear_balance(exchange_id: ExchangeId): void {
    const current = balances.value;
    if (!current.has(exchange_id)) return;
    const map = new Map(current);
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
        console.error(`failed to fetch ${exchange_id} balance:`, (err as Error).message);
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

        const should_recalc = exchange_id === 'blofin' && has_markets('blofin');

        for (const pos of fetched) {
            if (should_recalc && pos.contracts !== undefined) {
                const market = get_market('blofin', pos.symbol);
                const contract_size = market?.contract_size;
                if (
                    contract_size &&
                    contract_size > 0 &&
                    pos.size !== pos.contracts * contract_size
                ) {
                    map.set(pos.id, { ...pos, size: pos.contracts * contract_size });
                    continue;
                }
            }
            map.set(pos.id, pos);
        }

        positions.value = map;
    } catch (err) {
        console.error(`failed to fetch ${exchange_id} positions:`, (err as Error).message);
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
        console.error(`failed to fetch ${exchange_id} orders:`, (err as Error).message);
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

export const tpsl_modal_position = signal<Position | null>(null);

export function open_tpsl_modal(position: Position): void {
    tpsl_modal_position.value = position;
}

export function close_tpsl_modal(): void {
    tpsl_modal_position.value = null;
}

export async function cancel_order(_exchange_id: ExchangeId, _order_id: string): Promise<void> {
    return;
}

export async function close_position(_exchange_id: ExchangeId, _symbol: string): Promise<void> {
    return;
}

export async function refresh_history(exchange_ids: ExchangeId[]): Promise<void> {
    const connected = exchange_ids.filter(has_exchange);
    if (connected.length === 0) return;

    loading.value = { ...loading.value, history: true };
    try {
        const results = await Promise.all(
            connected.map((id) => fetch_closed_positions_api(id).catch(() => []))
        );
        const all_trades = results.flat();
        all_trades.sort((a, b) => b.closed_at - a.closed_at);
        history.value = all_trades.slice(0, ACCOUNT_CONSTANTS.HISTORY_LIMIT);
    } catch (err) {
        console.error('failed to fetch trade history:', (err as Error).message);
    } finally {
        loading.value = { ...loading.value, history: false };
    }
}
