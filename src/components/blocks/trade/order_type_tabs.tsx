import type { OrderType } from '../../../types/trade.types';
import { selected_order_type, set_order_type } from '../../../stores/trade_store';

const ORDER_TYPES: { value: OrderType; label: string }[] = [
    { value: 'market', label: 'Market' },
    { value: 'limit', label: 'Limit' },
    { value: 'scale', label: 'Scale' },
    { value: 'twap', label: 'TWAP' },
];

export function OrderTypeTabs() {
    const current = selected_order_type.value;

    return (
        <div class="flex items-center gap-0.5">
            {ORDER_TYPES.map((type) => (
                <button
                    key={type.value}
                    type="button"
                    onClick={() => set_order_type(type.value)}
                    class={`px-2 py-1 text-xs rounded transition-colors ${
                        current === type.value
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                    }`}
                >
                    {type.label}
                </button>
            ))}
        </div>
    );
}
