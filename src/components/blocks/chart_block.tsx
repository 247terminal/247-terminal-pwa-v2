import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks';
import { X } from 'lucide-preact';
import { TradingChart } from '../chart/trading_chart';
import { ChartToolbar, type Timeframe, type ExchangeSymbols } from '../chart/chart_toolbar';
import { EXCHANGE_ORDER, type ExchangeId } from '../../types/exchange.types';
import {
    fetch_ohlcv,
    watch_ohlcv,
    toolbar_to_chart_timeframe,
    type OHLCV,
} from '../../services/exchange/chart_data';
import { markets, get_market } from '../../stores/exchange_store';
import { exchange_connection_status } from '../../stores/credentials_store';
import { is_sub_minute_timeframe, type SubMinuteTimeframe } from '../../types/candle.types';
import { start_candle_generation } from '../../services/candle_generator';
import { register_navigation_handler } from '../../stores/chart_navigation_store';

function get_default_exchange(connection_status: Record<ExchangeId, boolean>): ExchangeId {
    return EXCHANGE_ORDER.toSorted((a, b) => {
        const a_connected = connection_status[a] ? 1 : 0;
        const b_connected = connection_status[b] ? 1 : 0;
        return b_connected - a_connected;
    })[0];
}

interface ChartBlockProps {
    on_remove?: () => void;
}

export function ChartBlock({ on_remove }: ChartBlockProps) {
    const connection_status = exchange_connection_status.value;
    const [exchange, set_exchange] = useState<ExchangeId>(() =>
        get_default_exchange(connection_status)
    );
    const [symbol, set_symbol] = useState('BTC/USDT:USDT');
    const [timeframe, set_timeframe] = useState<Timeframe>('1');
    const [data, set_data] = useState<OHLCV[]>([]);
    const [loading, set_loading] = useState(true);

    const state_ref = useRef({ exchange, symbol });
    state_ref.current = { exchange, symbol };

    useEffect(() => {
        return register_navigation_handler((request) => {
            const { exchange: curr_ex, symbol: curr_sym } = state_ref.current;
            if (request.exchange === curr_ex && request.symbol === curr_sym) return;
            set_loading(true);
            set_exchange(request.exchange);
            set_symbol(request.symbol);
        });
    }, []);

    const current_markets = markets.value;

    const exchange_symbols = useMemo<ExchangeSymbols>(() => {
        const has_connected = Object.values(connection_status).some(Boolean);
        const result: ExchangeSymbols = {};
        for (const ex of EXCHANGE_ORDER) {
            if (has_connected && !connection_status[ex]) continue;
            const symbols = Object.keys(current_markets[ex] || {});
            if (symbols.length > 0) {
                result[ex] = symbols.toSorted();
            }
        }
        return result;
    }, [current_markets, connection_status]);

    const has_any_markets = useMemo(
        () => Object.values(current_markets).some((m) => Object.keys(m).length > 0),
        [current_markets]
    );

    const [chart_tick_size, set_chart_tick_size] = useState(() => {
        const market = get_market(exchange, symbol);
        return market?.tick_size ?? 0.01;
    });

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
                const market = get_market(exchange, symbol);
                set_chart_tick_size(market?.tick_size ?? 0.01);
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
    }, [exchange, symbol, timeframe]);

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
                        aria-label="Remove chart"
                    >
                        <X class="w-4 h-4" aria-hidden="true" />
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
