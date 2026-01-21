import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks';
import { X } from 'lucide-preact';
import { TradingChart } from '../chart/trading_chart';
import { ChartToolbar, type Timeframe, type ExchangeSymbols } from '../chart/chart_toolbar';
import { EXCHANGE_ORDER, type ExchangeId } from '../../types/exchange.types';
import type { ChartSettings, ChartBlockProps } from '../../types/chart.types';
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
import { STORAGE_CONSTANTS } from '../../config/chart.constants';

function get_default_exchange(connection_status: Record<ExchangeId, boolean>): ExchangeId {
    return EXCHANGE_ORDER.toSorted((a, b) => {
        const a_connected = connection_status[a] ? 1 : 0;
        const b_connected = connection_status[b] ? 1 : 0;
        return b_connected - a_connected;
    })[0];
}

let settings_cache: Record<string, ChartSettings> | null = null;
let save_timeout: ReturnType<typeof setTimeout> | null = null;

function get_all_settings(): Record<string, ChartSettings> {
    if (settings_cache) return settings_cache;
    try {
        const stored = localStorage.getItem(STORAGE_CONSTANTS.CHART_SETTINGS_KEY);
        settings_cache = stored ? JSON.parse(stored) : {};
    } catch {
        settings_cache = {};
    }
    return settings_cache!;
}

function load_chart_settings(id: string, default_exchange: ExchangeId): ChartSettings {
    const all_settings = get_all_settings();
    if (all_settings[id]) {
        return all_settings[id];
    }
    return {
        exchange: default_exchange,
        symbol: 'BTC/USDT:USDT',
        timeframe: '1',
        volume_visible: true,
        grid_visible: true,
    };
}

function save_chart_settings(id: string, settings: ChartSettings): void {
    const all_settings = get_all_settings();
    all_settings[id] = settings;
    settings_cache = all_settings;

    if (save_timeout) clearTimeout(save_timeout);
    save_timeout = setTimeout(() => {
        try {
            localStorage.setItem(
                STORAGE_CONSTANTS.CHART_SETTINGS_KEY,
                JSON.stringify(all_settings)
            );
        } catch {}
    }, STORAGE_CONSTANTS.DEBOUNCE_MS);
}

export function ChartBlock({ id, on_remove }: ChartBlockProps) {
    const connection_status = exchange_connection_status.value;
    const default_exchange = get_default_exchange(connection_status);

    const [settings, set_settings] = useState<ChartSettings>(() =>
        load_chart_settings(id, default_exchange)
    );

    const { exchange, symbol, timeframe, volume_visible, grid_visible } = settings;

    const update_settings = useCallback(
        (updates: Partial<ChartSettings>) => {
            set_settings((prev) => {
                const next = { ...prev, ...updates };
                save_chart_settings(id, next);
                return next;
            });
        },
        [id]
    );
    const [data, set_data] = useState<OHLCV[]>([]);
    const [loading, set_loading] = useState(true);

    const state_ref = useRef({ exchange, symbol });
    state_ref.current = { exchange, symbol };

    useEffect(() => {
        return register_navigation_handler((request) => {
            const { exchange: curr_ex, symbol: curr_sym } = state_ref.current;
            if (request.exchange === curr_ex && request.symbol === curr_sym) return;
            set_loading(true);
            update_settings({ exchange: request.exchange, symbol: request.symbol });
        });
    }, [update_settings]);

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
            } catch {
                if (cancelled) return;
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
            update_settings({ exchange: ex, symbol: s });
        },
        [exchange, symbol, update_settings]
    );

    const handle_timeframe_change = useCallback(
        (tf: Timeframe) => {
            set_loading(true);
            update_settings({ timeframe: tf });
        },
        [update_settings]
    );

    const handle_volume_toggle = useCallback(
        (visible: boolean) => {
            update_settings({ volume_visible: visible });
        },
        [update_settings]
    );

    const handle_grid_toggle = useCallback(
        (visible: boolean) => {
            update_settings({ grid_visible: visible });
        },
        [update_settings]
    );

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
                    timeframe={timeframe}
                    volume_visible={volume_visible}
                    grid_visible={grid_visible}
                    on_volume_toggle={handle_volume_toggle}
                    on_grid_toggle={handle_grid_toggle}
                />
            </div>
        </div>
    );
}
