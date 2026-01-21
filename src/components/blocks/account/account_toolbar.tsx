import { useState, useCallback } from 'preact/hooks';
import { Eye, EyeOff, RefreshCw, Radiation } from 'lucide-preact';
import type { AccountTab, TabButtonProps } from '../../../types/account.types';
import { EXCHANGE_IDS } from '../../../types/exchange.types';
import {
    active_tab,
    set_active_tab,
    positions_count,
    orders_count,
    privacy_mode,
    toggle_privacy,
    loading,
    refresh_all_accounts,
} from '../../../stores/account_store';
import { exchange_connection_status } from '../../../stores/credentials_store';

function TabButton({ tab, label, count }: TabButtonProps) {
    const is_active = active_tab.value === tab;

    return (
        <button
            type="button"
            onClick={() => set_active_tab(tab)}
            class={`px-2 py-1 text-xs rounded transition-colors ${
                is_active
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
            }`}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span class="ml-1 text-[10px] opacity-70">({count})</span>
            )}
        </button>
    );
}

export function AccountToolbar() {
    const [refreshing, set_refreshing] = useState(false);
    const is_private = privacy_mode.value;
    const pos_count = positions_count.value;
    const ord_count = orders_count.value;
    const is_loading = loading.value.balance || loading.value.positions || loading.value.orders;

    const handle_refresh = useCallback(async () => {
        if (refreshing || is_loading) return;
        set_refreshing(true);
        try {
            const status = exchange_connection_status.value;
            const connected = EXCHANGE_IDS.filter((ex) => status[ex]);
            if (connected.length > 0) {
                await refresh_all_accounts(connected);
            }
        } finally {
            set_refreshing(false);
        }
    }, [refreshing, is_loading]);

    return (
        <div class="drag-handle flex items-center gap-1 px-2 py-1.5 border-b border-base-300/50 cursor-move">
            <TabButton tab="positions" label="Positions" count={pos_count} />
            <TabButton tab="orders" label="Orders" count={ord_count} />
            <TabButton tab="history" label="History" />

            <div class="flex-1" />

            <button
                type="button"
                onClick={toggle_privacy}
                class="p-1 rounded text-base-content/50 hover:text-base-content hover:bg-base-300 transition-colors"
                title={is_private ? 'Show values' : 'Hide values'}
            >
                {is_private ? <EyeOff class="w-4 h-4" /> : <Eye class="w-4 h-4" />}
            </button>

            <button
                type="button"
                onClick={handle_refresh}
                disabled={refreshing || is_loading}
                class="p-1 rounded text-base-content/50 hover:text-base-content hover:bg-base-300 transition-colors disabled:opacity-50"
                title="Refresh account data"
            >
                <RefreshCw class={`w-4 h-4 ${refreshing || is_loading ? 'animate-spin' : ''}`} />
            </button>

            <button
                type="button"
                class="p-1 rounded text-base-content/50 hover:text-error hover:bg-base-300 transition-colors"
                title="Close all positions"
            >
                <Radiation class="w-4 h-4" />
            </button>
        </div>
    );
}
