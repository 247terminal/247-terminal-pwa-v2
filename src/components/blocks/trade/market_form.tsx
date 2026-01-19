import { useCallback } from 'preact/hooks';
import type { SizeUnit } from '../../../types/trade.types';
import { trade_state, update_market_form } from '../../../stores/trade_store';
import { QuantityInput, ToggleInput } from './trade_inputs';
import { parse_symbol } from '../../chart/symbol_row';

export function MarketForm() {
    const form = trade_state.value.market;
    const symbol = trade_state.value.symbol;
    const { base } = parse_symbol(symbol);

    const handle_quantity_change = useCallback((value: string) => {
        update_market_form({ quantity: value });
    }, []);

    const handle_unit_change = useCallback((unit: SizeUnit) => {
        update_market_form({ size_unit: unit });
    }, []);

    const handle_post_only = useCallback((checked: boolean) => {
        update_market_form({ post_only: checked });
    }, []);

    const handle_reduce_only = useCallback((checked: boolean) => {
        update_market_form({ reduce_only: checked });
    }, []);

    return (
        <div class="flex flex-col gap-2">
            <QuantityInput
                value={form.quantity}
                on_change={handle_quantity_change}
                size_unit={form.size_unit}
                on_unit_change={handle_unit_change}
                coin_symbol={base}
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
