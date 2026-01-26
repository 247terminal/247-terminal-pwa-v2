import { useCallback, useMemo } from 'preact/hooks';
import {
    trade_state,
    update_twap_form,
    calculate_twap_max_orders,
} from '../../../stores/trade_store';
import { SliderInput, TotalInput } from './trade_inputs';

function format_duration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

export function TwapForm() {
    const form = trade_state.value.twap;

    const max_orders = useMemo(
        () => calculate_twap_max_orders(form.duration_minutes),
        [form.duration_minutes]
    );

    const handle_duration_change = useCallback(
        (value: number) => {
            const new_max = calculate_twap_max_orders(value);
            const clamped_orders = Math.min(form.orders_count, new_max);
            update_twap_form({ duration_minutes: value, orders_count: clamped_orders });
        },
        [form.orders_count]
    );

    const handle_orders_change = useCallback((value: number) => {
        update_twap_form({ orders_count: value });
    }, []);

    const handle_total_size_change = useCallback((value: string) => {
        update_twap_form({ total_size_usd: value });
    }, []);

    return (
        <div class="flex flex-col gap-2">
            <SliderInput
                label="Duration"
                value={form.duration_minutes}
                min={1}
                max={480}
                on_change={handle_duration_change}
                format_value={format_duration}
            />

            <SliderInput
                label="Orders"
                value={form.orders_count}
                min={2}
                max={max_orders}
                on_change={handle_orders_change}
                show_max
            />

            <TotalInput
                label="Total"
                value={form.total_size_usd}
                on_change={handle_total_size_change}
            />
        </div>
    );
}
