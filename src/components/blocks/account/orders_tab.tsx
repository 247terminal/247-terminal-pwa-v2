import { memo } from 'preact/compat';
import { useState, useMemo, useCallback } from 'preact/hooks';
import { VList } from 'virtua';
import type {
    Order,
    OrderSortKey,
    OrderRowProps,
    SortDirection,
} from '../../../types/account.types';
import { orders_list, privacy_mode, cancel_order } from '../../../stores/account_store';
import { get_market } from '../../../stores/exchange_store';
import { navigate_to_symbol } from '../../../stores/chart_navigation_store';
import { format_symbol, parse_symbol } from '../../chart/symbol_row';
import { get_exchange_icon } from '../../common/exchanges';
import { format_price, format_size } from '../../../utils/format';
import { format_usd, mask_value } from '../../../utils/account_format';
import { SortHeader } from './sort_header';

const ORDER_TYPE_LABELS = {
    limit: 'Limit',
    market: 'Market',
    stop: 'Stop',
    take_profit: 'TP',
    stop_loss: 'SL',
} as const satisfies Record<Order['type'], string>;

function format_order_type(type: Order['type']): string {
    return ORDER_TYPE_LABELS[type];
}

const OrderRow = memo(function OrderRow({ order, is_private }: OrderRowProps) {
    const is_buy = order.side === 'buy';
    const fill_pct = order.size > 0 ? (order.filled / order.size) * 100 : 0;
    const market = get_market(order.exchange, order.symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const qty_step = market?.qty_step ?? 0.001;

    const handle_cancel = useCallback(() => {
        cancel_order(order.exchange, order.id);
    }, [order.exchange, order.id]);

    const handle_symbol_click = useCallback(() => {
        navigate_to_symbol(order.exchange, order.symbol);
    }, [order.exchange, order.symbol]);

    return (
        <div
            class="relative flex items-center px-2 py-1.5 hover:bg-base-300/30 transition-colors text-xs"
            role="row"
        >
            <span
                class={`absolute left-0 top-1 bottom-1 w-[2.5px] ${is_buy ? 'bg-success' : 'bg-error'}`}
                aria-hidden="true"
            />
            <div
                class="flex-1 flex items-center gap-1.5 cursor-pointer hover:opacity-80 min-w-0"
                onClick={handle_symbol_click}
                onKeyDown={(e) => e.key === 'Enter' && handle_symbol_click()}
                role="button"
                tabIndex={0}
                aria-label={`Navigate to ${format_symbol(order.symbol)} chart`}
            >
                <span class="text-base-content/40 shrink-0" aria-hidden="true">
                    {get_exchange_icon(order.exchange)}
                </span>
                <div class="min-w-0">
                    <div class={`font-medium truncate ${is_buy ? 'text-success' : 'text-error'}`}>
                        {format_symbol(order.symbol)}
                    </div>
                    <div class="text-[10px] text-base-content/50">
                        {format_order_type(order.type)} {order.side.toUpperCase()}
                    </div>
                </div>
            </div>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content">
                    {mask_value(format_usd(order.size * order.price), is_private)}
                </div>
                <div class="text-[10px] text-base-content/50">
                    {mask_value(
                        `${format_size(order.size, qty_step)} ${parse_symbol(order.symbol).base}`,
                        is_private
                    )}
                    {order.status === 'partial' && ` · ${fill_pct.toFixed(0)}%`}
                </div>
            </div>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content">
                    {mask_value(format_price(order.price, tick_size), is_private)}
                </div>
            </div>

            <div class="flex-1 text-right text-base-content/50 font-mono text-[10px]" role="cell">
                {order.id.slice(-8)}
            </div>

            <div class="flex-1 flex justify-end" role="cell">
                <button
                    type="button"
                    onClick={handle_cancel}
                    class="px-1.5 py-0.5 text-[10px] rounded bg-error/20 hover:bg-error/40 text-error transition-colors"
                    aria-label={`Cancel order ${order.id.slice(-8)}`}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
});

function sort_orders(orders: Order[], key: OrderSortKey, direction: SortDirection): Order[] {
    return orders.toSorted((a, b) => {
        let cmp = 0;
        switch (key) {
            case 'symbol':
                cmp = a.symbol.localeCompare(b.symbol);
                break;
            case 'size':
                cmp = a.size * a.price - b.size * b.price;
                break;
            case 'price':
                cmp = a.price - b.price;
                break;
            case 'id':
                cmp = a.id.localeCompare(b.id);
                break;
        }
        return direction === 'asc' ? cmp : -cmp;
    });
}

export function OrdersTab() {
    const orders = orders_list.value;
    const is_private = privacy_mode.value;
    const [sort_key, set_sort_key] = useState<OrderSortKey>('symbol');
    const [sort_direction, set_sort_direction] = useState<SortDirection>('asc');

    const handle_sort = useCallback(
        (key: OrderSortKey) => {
            if (key === sort_key) {
                set_sort_direction((d) => (d === 'asc' ? 'desc' : 'asc'));
            } else {
                set_sort_key(key);
                set_sort_direction('desc');
            }
        },
        [sort_key]
    );

    const sorted_orders = useMemo(
        () => sort_orders(orders, sort_key, sort_direction),
        [orders, sort_key, sort_direction]
    );

    if (orders.length === 0) {
        return (
            <div class="flex-1 flex items-center justify-center">
                <div class="text-xs text-base-content/50 text-center py-8">No active orders</div>
            </div>
        );
    }

    return (
        <div class="flex-1 flex flex-col overflow-hidden" role="table" aria-label="Active orders">
            <div
                class="flex items-center px-2 py-1 text-[10px] text-base-content/50 border-b border-base-300/50 bg-base-200"
                role="row"
            >
                <SortHeader
                    label="Symbol"
                    sort_key="symbol"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    flex
                />
                <SortHeader
                    label="Size"
                    sort_key="size"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="Price"
                    sort_key="price"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="ID"
                    sort_key="id"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <div class="flex-1 text-right" role="columnheader">
                    Actions
                </div>
            </div>
            <VList class="flex-1" role="rowgroup">
                {sorted_orders.map((order) => (
                    <OrderRow key={order.id} order={order} is_private={is_private} />
                ))}
            </VList>
        </div>
    );
}
