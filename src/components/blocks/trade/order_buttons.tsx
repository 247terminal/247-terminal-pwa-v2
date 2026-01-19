import { useMemo, useCallback } from 'preact/hooks';
import {
    trade_state,
    selected_exchange,
    selected_symbol,
    current_market,
} from '../../../stores/trade_store';
import { get_ticker } from '../../../stores/exchange_store';
import { parse_symbol } from '../../chart/symbol_row';
import { format_price } from '../../../utils/format';

export function OrderButtons() {
    const state = trade_state.value;
    const exchange = selected_exchange.value;
    const symbol = selected_symbol.value;
    const market = current_market.value;
    const ticker = get_ticker(exchange, symbol);
    const { base } = parse_symbol(symbol);
    const tick_size = market?.tick_size ?? 0.01;

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

    const handle_buy = useCallback(() => {
        console.error('buy order submission not implemented');
    }, []);

    const handle_sell = useCallback(() => {
        console.error('sell order submission not implemented');
    }, []);

    return (
        <div class="grid grid-cols-2 gap-2 mt-2">
            <button
                type="button"
                onClick={handle_buy}
                class="flex flex-col items-center py-2 rounded bg-success/20 text-success hover:bg-success/30 transition-colors"
            >
                <span class="text-xs font-medium">BUY / LONG</span>
                <span class="text-[10px] opacity-70">
                    {quantity_display} @ {price_display}
                </span>
            </button>
            <button
                type="button"
                onClick={handle_sell}
                class="flex flex-col items-center py-2 rounded bg-error/20 text-error hover:bg-error/30 transition-colors"
            >
                <span class="text-xs font-medium">SELL / SHORT</span>
                <span class="text-[10px] opacity-70">
                    {quantity_display} @ {price_display}
                </span>
            </button>
        </div>
    );
}
