import { useCallback } from 'preact/hooks';
import type { SizeUnit } from '../../../types/trade.types';
import { trade_state, update_market_form } from '../../../stores/trade_store';
import { QuantityInput } from './trade_inputs';
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

    return (
        <div class="flex flex-col gap-2">
            <QuantityInput
                value={form.quantity}
                on_change={handle_quantity_change}
                size_unit={form.size_unit}
                on_unit_change={handle_unit_change}
                coin_symbol={base}
            />
        </div>
    );
}
