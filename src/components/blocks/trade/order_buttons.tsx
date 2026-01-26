import { memo } from 'preact/compat';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { toast } from 'sonner';
import {
    trade_state,
    selected_exchange,
    selected_symbol,
    current_market,
} from '../../../stores/trade_store';
import { get_ticker } from '../../../stores/exchange_store';
import { place_market_order, place_limit_order } from '../../../stores/account_store';
import { has_exchange } from '../../../services/exchange/account_bridge';
import { parse_symbol } from '../../chart/symbol_row';
import { format_price, extract_error_message } from '../../../utils/format';

export const OrderButtons = memo(function OrderButtons() {
    const state = trade_state.value;
    const exchange = selected_exchange.value;
    const symbol = selected_symbol.value;
    const market = current_market.value;
    const ticker = get_ticker(exchange, symbol);
    const base = useMemo(() => parse_symbol(symbol).base, [symbol]);
    const tick_size = market?.tick_size ?? 0.01;
    const [submitting, setSubmitting] = useState(false);

    const order_type = state.order_type;
    const limit_form = state.limit;
    const market_form = state.market;
    const scale_form = state.scale;
    const twap_form = state.twap;

    const { quantity_display, price_display } = useMemo(() => {
        let qty = '';
        let price = '';

        if (order_type === 'limit') {
            const qty_val = parseFloat(limit_form.quantity) || 0;
            const price_val = parseFloat(limit_form.price) || 0;
            if (limit_form.size_unit === 'usd' && ticker?.last_price) {
                qty = (qty_val / ticker.last_price).toFixed(4);
            } else {
                qty = qty_val.toFixed(4);
            }
            price = price_val ? format_price(price_val, tick_size) : '';
        } else if (order_type === 'market') {
            const qty_val = parseFloat(market_form.quantity) || 0;
            if (market_form.size_unit === 'usd' && ticker?.last_price) {
                qty = (qty_val / ticker.last_price).toFixed(4);
            } else {
                qty = qty_val.toFixed(4);
            }
            price = 'MKT';
        } else if (order_type === 'scale') {
            const total = parseFloat(scale_form.total_size_usd) || 0;
            if (ticker?.last_price) {
                qty = (total / ticker.last_price).toFixed(4);
            }
            const from_price = parseFloat(scale_form.price_from) || 0;
            const to_price = parseFloat(scale_form.price_to) || 0;
            if (from_price && to_price) {
                price = `${format_price(from_price, tick_size)}→${format_price(to_price, tick_size)}`;
            }
        } else if (order_type === 'twap') {
            const total = parseFloat(twap_form.total_size_usd) || 0;
            if (ticker?.last_price) {
                qty = (total / ticker.last_price).toFixed(4);
            }
            price = 'TWAP';
        }

        return {
            quantity_display: qty ? `${qty} ${base}` : `— ${base}`,
            price_display: price || '—',
        };
    }, [order_type, limit_form, market_form, scale_form, twap_form, ticker, base, tick_size]);

    const market_quantity = market_form.quantity;
    const market_size_unit = market_form.size_unit;
    const market_reduce_only = market_form.reduce_only;
    const limit_quantity = limit_form.quantity;
    const limit_size_unit = limit_form.size_unit;
    const limit_price = limit_form.price;
    const limit_post_only = limit_form.post_only;
    const limit_reduce_only = limit_form.reduce_only;
    const last_price = ticker?.last_price;

    const execute_market_order = useCallback(
        async (side: 'buy' | 'sell'): Promise<boolean> => {
            const qty_input = parseFloat(market_quantity) || 0;
            if (qty_input <= 0) {
                toast.error('Invalid quantity');
                return false;
            }

            let final_size = qty_input;
            if (market_size_unit === 'usd' && last_price) {
                final_size = qty_input / last_price;
            }

            if (final_size <= 0) {
                toast.error('Unable to calculate order size');
                return false;
            }

            return place_market_order(exchange, symbol, side, final_size, market_reduce_only);
        },
        [market_quantity, market_size_unit, market_reduce_only, exchange, symbol, last_price]
    );

    const execute_limit_order = useCallback(
        async (side: 'buy' | 'sell'): Promise<boolean> => {
            const qty_input = parseFloat(limit_quantity) || 0;
            const price_input = parseFloat(limit_price) || 0;

            if (qty_input <= 0) {
                toast.error('Invalid quantity');
                return false;
            }

            if (price_input <= 0) {
                toast.error('Invalid price');
                return false;
            }

            if (last_price) {
                if (side === 'buy' && price_input >= last_price) {
                    toast.error('Limit buy price must be below market price');
                    return false;
                }
                if (side === 'sell' && price_input <= last_price) {
                    toast.error('Limit sell price must be above market price');
                    return false;
                }
            }

            let final_size = qty_input;
            if (limit_size_unit === 'usd') {
                final_size = qty_input / price_input;
            }

            if (final_size <= 0) {
                toast.error('Unable to calculate order size');
                return false;
            }

            return place_limit_order(
                exchange,
                symbol,
                side,
                final_size,
                price_input,
                limit_post_only,
                limit_reduce_only
            );
        },
        [
            limit_quantity,
            limit_price,
            limit_size_unit,
            limit_post_only,
            limit_reduce_only,
            exchange,
            symbol,
            last_price,
        ]
    );

    const submit_order = useCallback(
        async (side: 'buy' | 'sell') => {
            if (order_type !== 'market' && order_type !== 'limit') {
                toast.error(`${order_type} orders not yet implemented`);
                return;
            }

            if (!has_exchange(exchange)) {
                toast.error('Exchange not connected');
                return;
            }

            setSubmitting(true);
            const side_label = side === 'buy' ? 'BUY' : 'SELL';

            try {
                const success =
                    order_type === 'market'
                        ? await execute_market_order(side)
                        : await execute_limit_order(side);

                if (success) {
                    toast.success(`${side_label} ${base} order placed`);
                } else {
                    toast.error(`Failed to place ${side_label} order`);
                }
            } catch (err) {
                const error_msg = extract_error_message(err);
                toast.error(`Failed to place ${base} order: ${error_msg}`);
            } finally {
                setSubmitting(false);
            }
        },
        [order_type, exchange, base, execute_market_order, execute_limit_order]
    );

    const handle_buy = useCallback(() => submit_order('buy'), [submit_order]);
    const handle_sell = useCallback(() => submit_order('sell'), [submit_order]);

    return (
        <div class="grid grid-cols-2 gap-2 mt-2">
            <button
                type="button"
                onClick={handle_buy}
                disabled={submitting}
                class="flex flex-col items-center py-2 rounded bg-success/20 text-success hover:bg-success/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span class="text-xs font-medium">
                    {submitting ? 'SUBMITTING...' : 'BUY / LONG'}
                </span>
                <span class="text-[10px] opacity-70">
                    {quantity_display} @ {price_display}
                </span>
            </button>
            <button
                type="button"
                onClick={handle_sell}
                disabled={submitting}
                class="flex flex-col items-center py-2 rounded bg-error/20 text-error hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span class="text-xs font-medium">
                    {submitting ? 'SUBMITTING...' : 'SELL / SHORT'}
                </span>
                <span class="text-[10px] opacity-70">
                    {quantity_display} @ {price_display}
                </span>
            </button>
        </div>
    );
});
