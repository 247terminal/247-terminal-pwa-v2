import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { TradingChart } from '../chart/trading_chart';
import { ChartToolbar, type Timeframe, type ExchangeSymbols } from '../chart/chart_toolbar';
import { EXCHANGE_IDS, type ExchangeId } from '../../services/exchange/types';
import {
    fetch_ohlcv,
    fetch_markets,
    watch_ohlcv,
    toolbar_to_chart_timeframe,
    type OHLCV,
} from '../../services/exchange/chart_data';
import { markets, set_markets, has_markets } from '../../stores/exchange_store';

interface ChartBlockProps {
    on_remove?: () => void;
}

export function ChartBlock({ on_remove }: ChartBlockProps) {
    const [exchange, set_exchange] = useState<ExchangeId>('binance');
    const [symbol, set_symbol] = useState('BTC/USDT:USDT');
    const [timeframe, set_timeframe] = useState<Timeframe>('1');
    const [data, set_data] = useState<OHLCV[]>([]);
    const [loading, set_loading] = useState(true);
    const has_data = useSignal(false);

    const current_markets = markets.value;

    const exchange_symbols = useMemo<ExchangeSymbols>(() => {
        const result: ExchangeSymbols = {};
        for (const ex of EXCHANGE_IDS) {
            result[ex] = Object.keys(current_markets[ex] || {}).sort();
        }
        return result;
    }, [current_markets]);

    const has_any_markets = useMemo(
        () => Object.values(current_markets).some((m) => Object.keys(m).length > 0),
        [current_markets]
    );

    const load_all_markets = useCallback(() => {
        for (const ex of EXCHANGE_IDS) {
            if (has_markets(ex)) continue;
            fetch_markets(ex)
                .then((market_list) => set_markets(ex, market_list))
                .catch((err) => {
                    console.error(`failed to load ${ex} markets:`, err);
                    set_markets(ex, []);
                });
        }
    }, []);

    const load_chart_data = useCallback(async () => {
        if (!symbol) return;

        set_loading(true);
        try {
            const chart_tf = toolbar_to_chart_timeframe(timeframe);
            const ohlcv = await fetch_ohlcv(exchange, symbol, chart_tf);
            set_data(ohlcv);
            has_data.value = ohlcv.length > 0;
        } catch (err) {
            console.error('failed to load chart data:', err);
            set_data([]);
            has_data.value = false;
        } finally {
            set_loading(false);
        }
    }, [exchange, symbol, timeframe]);

    useEffect(() => {
        load_all_markets();
    }, []);

    useEffect(() => {
        if (symbol && has_any_markets) {
            load_chart_data();
        }
    }, [symbol, timeframe, has_any_markets, load_chart_data]);

    useEffect(() => {
        if (!symbol || !has_data.value) return;

        const chart_tf = toolbar_to_chart_timeframe(timeframe);
        const cleanup = watch_ohlcv(exchange, symbol, chart_tf, (candle) => {
            set_data((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                if (candle.time === last.time) {
                    return [...prev.slice(0, -1), candle];
                } else if (candle.time > last.time) {
                    return [...prev, candle];
                }
                return prev;
            });
        });

        return cleanup;
    }, [exchange, symbol, timeframe, has_data.value]);

    const handle_symbol_change = (ex: ExchangeId, s: string) => {
        set_exchange(ex);
        set_symbol(s);
        set_data([]);
    };

    return (
        <div class="h-full flex flex-col group">
            <div class="drag-handle flex items-center justify-between bg-theme-header border-b border-base-300/50 relative z-10 cursor-move">
                <ChartToolbar
                    exchange={exchange}
                    symbol={symbol}
                    exchange_symbols={exchange_symbols}
                    timeframe={timeframe}
                    on_symbol_change={handle_symbol_change}
                    on_timeframe_change={set_timeframe}
                    loading={!has_any_markets}
                />
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="px-3 text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <div class="flex-1 relative min-h-0 overflow-hidden">
                <TradingChart data={data} loading={loading} />
            </div>
        </div>
    );
}
