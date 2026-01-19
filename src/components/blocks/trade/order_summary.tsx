import { useMemo } from 'preact/hooks';
import {
    trade_state,
    selected_leverage,
    selected_exchange,
    selected_symbol,
} from '../../../stores/trade_store';
import { get_ticker } from '../../../stores/exchange_store';

function format_usd(value: number | null): string {
    if (value === null || isNaN(value)) return '$—';
    return (
        '$' +
        value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    );
}

export function OrderSummary() {
    const state = trade_state.value;
    const leverage = selected_leverage.value;
    const exchange = selected_exchange.value;
    const symbol = selected_symbol.value;
    const ticker = get_ticker(exchange, symbol);

    const { value, cost, balance } = useMemo(() => {
        const order_type = state.order_type;
        let size_usd = 0;

        if (order_type === 'limit') {
            const price = parseFloat(state.limit.price) || (ticker?.last_price ?? 0);
            const qty = parseFloat(state.limit.quantity) || 0;
            size_usd = state.limit.size_unit === 'usd' ? qty : qty * price;
        } else if (order_type === 'market') {
            const price = ticker?.last_price ?? 0;
            const qty = parseFloat(state.market.quantity) || 0;
            size_usd = state.market.size_unit === 'usd' ? qty : qty * price;
        } else if (order_type === 'scale') {
            size_usd = parseFloat(state.scale.total_size_usd) || 0;
        } else if (order_type === 'twap') {
            size_usd = parseFloat(state.twap.total_size_usd) || 0;
        }

        const computed_cost = leverage > 0 ? size_usd / leverage : 0;

        return {
            value: size_usd || null,
            cost: computed_cost || null,
            balance: null,
        };
    }, [state, leverage, ticker]);

    return (
        <div class="grid grid-cols-3 gap-2 py-2 mt-2 border-t border-base-300/50">
            <div class="text-center">
                <div class="text-[10px] text-base-content/50 uppercase">Value</div>
                <div class="text-xs font-medium text-base-content tabular-nums">
                    {format_usd(value)}
                </div>
            </div>
            <div class="text-center">
                <div class="text-[10px] text-base-content/50 uppercase">Margin</div>
                <div class="text-xs font-medium text-base-content tabular-nums">
                    {format_usd(cost)}
                </div>
            </div>
            <div class="text-center">
                <div class="text-[10px] text-base-content/50 uppercase">Balance</div>
                <div class="text-xs font-medium text-base-content tabular-nums">
                    {format_usd(balance)}
                </div>
            </div>
        </div>
    );
}
