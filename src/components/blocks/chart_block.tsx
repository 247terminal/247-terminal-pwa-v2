import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { X } from 'lucide-preact';
import { TradingChart } from '../chart/trading_chart';
import { ChartToolbar, type Timeframe, type ExchangeSymbols } from '../chart/chart_toolbar';
import { EXCHANGE_IDS, type ExchangeId } from '../../types/exchange.types';
import {
    fetch_ohlcv,
    watch_ohlcv,
    toolbar_to_chart_timeframe,
    type OHLCV,
} from '../../services/exchange/chart_data';
import { markets, get_market } from '../../stores/exchange_store';
import { is_sub_minute_timeframe, type SubMinuteTimeframe } from '../../types/candle.types';
import { start_candle_generation } from '../../services/candle_generator';

interface ChartBlockProps {
    on_remove?: () => void;
}

export function ChartBlock({ on_remove }: ChartBlockProps) {
    const [exchange, set_exchange] = useState<ExchangeId>('binance');
    const [symbol, set_symbol] = useState('BTC/USDT:USDT');
    const [timeframe, set_timeframe] = useState<Timeframe>('1');
    const [data, set_data] = useState<OHLCV[]>([]);
    const [loading, set_loading] = useState(true);

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

    const next_tick_size = useMemo(() => {
        const market = get_market(exchange, symbol);
        return market?.tick_size ?? 0.01;
    }, [exchange, symbol, current_markets]);

    const [chart_tick_size, set_chart_tick_size] = useState(next_tick_size);

    const current_key = `${exchange}:${symbol}:${timeframe}`;

    useEffect(() => {
        if (!symbol) return;

        let cancelled = false;
        let cleanup_stream: (() => void) | null = null;

        const chart_tf = is_sub_minute_timeframe(timeframe)
            ? '1'
            : toolbar_to_chart_timeframe(timeframe);

        const update_candle = (candle: OHLCV) => {
            if (cancelled) return;
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
        };

        const load_chart_data = async () => {
            set_loading(true);
            try {
                const ohlcv = await fetch_ohlcv(exchange, symbol, chart_tf);
                if (cancelled) return;
                set_chart_tick_size(next_tick_size);
                set_data(ohlcv);

                if (is_sub_minute_timeframe(timeframe) && ohlcv.length > 0) {
                    cleanup_stream = start_candle_generation(
                        exchange,
                        symbol,
                        timeframe as SubMinuteTimeframe,
                        update_candle,
                        ohlcv[ohlcv.length - 1]
                    );
                }
            } catch (err) {
                if (cancelled) return;
                console.error('failed to load chart data:', err);
                set_data([]);
            } finally {
                if (!cancelled) {
                    set_loading(false);
                }
            }
        };

        if (!is_sub_minute_timeframe(timeframe)) {
            cleanup_stream = watch_ohlcv(exchange, symbol, chart_tf, update_candle);
        }

        load_chart_data();

        return () => {
            cancelled = true;
            if (cleanup_stream) cleanup_stream();
        };
    }, [exchange, symbol, timeframe, next_tick_size]);

    const handle_symbol_change = useCallback(
        (ex: ExchangeId, s: string) => {
            if (ex === exchange && s === symbol) return;
            set_loading(true);
            set_exchange(ex);
            set_symbol(s);
        },
        [exchange, symbol]
    );

    const handle_timeframe_change = useCallback((tf: Timeframe) => {
        set_loading(true);
        set_timeframe(tf);
    }, []);

    return (
        <div class="h-full flex flex-col group">
            <div class="drag-handle flex items-center justify-between bg-theme-header border-b border-base-300/50 relative z-40 cursor-move">
                <ChartToolbar
                    exchange={exchange}
                    symbol={symbol}
                    exchange_symbols={exchange_symbols}
                    timeframe={timeframe}
                    on_symbol_change={handle_symbol_change}
                    on_timeframe_change={handle_timeframe_change}
                    loading={!has_any_markets}
                />
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="px-3 text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <X class="w-4 h-4" />
                    </button>
                )}
            </div>
            <div class="flex-1 relative min-h-0 overflow-hidden">
                <TradingChart
                    data={data}
                    data_key={current_key}
                    loading={loading}
                    tick_size={chart_tick_size}
                />
            </div>
        </div>
    );
}
