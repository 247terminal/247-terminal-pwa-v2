import { useMemo } from 'preact/hooks';
import { X } from 'lucide-preact';
import { EXCHANGE_IDS } from '../../../types/exchange.types';
import { markets } from '../../../stores/exchange_store';
import { selected_order_type } from '../../../stores/trade_store';
import { TradeToolbar } from './trade_toolbar';
import { LimitForm } from './limit_form';
import { MarketForm } from './market_form';
import { ScaleForm } from './scale_form';
import { TwapForm } from './twap_form';
import { OrderSummary } from './order_summary';
import { OrderButtons } from './order_buttons';
import type { ExchangeSymbols } from './symbol_selector';

interface TradeBlockProps {
    on_remove?: () => void;
}

export function TradeBlock({ on_remove }: TradeBlockProps) {
    const order_type = selected_order_type.value;
    const current_markets = markets.value;

    const exchange_symbols = useMemo<ExchangeSymbols>(() => {
        const result: ExchangeSymbols = {};
        for (const ex of EXCHANGE_IDS) {
            result[ex] = Object.keys(current_markets[ex] || {}).sort();
        }
        return result;
    }, [current_markets]);

    return (
        <div class="h-full flex flex-col group">
            <div class="drag-handle flex items-center justify-between px-3 py-2 bg-theme-header border-b border-base-300/50 cursor-move">
                <span class="text-xs font-medium text-base-content tracking-wide">TRADE</span>
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <X class="w-4 h-4" />
                    </button>
                )}
            </div>

            <TradeToolbar exchange_symbols={exchange_symbols} />

            <div class="flex-1 p-2 overflow-auto">
                {order_type === 'limit' && <LimitForm />}
                {order_type === 'market' && <MarketForm />}
                {order_type === 'scale' && <ScaleForm />}
                {order_type === 'twap' && <TwapForm />}

                <OrderSummary />
                <OrderButtons />
            </div>
        </div>
    );
}
