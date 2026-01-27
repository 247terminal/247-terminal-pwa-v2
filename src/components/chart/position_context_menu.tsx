import { memo } from 'preact/compat';
import { useState, useCallback, useRef, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { toast } from 'sonner';
import type { PositionContextMenuProps } from '../../types/chart.types';
import { close_position, cancel_order, set_tpsl, refresh_orders } from '../../stores/account_store';
import { get_ticker_signal, get_market } from '../../stores/exchange_store';
import { format_price, extract_error_message } from '../../utils/format';
import { use_click_outside, use_escape_key } from '../../hooks';
import { format_symbol } from './symbol_row';
import { get_exchange_icon } from '../common/exchanges';
import { CONTEXT_MENU_CONSTANTS } from '../../config/chart.constants';
import { X, ShieldAlert } from 'lucide-preact';

export const PositionContextMenu = memo(function PositionContextMenu({
    position,
    orders,
    x,
    y,
    on_close,
}: PositionContextMenuProps) {
    const menu_ref = useRef<HTMLDivElement>(null);
    const [is_closing, set_is_closing] = useState(false);
    const [is_setting_sl, set_is_setting_sl] = useState(false);

    const ticker = get_ticker_signal(position.exchange, position.symbol).value;
    const market = get_market(position.exchange, position.symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const current_price = ticker?.last_price ?? position.last_price;
    const is_long = position.side === 'long';
    const formatted_symbol = format_symbol(position.symbol);

    const existing_sl = useMemo(() => {
        const close_side = is_long ? 'sell' : 'buy';
        return orders.find(
            (o) =>
                o.symbol === position.symbol &&
                o.exchange === position.exchange &&
                o.type === 'stop_loss' &&
                o.side === close_side
        );
    }, [orders, position.symbol, position.exchange, is_long]);

    const can_set_sl_to_entry = is_long
        ? current_price > position.entry_price
        : current_price < position.entry_price;

    use_click_outside(menu_ref, on_close);
    use_escape_key(on_close);

    const handle_close_position = useCallback(async () => {
        set_is_closing(true);
        try {
            const success = await close_position(position.exchange, position.symbol, 100, 'market');
            if (success) {
                toast.success(`${formatted_symbol} position closed`);
            } else {
                toast.error(`Failed to close ${formatted_symbol}`);
            }
            on_close();
        } catch (err) {
            toast.error(`Failed to close ${formatted_symbol}: ${extract_error_message(err)}`);
        } finally {
            set_is_closing(false);
        }
    }, [position.exchange, position.symbol, formatted_symbol, on_close]);

    const handle_sl_to_entry = useCallback(async () => {
        set_is_setting_sl(true);
        try {
            if (existing_sl) {
                await cancel_order(
                    existing_sl.exchange,
                    existing_sl.id,
                    existing_sl.symbol,
                    existing_sl.category
                );
            }

            await set_tpsl(
                position.exchange,
                position.symbol,
                undefined,
                'market',
                position.entry_price
            );

            toast.success(`${formatted_symbol} SL set to entry`);
            refresh_orders(position.exchange).catch(console.error);
            on_close();
        } catch (err) {
            toast.error(`Failed to set ${formatted_symbol} SL: ${extract_error_message(err)}`);
        } finally {
            set_is_setting_sl(false);
        }
    }, [
        existing_sl,
        position.exchange,
        position.symbol,
        position.entry_price,
        formatted_symbol,
        on_close,
    ]);

    const menu_style = useMemo(() => {
        const { WIDTH, HEIGHT, PADDING, Z_INDEX } = CONTEXT_MENU_CONSTANTS;

        let left = x;
        let top = y;

        if (x + WIDTH > window.innerWidth - PADDING) {
            left = x - WIDTH;
        }
        if (y + HEIGHT > window.innerHeight - PADDING) {
            top = y - HEIGHT;
        }

        left = Math.max(PADDING, left);
        top = Math.max(PADDING, top);

        return {
            position: 'fixed' as const,
            left: `${left}px`,
            top: `${top}px`,
            zIndex: Z_INDEX,
        };
    }, [x, y]);

    const is_submitting = is_closing || is_setting_sl;

    return createPortal(
        <div
            ref={menu_ref}
            class="w-45 bg-base-200 border border-base-300 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100"
            style={menu_style}
            role="menu"
        >
            <div class="px-3 py-2 border-b border-base-300/50">
                <div class="flex items-center justify-between">
                    <span class="flex items-center gap-1.5 text-xs font-medium text-base-content">
                        <span class="text-base-content/50">
                            {get_exchange_icon(position.exchange)}
                        </span>
                        {formatted_symbol}
                    </span>
                    <span
                        class={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            is_long ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                        }`}
                    >
                        {is_long ? 'LONG' : 'SHORT'}
                    </span>
                </div>
                <div class="text-[10px] text-base-content/50 mt-0.5">
                    Entry: {format_price(position.entry_price, tick_size)}
                </div>
            </div>

            <div class="p-1.5 space-y-1">
                <button
                    type="button"
                    onClick={handle_close_position}
                    disabled={is_submitting}
                    class="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <X class="w-3.5 h-3.5" />
                    {is_closing ? 'Closing...' : 'Close Position'}
                </button>

                <button
                    type="button"
                    onClick={handle_sl_to_entry}
                    disabled={is_submitting || !can_set_sl_to_entry}
                    class="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                        !can_set_sl_to_entry
                            ? 'Position must be in profit to set SL to entry'
                            : existing_sl
                              ? 'Will cancel existing SL and set to entry'
                              : 'Set stop loss to entry price'
                    }
                >
                    <ShieldAlert class="w-3.5 h-3.5" />
                    {is_setting_sl
                        ? 'Setting...'
                        : existing_sl
                          ? 'Move SL to Entry'
                          : 'SL to Entry'}
                </button>

                {!can_set_sl_to_entry && (
                    <div class="px-2 py-1 text-[10px] text-base-content/40 text-center">
                        Position must be in profit
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
});
