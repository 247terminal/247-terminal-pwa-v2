import { memo } from 'preact/compat';
import { useCallback } from 'preact/hooks';
import type { OrderType } from '../../../types/trade.types';
import { selected_order_type, set_order_type } from '../../../stores/trade_store';
import { active_twap_count } from '../../../stores/twap_store';

const ORDER_TYPES: { value: OrderType; label: string }[] = [
    { value: 'market', label: 'Market' },
    { value: 'limit', label: 'Limit' },
    { value: 'scale', label: 'Scale' },
    { value: 'twap', label: 'TWAP' },
];

export const OrderTypeTabs = memo(function OrderTypeTabs() {
    const current = selected_order_type.value;
    const twap_count = active_twap_count.value;

    const handle_click = useCallback((e: Event) => {
        const value = (e.currentTarget as HTMLButtonElement).dataset.type as OrderType;
        set_order_type(value);
    }, []);

    return (
        <div class="flex items-center gap-0.5">
            {ORDER_TYPES.map((type) => (
                <button
                    key={type.value}
                    type="button"
                    data-type={type.value}
                    onClick={handle_click}
                    class={`relative px-2 py-1 text-xs rounded transition-colors ${
                        current === type.value
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                    }`}
                >
                    {type.label}
                    {type.value === 'twap' && twap_count > 0 && (
                        <span class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-base-300 text-[10px] font-medium text-base-content/70 px-1">
                            {twap_count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
});
