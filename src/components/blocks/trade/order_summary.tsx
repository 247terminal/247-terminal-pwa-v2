import { useMemo } from 'preact/hooks';
import {
    trade_state,
    selected_leverage,
    selected_exchange,
    selected_symbol,
} from '../../../stores/trade_store';
import { get_ticker } from '../../../stores/exchange_store';
import { balances, privacy_mode } from '../../../stores/account_store';
import { mask_value, format_usd_full } from '../../../utils/account_format';

function format_usd_or_empty(value: number | null): string {
    if (value === null || isNaN(value)) return '$—';
    return format_usd_full(value);
}

export function OrderSummary() {
    const state = trade_state.value;
    const leverage = selected_leverage.value;
    const exchange = selected_exchange.value;
    const symbol = selected_symbol.value;
    const ticker = get_ticker(exchange, symbol);

    const account_balance = balances.value.get(exchange);
    const is_private = privacy_mode.value;

    const { value, cost } = useMemo(() => {
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
        };
    }, [state, leverage, ticker]);

    return (
        <div class="grid grid-cols-3 gap-2 py-2 mt-2 border-t border-base-300/50">
            <div class="text-center">
                <div class="text-[10px] text-base-content/50 uppercase">Value</div>
                <div class="text-xs font-medium text-base-content tabular-nums">
                    {format_usd_or_empty(value)}
                </div>
            </div>
            <div class="text-center">
                <div class="text-[10px] text-base-content/50 uppercase">Margin</div>
                <div class="text-xs font-medium text-base-content tabular-nums">
                    {format_usd_or_empty(cost)}
                </div>
            </div>
            <div class="text-center">
                <div class="text-[10px] text-base-content/50 uppercase">Balance</div>
                <div class="text-xs font-medium text-base-content tabular-nums">
                    {mask_value(
                        format_usd_or_empty(account_balance?.available ?? null),
                        is_private
                    )}
                </div>
            </div>
        </div>
    );
}
