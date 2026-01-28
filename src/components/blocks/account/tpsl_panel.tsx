import { memo } from 'preact/compat';
import { useState, useCallback, useRef, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { toast } from 'sonner';
import type { Position } from '../../../types/account.types';
import { get_market, get_ticker_signal } from '../../../stores/exchange_store';
import { set_tpsl } from '../../../stores/account_store';
import { format_price, DECIMAL_REGEX, extract_error_message } from '../../../utils/format';
import { calculate_position_pnl } from '../../../utils/pnl';
import { use_click_outside, use_escape_key } from '../../../hooks';
import { parse_symbol } from '../../chart/symbol_row';
import { TPSL_CONSTANTS } from '../../../config/trading.constants';

type TpSlOrderType = 'market' | 'limit';

interface TpSlPanelProps {
    position: Position;
    anchor_rect: DOMRect;
    on_close: () => void;
}

export const TpSlPanel = memo(function TpSlPanel({
    position,
    anchor_rect,
    on_close,
}: TpSlPanelProps) {
    const panel_ref = useRef<HTMLDivElement>(null);

    const [tp_enabled, set_tp_enabled] = useState(false);
    const [sl_enabled, set_sl_enabled] = useState(false);
    const [tp_price, set_tp_price] = useState('');
    const [sl_price, set_sl_price] = useState('');
    const [tp_order_type, set_tp_order_type] = useState<TpSlOrderType>('market');

    const tp_price_ref = useRef(tp_price);
    tp_price_ref.current = tp_price;
    const sl_price_ref = useRef(sl_price);
    sl_price_ref.current = sl_price;

    const market = get_market(position.exchange, position.symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const ticker = get_ticker_signal(position.exchange, position.symbol).value;
    const current_price = ticker?.last_price ?? position.last_price;
    const is_long = position.side === 'long';

    use_click_outside(panel_ref, on_close);
    use_escape_key(on_close);

    const handle_tp_price_change = useCallback((e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        if (DECIMAL_REGEX.test(value)) {
            set_tp_price(value);
        }
    }, []);

    const handle_sl_price_change = useCallback((e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        if (DECIMAL_REGEX.test(value)) {
            set_sl_price(value);
        }
    }, []);

    const handle_toggle_tp = useCallback(() => {
        set_tp_enabled((prev) => {
            if (!prev && !tp_price_ref.current) {
                const { DEFAULT_TP_OFFSET_PERCENT, DEFAULT_SL_OFFSET_PERCENT } = TPSL_CONSTANTS;
                const suggested = is_long
                    ? current_price * DEFAULT_TP_OFFSET_PERCENT
                    : current_price * DEFAULT_SL_OFFSET_PERCENT;
                set_tp_price(format_price(suggested, tick_size));
            }
            return !prev;
        });
    }, [current_price, tick_size, is_long]);

    const handle_toggle_sl = useCallback(() => {
        set_sl_enabled((prev) => {
            if (!prev && !sl_price_ref.current) {
                const { DEFAULT_TP_OFFSET_PERCENT, DEFAULT_SL_OFFSET_PERCENT } = TPSL_CONSTANTS;
                const suggested = is_long
                    ? current_price * DEFAULT_SL_OFFSET_PERCENT
                    : current_price * DEFAULT_TP_OFFSET_PERCENT;
                set_sl_price(format_price(suggested, tick_size));
            }
            return !prev;
        });
    }, [current_price, tick_size, is_long]);

    const handle_set_tp_market = useCallback(() => set_tp_order_type('market'), []);
    const handle_set_tp_limit = useCallback(() => set_tp_order_type('limit'), []);

    const tp_num = parseFloat(tp_price) || null;
    const sl_num = parseFloat(sl_price) || null;
    const [is_submitting, set_is_submitting] = useState(false);

    const handle_confirm = useCallback(async () => {
        const final_tp = tp_enabled && tp_num ? tp_num : undefined;
        const final_sl = sl_enabled && sl_num ? sl_num : undefined;

        if (!final_tp && !final_sl) {
            on_close();
            return;
        }

        set_is_submitting(true);
        const symbol_label = parse_symbol(position.symbol).base;
        try {
            await set_tpsl(position.exchange, position.symbol, final_tp, tp_order_type, final_sl);
            const has_tp = !!final_tp;
            const has_sl = !!final_sl;
            const order_type = has_tp && has_sl ? 'TP/SL' : has_tp ? 'take profit' : 'stop loss';
            toast.success(`${symbol_label} ${order_type} placed`);
            on_close();
        } catch (err) {
            toast.error(`Failed to place ${symbol_label} TP/SL: ${extract_error_message(err)}`);
        } finally {
            set_is_submitting(false);
        }
    }, [
        tp_enabled,
        sl_enabled,
        tp_num,
        tp_order_type,
        sl_num,
        position.exchange,
        position.symbol,
        on_close,
    ]);

    const tp_pnl = useMemo(
        () =>
            tp_num
                ? calculate_position_pnl(
                      is_long,
                      position.entry_price,
                      tp_num,
                      position.size,
                      position.margin,
                      position.leverage
                  )
                : null,
        [is_long, position.entry_price, position.size, position.margin, position.leverage, tp_num]
    );
    const sl_pnl = useMemo(
        () =>
            sl_num
                ? calculate_position_pnl(
                      is_long,
                      position.entry_price,
                      sl_num,
                      position.size,
                      position.margin,
                      position.leverage
                  )
                : null,
        [is_long, position.entry_price, position.size, position.margin, position.leverage, sl_num]
    );

    const can_confirm =
        (tp_enabled && tp_num && tp_num > 0) || (sl_enabled && sl_num && sl_num > 0);

    const { panel_style, flip_up } = useMemo(() => {
        const panel_width = 208;
        const panel_height_estimate =
            tp_enabled && sl_enabled ? 280 : tp_enabled || sl_enabled ? 180 : 120;
        const space_below = window.innerHeight - anchor_rect.bottom - 8;
        const flip = space_below < panel_height_estimate && anchor_rect.top > space_below;

        return {
            flip_up: flip,
            panel_style: {
                position: 'fixed' as const,
                top: flip ? 'auto' : `${anchor_rect.bottom + 4}px`,
                bottom: flip ? `${window.innerHeight - anchor_rect.top + 4}px` : 'auto',
                left: `${Math.max(8, anchor_rect.right - panel_width)}px`,
                zIndex: 9999,
                maxHeight: `${Math.min(flip ? anchor_rect.top - 8 : space_below, 400)}px`,
            },
        };
    }, [anchor_rect, tp_enabled, sl_enabled]);

    const panel_class = `w-52 bg-base-200 border border-base-300 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto ${flip_up ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'}`;

    return createPortal(
        <div
            ref={panel_ref}
            class={panel_class}
            style={panel_style}
            role="dialog"
            aria-label="Set take profit and stop loss"
        >
            <div class="p-3 space-y-2.5">
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span
                            class={`text-[11px] font-medium ${tp_enabled ? 'text-success' : 'text-base-content/50'}`}
                        >
                            Take Profit
                        </span>
                        <button
                            type="button"
                            onClick={handle_toggle_tp}
                            class={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                                tp_enabled ? 'bg-success' : 'bg-base-300'
                            }`}
                            role="switch"
                            aria-checked={tp_enabled}
                        >
                            <span
                                class={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${
                                    tp_enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                    {tp_enabled && (
                        <>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={tp_price}
                                onInput={handle_tp_price_change}
                                class="w-full px-2.5 py-1.5 text-xs bg-base-300/50 border border-success/30 rounded-md focus:outline-none focus:border-success/50 transition-colors"
                                placeholder="TP price"
                            />
                            <div class="flex gap-1 p-0.5 bg-base-300/50 rounded-md">
                                <button
                                    type="button"
                                    onClick={handle_set_tp_market}
                                    class={`flex-1 py-1 text-[10px] font-medium rounded transition-all duration-150 ${
                                        tp_order_type === 'market'
                                            ? 'bg-base-content/10 text-base-content shadow-sm'
                                            : 'text-base-content/50 hover:text-base-content/70'
                                    }`}
                                >
                                    Market
                                </button>
                                <button
                                    type="button"
                                    onClick={handle_set_tp_limit}
                                    class={`flex-1 py-1 text-[10px] font-medium rounded transition-all duration-150 ${
                                        tp_order_type === 'limit'
                                            ? 'bg-base-content/10 text-base-content shadow-sm'
                                            : 'text-base-content/50 hover:text-base-content/70'
                                    }`}
                                >
                                    Limit
                                </button>
                            </div>
                            {tp_pnl && (
                                <div class="flex justify-between text-[10px]">
                                    <span class="text-base-content/40">Est. PnL</span>
                                    <span class={tp_pnl.pnl >= 0 ? 'text-success' : 'text-error'}>
                                        {tp_pnl.pnl >= 0 ? '+' : ''}${tp_pnl.pnl.toFixed(2)} (
                                        {tp_pnl.pnl_pct >= 0 ? '+' : ''}
                                        {tp_pnl.pnl_pct.toFixed(1)}%)
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div class="border-t border-base-300/50" />

                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span
                            class={`text-[11px] font-medium ${sl_enabled ? 'text-error' : 'text-base-content/50'}`}
                        >
                            Stop Loss
                        </span>
                        <button
                            type="button"
                            onClick={handle_toggle_sl}
                            class={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                                sl_enabled ? 'bg-error' : 'bg-base-300'
                            }`}
                            role="switch"
                            aria-checked={sl_enabled}
                        >
                            <span
                                class={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${
                                    sl_enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                    {sl_enabled && (
                        <>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={sl_price}
                                onInput={handle_sl_price_change}
                                class="w-full px-2.5 py-1.5 text-xs bg-base-300/50 border border-error/30 rounded-md focus:outline-none focus:border-error/50 transition-colors"
                                placeholder="SL price"
                            />
                            {sl_pnl && (
                                <div class="flex justify-between text-[10px]">
                                    <span class="text-base-content/40">Est. PnL</span>
                                    <span class={sl_pnl.pnl >= 0 ? 'text-success' : 'text-error'}>
                                        {sl_pnl.pnl >= 0 ? '+' : ''}${sl_pnl.pnl.toFixed(2)} (
                                        {sl_pnl.pnl_pct >= 0 ? '+' : ''}
                                        {sl_pnl.pnl_pct.toFixed(1)}%)
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handle_confirm}
                    disabled={!can_confirm || is_submitting}
                    class="w-full py-2 text-xs font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-content transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {is_submitting ? 'Placing...' : 'Confirm'}
                </button>
            </div>
        </div>,
        document.body
    );
});
