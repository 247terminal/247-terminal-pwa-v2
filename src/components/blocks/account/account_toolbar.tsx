import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import {
    Eye,
    EyeOff,
    RefreshCw,
    Radiation,
    X,
    TrendingUp,
    TrendingDown,
    ListX,
} from 'lucide-preact';
import { toast } from 'sonner';
import type { TabButtonProps, NukeOption, NukeMenuOption } from '../../../types/account.types';
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
    cancel_all_orders,
    close_all_positions,
    nuke_all,
} from '../../../stores/account_store';
import { exchange_connection_status } from '../../../stores/credentials_store';
import { NUKE_MENU_CONSTANTS } from '../../../config/chart.constants';

const NUKE_OPTIONS: NukeMenuOption[] = [
    { id: 'all', label: 'All', icon: <X class="w-3 h-3" />, description: 'Positions & orders' },
    { id: 'orders', label: 'Orders', icon: <ListX class="w-3 h-3" />, description: 'Cancel all' },
    {
        id: 'longs',
        label: 'Longs',
        icon: <TrendingUp class="w-3 h-3" />,
        description: 'Close longs',
    },
    {
        id: 'shorts',
        label: 'Shorts',
        icon: <TrendingDown class="w-3 h-3" />,
        description: 'Close shorts',
    },
];

function NukeMenu() {
    const [is_open, set_is_open] = useState(false);
    const container_ref = useRef<HTMLDivElement>(null);
    const click_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!is_open) return;

        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') set_is_open(false);
        };
        const handle_click_outside = (e: MouseEvent) => {
            if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
                set_is_open(false);
            }
        };

        window.addEventListener('keydown', handle_keydown);
        document.addEventListener('mousedown', handle_click_outside);
        return () => {
            window.removeEventListener('keydown', handle_keydown);
            document.removeEventListener('mousedown', handle_click_outside);
        };
    }, [is_open]);

    useEffect(() => {
        return () => {
            if (click_timer_ref.current) clearTimeout(click_timer_ref.current);
        };
    }, []);

    const handle_option_click = useCallback(async (option: NukeOption) => {
        set_is_open(false);
        switch (option) {
            case 'orders': {
                const count = await cancel_all_orders();
                if (count > 0) {
                    toast.success(`Cancelled ${count} order${count > 1 ? 's' : ''}`);
                } else {
                    toast.error('No orders to cancel');
                }
                break;
            }
            case 'all': {
                const result = await nuke_all();
                const { positions_closed, orders_cancelled } = result;
                if (positions_closed > 0 || orders_cancelled > 0) {
                    toast.success(
                        `Closed ${positions_closed} position${positions_closed !== 1 ? 's' : ''}, cancelled ${orders_cancelled} order${orders_cancelled !== 1 ? 's' : ''}`
                    );
                } else {
                    toast.error('Nothing to close');
                }
                break;
            }
            case 'longs': {
                const result = await close_all_positions('long');
                if (result.closed > 0) {
                    toast.success(`Closed ${result.closed} long${result.closed !== 1 ? 's' : ''}`);
                } else {
                    toast.error('No longs to close');
                }
                break;
            }
            case 'shorts': {
                const result = await close_all_positions('short');
                if (result.closed > 0) {
                    toast.success(`Closed ${result.closed} short${result.closed !== 1 ? 's' : ''}`);
                } else {
                    toast.error('No shorts to close');
                }
                break;
            }
        }
    }, []);

    const handle_button_click = useCallback(() => {
        if (click_timer_ref.current) {
            clearTimeout(click_timer_ref.current);
            click_timer_ref.current = null;
            set_is_open(false);
            handle_option_click('all');
        } else if (is_open) {
            set_is_open(false);
        } else {
            set_is_open(true);
            click_timer_ref.current = setTimeout(() => {
                click_timer_ref.current = null;
            }, NUKE_MENU_CONSTANTS.DOUBLE_CLICK_DELAY_MS);
        }
    }, [handle_option_click, is_open]);

    return (
        <div ref={container_ref} class="relative">
            <button
                type="button"
                onClick={handle_button_click}
                class={`p-1 rounded transition-colors ${
                    is_open
                        ? 'text-error bg-error/10'
                        : 'text-base-content/50 hover:text-error hover:bg-base-300'
                }`}
                title="Close positions (double-click for all)"
            >
                <Radiation class="w-4 h-4" />
            </button>
            {is_open && (
                <div class="absolute right-0 top-full mt-1 w-40 bg-base-200 rounded-md shadow-lg border border-base-300 overflow-hidden z-50">
                    {NUKE_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handle_option_click(option.id)}
                            class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-error/10 hover:text-error transition-colors group"
                        >
                            <span class="text-base-content/50 group-hover:text-error transition-colors">
                                {option.icon}
                            </span>
                            <div class="flex flex-col gap-0.5">
                                <span class="text-xs font-medium text-base-content group-hover:text-error transition-colors leading-none">
                                    {option.label}
                                </span>
                                <span class="text-[10px] text-base-content/40 group-hover:text-error/60 transition-colors leading-none">
                                    {option.description}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
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

            <NukeMenu />
        </div>
    );
}
