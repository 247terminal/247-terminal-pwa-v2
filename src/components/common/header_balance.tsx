import { useState, useRef, useMemo, useEffect, useCallback } from 'preact/hooks';
import { Wallet } from 'lucide-preact';
import { exchange_connection_status, has_connected_exchange } from '@/stores/credentials_store';
import { balances, total_balance, total_available, privacy_mode } from '@/stores/account_store';
import { EXCHANGE_ORDER, EXCHANGE_DISPLAY_NAMES, type ExchangeId } from '@/types/exchange.types';
import { get_exchange_icon } from './exchanges';
import { mask_value, format_usd_full } from '@/utils/account_format';

export function HeaderBalance() {
    const [is_open, set_is_open] = useState(false);
    const close_timeout_ref = useRef<number | null>(null);
    const container_ref = useRef<HTMLDivElement>(null);
    const is_open_ref = useRef(is_open);
    is_open_ref.current = is_open;

    const connection_status = exchange_connection_status.value;
    const has_exchange = has_connected_exchange.value;
    const total = total_balance.value;
    const available = total_available.value;
    const balances_map = balances.value;
    const is_private = privacy_mode.value;

    const connected_exchanges = useMemo(
        () => EXCHANGE_ORDER.filter((id) => connection_status[id]),
        [connection_status]
    );

    useEffect(() => {
        function handle_keydown(e: KeyboardEvent) {
            if (e.key === 'Escape' && is_open_ref.current) {
                set_is_open(false);
            }
        }
        document.addEventListener('keydown', handle_keydown);
        return () => {
            document.removeEventListener('keydown', handle_keydown);
            if (close_timeout_ref.current) {
                clearTimeout(close_timeout_ref.current);
            }
        };
    }, []);

    const handle_mouse_enter = useCallback(() => {
        if (close_timeout_ref.current) {
            clearTimeout(close_timeout_ref.current);
            close_timeout_ref.current = null;
        }
        set_is_open(true);
    }, []);

    const handle_mouse_leave = useCallback(() => {
        close_timeout_ref.current = window.setTimeout(() => {
            set_is_open(false);
        }, 150);
    }, []);

    const handle_focus = useCallback(() => {
        set_is_open(true);
    }, []);

    const handle_blur = useCallback((e: FocusEvent) => {
        if (!container_ref.current?.contains(e.relatedTarget as Node)) {
            set_is_open(false);
        }
    }, []);

    if (!has_exchange) {
        return (
            <div class="flex items-center gap-1.5 px-2 py-1 text-xs text-base-content/40">
                <Wallet class="w-3 h-3" />
                <span>No exchanges</span>
            </div>
        );
    }

    return (
        <div
            ref={container_ref}
            class="relative"
            onMouseEnter={handle_mouse_enter}
            onMouseLeave={handle_mouse_leave}
        >
            <button
                type="button"
                onFocus={handle_focus}
                onBlur={handle_blur}
                class="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded text-xs hover:bg-primary/20 transition-colors"
            >
                <Wallet class="w-3 h-3 text-primary/60" />
                <span class="font-medium text-primary">
                    {mask_value(format_usd_full(total), is_private)}
                </span>
            </button>

            {is_open && (
                <div class="absolute top-full right-0 mt-1 w-48 bg-base-100 rounded shadow-lg z-50 py-1 border border-base-content/10">
                    <div class="px-3 py-1.5 text-[10px] font-semibold text-base-content/50 uppercase tracking-wide">
                        Portfolio Balance
                    </div>
                    <div class="border-t border-base-content/10">
                        {connected_exchanges.map((exchange_id) => {
                            const balance = balances_map.get(exchange_id);
                            const exchange_total = balance?.total ?? 0;
                            return (
                                <div
                                    key={exchange_id}
                                    class="flex items-center gap-2 px-3 py-1.5 hover:bg-base-200 transition-colors"
                                >
                                    <span class="text-base-content/40 shrink-0">
                                        {get_exchange_icon(exchange_id)}
                                    </span>
                                    <span class="text-xs text-base-content/70 flex-1">
                                        {EXCHANGE_DISPLAY_NAMES[exchange_id]}
                                    </span>
                                    <span class="text-xs font-medium text-base-content">
                                        {mask_value(format_usd_full(exchange_total), is_private)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div class="border-t border-base-content/10 mt-1">
                        <div class="flex items-center justify-between px-3 py-1.5">
                            <span class="text-[10px] text-base-content/50">Available</span>
                            <span class="text-xs font-medium text-base-content">
                                {mask_value(format_usd_full(available), is_private)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
