import { signal, computed } from '@preact/signals';
import type { TwapOrder, TwapProgressUpdate } from '../types/twap.types';
import { TWAP_CONSTANTS } from '../config/trading.constants';

const active_twaps = signal<Map<string, TwapOrder>>(new Map());

export const active_twaps_list = computed(() => {
    return Array.from(active_twaps.value.values());
});

export const active_twap_count = computed(() => {
    let count = 0;
    for (const twap of active_twaps.value.values()) {
        if (twap.status === 'active') count++;
    }
    return count;
});

export function add_twap(twap: TwapOrder): void {
    const updated = new Map(active_twaps.value);
    updated.set(twap.id, twap);
    active_twaps.value = updated;
}

export function update_twap(id: string, update: TwapProgressUpdate): void {
    const current = active_twaps.value.get(id);
    if (!current) return;

    const updated = new Map(active_twaps.value);
    updated.set(id, {
        ...current,
        orders_placed: update.orders_placed,
        orders_failed: update.orders_failed,
        status: update.status,
    });
    active_twaps.value = updated;

    if (
        update.status === 'completed' ||
        update.status === 'cancelled' ||
        update.status === 'error'
    ) {
        setTimeout(() => remove_twap(id), TWAP_CONSTANTS.COMPLETED_DISPLAY_MS);
    }
}

export function remove_twap(id: string): void {
    const updated = new Map(active_twaps.value);
    updated.delete(id);
    active_twaps.value = updated;
}

export function get_twap_progress(twap: TwapOrder): {
    percent: number;
    remaining_ms: number;
    orders_remaining: number;
} {
    const percent = (twap.orders_placed / twap.orders_count) * 100;
    const elapsed_ms = Date.now() - twap.started_at;
    const total_duration_ms = twap.duration_minutes * 60 * 1000;
    const remaining_ms = Math.max(0, total_duration_ms - elapsed_ms);
    const orders_remaining = twap.orders_count - twap.orders_placed;

    return {
        percent,
        remaining_ms,
        orders_remaining,
    };
}
