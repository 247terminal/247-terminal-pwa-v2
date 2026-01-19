import { memo } from 'preact/compat';
import type { Order } from '../../../types/account.types';
import { orders_list, privacy_mode } from '../../../stores/account_store';
import { format_symbol } from '../../chart/symbol_row';
import { format_display_price, mask_value } from '../../../utils/account_format';

function format_order_type(type: Order['type']): string {
    const labels: Record<Order['type'], string> = {
        limit: 'Limit',
        market: 'Market',
        stop: 'Stop',
        take_profit: 'TP',
        stop_loss: 'SL',
    };
    return labels[type];
}

interface OrderRowProps {
    order: Order;
    is_private: boolean;
}

const OrderRow = memo(function OrderRow({ order, is_private }: OrderRowProps) {
    const is_buy = order.side === 'buy';
    const fill_pct = order.size > 0 ? (order.filled / order.size) * 100 : 0;

    const handle_cancel = () => {
        console.error('cancel order not implemented');
    };

    return (
        <div class="flex items-center gap-2 px-2 py-1.5 border-b border-base-300/30 hover:bg-base-300/30 transition-colors text-xs">
            <div class="w-24 shrink-0">
                <div class="flex items-center gap-1.5">
                    <span
                        class={`w-1.5 h-1.5 rounded-full ${is_buy ? 'bg-success' : 'bg-error'}`}
                    />
                    <span class="font-medium text-base-content">{format_symbol(order.symbol)}</span>
                </div>
                <div class="text-[10px] text-base-content/50 ml-3">
                    {format_order_type(order.type)} {order.side.toUpperCase()}
                </div>
            </div>

            <div class="w-16 shrink-0 text-right">
                <div class="text-base-content">{mask_value(order.size.toString(), is_private)}</div>
                {order.status === 'partial' && (
                    <div class="text-[10px] text-base-content/50">
                        {mask_value(`${fill_pct.toFixed(0)}% filled`, is_private)}
                    </div>
                )}
            </div>

            <div class="w-20 shrink-0 text-right">
                <div class="text-base-content">
                    {mask_value(format_display_price(order.price), is_private)}
                </div>
            </div>

            <div class="w-20 shrink-0 text-right text-base-content/50 font-mono text-[10px]">
                {order.id.slice(-8)}
            </div>

            <div class="flex-1 flex justify-end">
                <button
                    type="button"
                    onClick={handle_cancel}
                    class="px-1.5 py-0.5 text-[10px] rounded bg-error/20 hover:bg-error/40 text-error transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
});

export function OrdersTab() {
    const orders = orders_list.value;
    const is_private = privacy_mode.value;

    if (orders.length === 0) {
        return (
            <div class="flex-1 flex items-center justify-center">
                <div class="text-xs text-base-content/50 text-center py-8">No active orders</div>
            </div>
        );
    }

    return (
        <div class="flex-1 overflow-auto">
            <div class="flex items-center gap-2 px-2 py-1 text-[10px] text-base-content/50 border-b border-base-300/50 sticky top-0 bg-base-200">
                <div class="w-24 shrink-0">Symbol</div>
                <div class="w-16 shrink-0 text-right">Size</div>
                <div class="w-20 shrink-0 text-right">Price</div>
                <div class="w-20 shrink-0 text-right">ID</div>
                <div class="flex-1 text-right">Actions</div>
            </div>
            {orders.map((order) => (
                <OrderRow key={order.id} order={order} is_private={is_private} />
            ))}
        </div>
    );
}
