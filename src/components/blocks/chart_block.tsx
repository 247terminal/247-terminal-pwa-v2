import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks';
import { X } from 'lucide-preact';
import type { Time } from 'lightweight-charts';
import { TradingChart } from '../chart/trading_chart';
import { ChartToolbar, type Timeframe, type ExchangeSymbols } from '../chart/chart_toolbar';
import { EXCHANGE_ORDER, type ExchangeId } from '../../types/exchange.types';
import type { ChartSettings, ChartBlockProps, EmaSettings } from '../../types/chart.types';
import type { EmaPoint, EmaState } from '../../types/indicator.types';
import {
    fetch_ohlcv,
    watch_ohlcv,
    toolbar_to_chart_timeframe,
    type OHLCV,
} from '../../services/exchange/chart_data';
import { markets, get_market } from '../../stores/exchange_store';
import { exchange_connection_status } from '../../stores/credentials_store';
import { positions_list, orders_list } from '../../stores/account_store';
import { is_sub_minute_timeframe, type SubMinuteTimeframe } from '../../types/candle.types';
import { start_candle_generation } from '../../services/candle_generator';
import { register_navigation_handler } from '../../stores/chart_navigation_store';
import { STORAGE_CONSTANTS, EMA_CONSTANTS } from '../../config/chart.constants';
import { calculate_ema_from_ohlcv, update_ema_point, finalize_ema_state } from '../../utils/ema';

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
    let result: Record<string, ChartSettings> = {};
    try {
        const stored = localStorage.getItem(STORAGE_CONSTANTS.CHART_SETTINGS_KEY);
        result = stored ? JSON.parse(stored) : {};
    } catch {
        result = {};
    }
    settings_cache = result;
    return result;
}

function load_chart_settings(id: string, default_exchange: ExchangeId): ChartSettings {
    const all_settings = get_all_settings();
    const defaults: ChartSettings = {
        exchange: default_exchange,
        symbol: 'BTC/USDT:USDT',
        timeframe: '1',
        volume_visible: true,
        grid_visible: true,
        ema_visible: false,
        ema_period: EMA_CONSTANTS.DEFAULT_PERIOD,
        ema_color: EMA_CONSTANTS.COLOR,
        ema_line_width: EMA_CONSTANTS.LINE_WIDTH,
    };
    if (all_settings[id]) {
        return { ...defaults, ...all_settings[id] };
    }
    return defaults;
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
        } catch (e) {
            console.warn('failed to save chart settings to localStorage', e);
        }
    }, STORAGE_CONSTANTS.DEBOUNCE_MS);
}

export function ChartBlock({ id, on_remove }: ChartBlockProps) {
    const connection_status = exchange_connection_status.value;
    const default_exchange = get_default_exchange(connection_status);

    const [settings, set_settings] = useState<ChartSettings>(() =>
        load_chart_settings(id, default_exchange)
    );

    const {
        exchange,
        symbol,
        timeframe,
        volume_visible,
        grid_visible,
        ema_visible,
        ema_period,
        ema_color,
        ema_line_width,
    } = settings;

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
    const [ema_data, set_ema_data] = useState<EmaPoint[]>([]);
    const ema_state_ref = useRef<EmaState | null>(null);

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

    const all_positions = positions_list.value;
    const all_orders = orders_list.value;

    const filtered_positions = useMemo(
        () => all_positions.filter((p) => p.exchange === exchange && p.symbol === symbol),
        [all_positions, exchange, symbol]
    );

    const filtered_orders = useMemo(
        () => all_orders.filter((o) => o.exchange === exchange && o.symbol === symbol),
        [all_orders, exchange, symbol]
    );

    const current_price = useMemo(
        () => (data.length > 0 ? data[data.length - 1].close : null),
        [data]
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
        let last_candle_time: number | null = null;

        const chart_tf = is_sub_minute_timeframe(timeframe)
            ? '1'
            : toolbar_to_chart_timeframe(timeframe);

        const update_candle = (candle: OHLCV) => {
            if (cancelled) return;
            const is_new_candle = last_candle_time !== null && candle.time > last_candle_time;

            const ema_state = ema_state_ref.current;
            if (is_new_candle && ema_state && ema_state.prev_ema !== null) {
                ema_state_ref.current = finalize_ema_state(candle.close, ema_state);
            }

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

            const current_ema_state = ema_state_ref.current;
            if (current_ema_state && current_ema_state.prev_ema !== null) {
                const ema_point = update_ema_point(
                    candle.close,
                    candle.time as Time,
                    current_ema_state
                );
                if (ema_point) {
                    set_ema_data((prev) => {
                        if (prev.length === 0) return prev;
                        if (is_new_candle) {
                            return [...prev, ema_point];
                        }
                        return [...prev.slice(0, -1), ema_point];
                    });
                }
            }

            last_candle_time = candle.time;
        };

        const load_chart_data = async () => {
            set_loading(true);
            ema_state_ref.current = null;
            set_ema_data([]);
            try {
                const ohlcv = await fetch_ohlcv(exchange, symbol, chart_tf);
                if (cancelled) return;
                const market = get_market(exchange, symbol);
                set_chart_tick_size(market?.tick_size ?? 0.01);
                set_data(ohlcv);

                if (ohlcv.length > 0) {
                    const { points, state } = calculate_ema_from_ohlcv(ohlcv, ema_period);
                    ema_state_ref.current = state;
                    set_ema_data(points);
                    last_candle_time = ohlcv[ohlcv.length - 1].time;
                }

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
                set_ema_data([]);
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

    useEffect(() => {
        if (data.length === 0) return;
        const { points, state } = calculate_ema_from_ohlcv(data, ema_period);
        ema_state_ref.current = state;
        set_ema_data(points);
    }, [ema_period]);

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

    const handle_volume_toggle = useCallback(() => {
        set_settings((prev) => {
            const next = { ...prev, volume_visible: !prev.volume_visible };
            save_chart_settings(id, next);
            return next;
        });
    }, [id]);

    const handle_grid_toggle = useCallback(() => {
        set_settings((prev) => {
            const next = { ...prev, grid_visible: !prev.grid_visible };
            save_chart_settings(id, next);
            return next;
        });
    }, [id]);

    const handle_ema_toggle = useCallback(() => {
        set_settings((prev) => {
            const next = { ...prev, ema_visible: !prev.ema_visible };
            save_chart_settings(id, next);
            return next;
        });
    }, [id]);

    const handle_ema_settings_change = useCallback(
        (updates: Partial<EmaSettings>) => {
            set_settings((prev) => {
                const next = {
                    ...prev,
                    ...(updates.period !== undefined && { ema_period: updates.period }),
                    ...(updates.color !== undefined && { ema_color: updates.color }),
                    ...(updates.line_width !== undefined && { ema_line_width: updates.line_width }),
                };
                save_chart_settings(id, next);
                return next;
            });
        },
        [id]
    );

    const ema_settings = useMemo<EmaSettings>(
        () => ({
            period: ema_period,
            color: ema_color,
            line_width: ema_line_width,
        }),
        [ema_period, ema_color, ema_line_width]
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
                    ema_data={ema_data}
                    ema_visible={ema_visible}
                    ema_settings={ema_settings}
                    on_ema_toggle={handle_ema_toggle}
                    on_ema_settings_change={handle_ema_settings_change}
                    positions={filtered_positions}
                    orders={filtered_orders}
                    current_price={current_price}
                />
            </div>
        </div>
    );
}
