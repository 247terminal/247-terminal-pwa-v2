import { SymbolSelector } from './symbol_selector';
import { LeverageSelector } from './leverage_selector';
import { OrderTypeTabs } from './order_type_tabs';
import type { TradeToolbarProps } from '../../../types/trade.types';

export function TradeToolbar({ exchange_symbols }: TradeToolbarProps) {
    return (
        <div class="drag-handle flex items-center gap-2 px-2 py-1.5 border-b border-base-300/50 cursor-move">
            <SymbolSelector exchange_symbols={exchange_symbols} />
            <LeverageSelector />
            <div class="ml-auto">
                <OrderTypeTabs />
            </div>
        </div>
    );
}
