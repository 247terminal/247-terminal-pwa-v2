import { signal, computed, batch } from '@preact/signals';
import type { Position, Order, TradeHistory, AccountTab } from '../types/account.types';

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

export const positions = signal<Map<string, Position>>(new Map());
export const orders = signal<Map<string, Order>>(new Map());
export const history = signal<TradeHistory[]>([]);
export const active_tab = signal<AccountTab>('positions');
export const privacy_mode = signal(load_privacy_mode());

export const positions_count = computed(() => positions.value.size);
export const orders_count = computed(() => orders.value.size);
export const positions_list = computed(() => Array.from(positions.value.values()));
export const orders_list = computed(() => Array.from(orders.value.values()));

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

export function nuke_positions(): void {
    console.error('nuke positions not implemented - requires exchange api integration');
}
