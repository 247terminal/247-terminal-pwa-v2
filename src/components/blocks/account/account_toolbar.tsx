import { useState, useCallback } from 'preact/hooks';
import { Eye, EyeOff, Radiation } from 'lucide-preact';
import type { AccountTab } from '../../../types/account.types';
import {
    active_tab,
    set_active_tab,
    positions_count,
    orders_count,
    privacy_mode,
    toggle_privacy,
    nuke_positions,
} from '../../../stores/account_store';

interface TabButtonProps {
    tab: AccountTab;
    label: string;
    count?: number;
}

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
    const [confirming_nuke, set_confirming_nuke] = useState(false);
    const is_private = privacy_mode.value;
    const pos_count = positions_count.value;
    const ord_count = orders_count.value;

    const handle_nuke_click = useCallback(() => {
        if (confirming_nuke) {
            nuke_positions();
            set_confirming_nuke(false);
        } else {
            set_confirming_nuke(true);
            setTimeout(() => set_confirming_nuke(false), 3000);
        }
    }, [confirming_nuke]);

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
                onClick={handle_nuke_click}
                class={`p-1 rounded transition-colors ${
                    confirming_nuke
                        ? 'bg-error text-error-content'
                        : 'text-base-content/50 hover:text-error hover:bg-base-300'
                }`}
                title={confirming_nuke ? 'Click again to confirm' : 'Close all positions'}
            >
                <Radiation class="w-4 h-4" />
            </button>
        </div>
    );
}
