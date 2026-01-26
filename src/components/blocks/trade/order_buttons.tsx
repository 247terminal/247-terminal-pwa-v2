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
import { place_market_order } from '../../../stores/account_store';
import { has_exchange } from '../../../services/exchange/account_bridge';
import { parse_symbol } from '../../chart/symbol_row';
import { format_price, extract_error_message } from '../../../utils/format';

export const OrderButtons = memo(function OrderButtons() {
    const state = trade_state.value;
    const exchange = selected_exchange.value;
    const symbol = selected_symbol.value;
    const market = current_market.value;
    const ticker = get_ticker(exchange, symbol);
    const { base } = parse_symbol(symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const [submitting, setSubmitting] = useState(false);

    const { quantity_display, price_display } = useMemo(() => {
        const order_type = state.order_type;
        let qty = '';
        let price = '';

        if (order_type === 'limit') {
            const qty_val = parseFloat(state.limit.quantity) || 0;
            const price_val = parseFloat(state.limit.price) || 0;
            if (state.limit.size_unit === 'usd' && ticker?.last_price) {
                qty = (qty_val / ticker.last_price).toFixed(4);
            } else {
                qty = qty_val.toFixed(4);
            }
            price = price_val ? format_price(price_val, tick_size) : '';
        } else if (order_type === 'market') {
            const qty_val = parseFloat(state.market.quantity) || 0;
            if (state.market.size_unit === 'usd' && ticker?.last_price) {
                qty = (qty_val / ticker.last_price).toFixed(4);
            } else {
                qty = qty_val.toFixed(4);
            }
            price = 'MKT';
        } else if (order_type === 'scale') {
            const total = parseFloat(state.scale.total_size_usd) || 0;
            if (ticker?.last_price) {
                qty = (total / ticker.last_price).toFixed(4);
            }
            const from_price = parseFloat(state.scale.price_from) || 0;
            const to_price = parseFloat(state.scale.price_to) || 0;
            if (from_price && to_price) {
                price = `${format_price(from_price, tick_size)}→${format_price(to_price, tick_size)}`;
            }
        } else if (order_type === 'twap') {
            const total = parseFloat(state.twap.total_size_usd) || 0;
            if (ticker?.last_price) {
                qty = (total / ticker.last_price).toFixed(4);
            }
            price = 'TWAP';
        }

        return {
            quantity_display: qty ? `${qty} ${base}` : `— ${base}`,
            price_display: price || '—',
        };
    }, [state, ticker, base, tick_size]);

    const order_type = state.order_type;
    const market_quantity = state.market.quantity;
    const market_size_unit = state.market.size_unit;
    const market_reduce_only = state.market.reduce_only;

    const submit_order = useCallback(
        async (side: 'buy' | 'sell') => {
            if (order_type !== 'market') {
                toast.error(`${order_type} orders not yet implemented`);
                return;
            }

            if (!has_exchange(exchange)) {
                toast.error('Exchange not connected');
                return;
            }

            const qty_input = parseFloat(market_quantity) || 0;
            if (qty_input <= 0) {
                toast.error('Invalid quantity');
                return;
            }

            let final_size = qty_input;
            if (market_size_unit === 'usd' && ticker?.last_price) {
                final_size = qty_input / ticker.last_price;
            }

            if (final_size <= 0) {
                toast.error('Unable to calculate order size');
                return;
            }

            setSubmitting(true);
            const side_label = side === 'buy' ? 'BUY' : 'SELL';

            try {
                const success = await place_market_order(
                    exchange,
                    symbol,
                    side,
                    final_size,
                    market_reduce_only
                );

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
        [
            order_type,
            market_quantity,
            market_size_unit,
            market_reduce_only,
            exchange,
            symbol,
            ticker,
            base,
        ]
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
