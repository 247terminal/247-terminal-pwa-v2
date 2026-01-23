import { useCallback } from 'preact/hooks';
import type { PriceDistribution, SizeDistribution } from '../../../types/trade.types';
import { trade_state, update_scale_form, fill_last_price } from '../../../stores/trade_store';
import {
    PriceInput,
    SliderInput,
    ToggleInput,
    TotalInput,
    SegmentSelector,
    PRICE_DISTRIBUTION_OPTIONS,
    SIZE_DISTRIBUTION_OPTIONS,
} from './trade_inputs';

export function ScaleForm() {
    const form = trade_state.value.scale;

    const handle_price_from_change = useCallback((value: string) => {
        update_scale_form({ price_from: value });
    }, []);

    const handle_price_to_change = useCallback((value: string) => {
        update_scale_form({ price_to: value });
    }, []);

    const handle_orders_count_change = useCallback((value: number) => {
        update_scale_form({ orders_count: value });
    }, []);

    const handle_price_distribution_change = useCallback((value: PriceDistribution) => {
        update_scale_form({ price_distribution: value });
    }, []);

    const handle_size_distribution_change = useCallback((value: SizeDistribution) => {
        update_scale_form({ size_distribution: value });
    }, []);

    const handle_total_size_change = useCallback((value: string) => {
        update_scale_form({ total_size_usd: value });
    }, []);

    const handle_post_only = useCallback((checked: boolean) => {
        update_scale_form({ post_only: checked });
    }, []);

    const handle_reduce_only = useCallback((checked: boolean) => {
        update_scale_form({ reduce_only: checked });
    }, []);

    return (
        <div class="flex flex-col gap-2">
            <PriceInput
                label="Price From"
                value={form.price_from}
                on_change={handle_price_from_change}
                show_last
                on_last_click={() => fill_last_price('price_from')}
            />

            <PriceInput
                label="Price To"
                value={form.price_to}
                on_change={handle_price_to_change}
                show_last
                on_last_click={() => fill_last_price('price_to')}
            />

            <SliderInput
                label="Orders"
                value={form.orders_count}
                min={2}
                max={100}
                on_change={handle_orders_count_change}
            />

            <SegmentSelector
                label="Price Dist."
                value={form.price_distribution}
                options={PRICE_DISTRIBUTION_OPTIONS}
                on_change={handle_price_distribution_change}
            />

            <SegmentSelector
                label="Size Dist."
                value={form.size_distribution}
                options={SIZE_DISTRIBUTION_OPTIONS}
                on_change={handle_size_distribution_change}
            />

            <TotalInput
                label="Total"
                value={form.total_size_usd}
                on_change={handle_total_size_change}
            />

            <div class="flex items-center gap-4 pt-1 border-t border-base-300/50">
                <ToggleInput
                    label="Post-only"
                    checked={form.post_only}
                    on_change={handle_post_only}
                />
                <ToggleInput
                    label="Reduce-only"
                    checked={form.reduce_only}
                    on_change={handle_reduce_only}
                />
            </div>
        </div>
    );
}
