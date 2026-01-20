import { useMemo } from 'preact/hooks';
import { EXCHANGE_ORDER } from '../../../types/exchange.types';
import { markets } from '../../../stores/exchange_store';
import { selected_order_type } from '../../../stores/trade_store';
import { exchange_connection_status } from '../../../stores/credentials_store';
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
    const connection_status = exchange_connection_status.value;

    const exchange_symbols = useMemo<ExchangeSymbols>(() => {
        const has_connected = Object.values(connection_status).some(Boolean);
        const result: ExchangeSymbols = {};
        for (const ex of EXCHANGE_ORDER) {
            if (has_connected && !connection_status[ex]) continue;
            const symbols = Object.keys(current_markets[ex] || {});
            if (symbols.length > 0) {
                result[ex] = symbols.sort();
            }
        }
        return result;
    }, [current_markets, connection_status]);

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
