import { useState, useCallback } from 'preact/hooks';
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

function EyeOpenIcon() {
    return (
        <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeClosedIcon() {
    return (
        <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="m15 18-.722-3.25" />
            <path d="M2 8a10.645 10.645 0 0 0 20 0" />
            <path d="m20 15-1.726-2.05" />
            <path d="m4 15 1.726-2.05" />
            <path d="m9 18 .722-3.25" />
        </svg>
    );
}

function NukeIcon() {
    return (
        <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0" />
            <path d="M12 9v4" />
            <path d="M12 17v.01" />
        </svg>
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
        <div class="flex items-center gap-1 px-2 py-1 border-b border-base-300/50">
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
                {is_private ? <EyeClosedIcon /> : <EyeOpenIcon />}
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
                <NukeIcon />
            </button>
        </div>
    );
}
