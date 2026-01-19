import { useMemo } from 'preact/hooks';
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

export function TradeBlock() {
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
        <div class="h-full flex flex-col bg-theme-header">
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
