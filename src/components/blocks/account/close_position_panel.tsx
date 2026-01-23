import { memo } from 'preact/compat';
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { toast } from 'sonner';
import type { Position } from '../../../types/account.types';
import { close_position } from '../../../stores/account_store';
import { get_market, get_ticker_signal } from '../../../stores/exchange_store';
import { format_price, format_size } from '../../../utils/format';
import { format_symbol, parse_symbol } from '../../chart/symbol_row';

type CloseOrderType = 'market' | 'limit';

const CLOSE_PERCENTAGES = [10, 25, 50, 75, 100] as const;
const DECIMAL_REGEX = /^\d*\.?\d*$/;

interface ClosePositionPanelProps {
    position: Position;
    anchor_rect: DOMRect;
    on_close: () => void;
}

export const ClosePositionPanel = memo(function ClosePositionPanel({
    position,
    anchor_rect,
    on_close,
}: ClosePositionPanelProps) {
    const [order_type, set_order_type] = useState<CloseOrderType>('market');
    const [percentage, set_percentage] = useState<number>(100);
    const [limit_price, set_limit_price] = useState<string>('');
    const [is_submitting, set_is_submitting] = useState(false);
    const panel_ref = useRef<HTMLDivElement>(null);

    const market = get_market(position.exchange, position.symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const qty_step = market?.qty_step ?? 0.001;
    const ticker = get_ticker_signal(position.exchange, position.symbol).value;
    const current_price = ticker?.last_price ?? position.last_price;

    useEffect(() => {
        if (order_type === 'limit' && !limit_price) {
            const suggested_price =
                position.side === 'long' ? current_price + tick_size : current_price - tick_size;
            set_limit_price(format_price(suggested_price, tick_size));
        }
    }, [order_type, limit_price, current_price, tick_size, position.side]);

    useEffect(() => {
        function handle_click_outside(e: MouseEvent) {
            if (panel_ref.current && !panel_ref.current.contains(e.target as Node)) {
                on_close();
            }
        }

        function handle_escape(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                on_close();
            }
        }

        document.addEventListener('mousedown', handle_click_outside);
        document.addEventListener('keydown', handle_escape);
        return () => {
            document.removeEventListener('mousedown', handle_click_outside);
            document.removeEventListener('keydown', handle_escape);
        };
    }, [on_close]);

    const handle_submit = useCallback(async () => {
        set_is_submitting(true);
        const symbol_label = format_symbol(position.symbol);
        try {
            const price = order_type === 'limit' ? parseFloat(limit_price) : undefined;
            const success = await close_position(
                position.exchange,
                position.symbol,
                percentage,
                order_type,
                price
            );
            if (success) {
                toast.success(`Closed ${symbol_label} position`);
            } else {
                toast.error(`Failed to close ${symbol_label}`);
            }
            on_close();
        } catch (err) {
            toast.error(`Failed to close ${symbol_label}`);
            console.error('failed to close position:', (err as Error).message);
        } finally {
            set_is_submitting(false);
        }
    }, [position.exchange, position.symbol, percentage, order_type, limit_price, on_close]);

    const handle_price_change = useCallback((e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        if (DECIMAL_REGEX.test(value)) {
            set_limit_price(value);
        }
    }, []);

    const close_size = position.size * (percentage / 100);
    const close_value = close_size * current_price;

    const panel_width = 208;
    const panel_style = {
        position: 'fixed' as const,
        top: `${anchor_rect.bottom + 4}px`,
        left: `${Math.max(8, anchor_rect.right - panel_width)}px`,
        zIndex: 9999,
    };

    return createPortal(
        <div
            ref={panel_ref}
            class="w-52 bg-base-200 border border-base-300 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-150"
            style={panel_style}
            role="dialog"
            aria-label="Close position options"
        >
            <div class="p-3 space-y-2.5">
                <div class="flex gap-1 p-0.5 bg-base-300/50 rounded-md">
                    <button
                        type="button"
                        onClick={() => set_order_type('market')}
                        class={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all duration-150 ${
                            order_type === 'market'
                                ? 'bg-base-content/10 text-base-content shadow-sm'
                                : 'text-base-content/50 hover:text-base-content/70'
                        }`}
                    >
                        Market
                    </button>
                    <button
                        type="button"
                        onClick={() => set_order_type('limit')}
                        class={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all duration-150 ${
                            order_type === 'limit'
                                ? 'bg-base-content/10 text-base-content shadow-sm'
                                : 'text-base-content/50 hover:text-base-content/70'
                        }`}
                    >
                        Limit
                    </button>
                </div>

                {order_type === 'limit' && (
                    <input
                        type="text"
                        inputMode="decimal"
                        value={limit_price}
                        onInput={handle_price_change}
                        class="w-full px-2.5 py-1.5 text-xs bg-base-300/50 border border-base-300 rounded-md focus:outline-none focus:border-primary/50 transition-colors"
                        placeholder="Limit price"
                    />
                )}

                <div class="flex gap-1">
                    {CLOSE_PERCENTAGES.map((pct) => (
                        <button
                            key={pct}
                            type="button"
                            onClick={() => set_percentage(pct)}
                            class={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all duration-150 ${
                                percentage === pct
                                    ? 'bg-error/20 text-error'
                                    : 'bg-base-300/50 text-base-content/60 hover:bg-base-300'
                            }`}
                        >
                            {pct}%
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handle_submit}
                    disabled={is_submitting || (order_type === 'limit' && !limit_price)}
                    class="w-full py-2 text-xs font-medium rounded-md bg-error hover:bg-error/90 text-error-content transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {is_submitting ? (
                        <span class="inline-flex items-center justify-center gap-1.5">
                            <span class="w-3 h-3 border-2 border-error-content/30 border-t-error-content rounded-full animate-spin" />
                            Closing
                        </span>
                    ) : (
                        <span class="flex flex-col leading-tight">
                            <span>
                                Close {format_size(close_size, qty_step)}{' '}
                                {parse_symbol(position.symbol).base}
                            </span>
                            <span class="text-[10px] opacity-70">
                                ≈ ${close_value.toFixed(2)} ·{' '}
                                {order_type === 'market' ? 'Market' : 'Limit'}
                            </span>
                        </span>
                    )}
                </button>
            </div>
        </div>,
        document.body
    );
});
