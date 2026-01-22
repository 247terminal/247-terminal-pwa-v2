import { memo } from 'preact/compat';
import { useState, useMemo, useCallback, useEffect, useRef } from 'preact/hooks';
import { useComputed } from '@preact/signals';
import { VList } from 'virtua';
import type {
    TradeHistory,
    HistorySortKey,
    HistoryRowProps,
    SortDirection,
} from '../../../types/account.types';
import type { ExchangeId } from '../../../types/exchange.types';
import { EXCHANGE_IDS } from '../../../types/exchange.types';
import { history, privacy_mode, loading, refresh_history } from '../../../stores/account_store';
import { show_pnl_card } from '../../../stores/pnl_card_store';
import {
    get_market,
    symbol_leverage,
    get_missing_leverage_symbols,
    set_symbol_leverages,
} from '../../../stores/exchange_store';
import { fetch_leverage_settings } from '../../../services/exchange/account_bridge';
import { navigate_to_symbol } from '../../../stores/chart_navigation_store';
import { format_symbol, parse_symbol } from '../../chart/symbol_row';
import { get_exchange_icon } from '../../common/exchanges';
import { format_size } from '../../../utils/format';
import {
    format_display_price,
    format_pnl,
    format_pct,
    format_usd,
    format_relative_time,
    format_short_time,
    mask_value,
} from '../../../utils/account_format';
import { SortHeader } from './sort_header';

function calculate_roi_pct(trade: TradeHistory, leverage: number): number {
    if (trade.entry_price <= 0) return 0;
    const price_change_pct = ((trade.close_price - trade.entry_price) / trade.entry_price) * 100;
    const roi = price_change_pct * leverage;
    return trade.side === 'buy' ? roi : -roi;
}

const HistoryRow = memo(function HistoryRow({
    trade,
    is_private,
    fetched_leverage,
}: HistoryRowProps) {
    const is_buy = trade.side === 'buy';
    const pnl_color = trade.realized_pnl >= 0 ? 'text-success' : 'text-error';
    const market = get_market(trade.exchange, trade.symbol);
    const qty_step = market?.qty_step ?? 0.001;
    const usd_size = trade.size * trade.close_price;

    const leverage = fetched_leverage ?? trade.leverage ?? 1;
    const roi_pct = calculate_roi_pct(trade, leverage);

    const handle_symbol_click = useCallback(() => {
        navigate_to_symbol(trade.exchange, trade.symbol);
    }, [trade.exchange, trade.symbol]);

    const handle_pnl_click = useCallback(() => {
        if (is_private) return;
        show_pnl_card({
            type: 'history',
            exchange_id: trade.exchange,
            symbol: trade.symbol,
            side: trade.side === 'buy' ? 'long' : 'short',
            leverage,
            roi_percent: roi_pct,
            pnl_amount: trade.realized_pnl,
            entry_price: format_display_price(trade.entry_price),
            close_price: format_display_price(trade.close_price),
        });
    }, [is_private, trade, leverage, roi_pct]);

    return (
        <div
            class="relative flex items-center px-2 py-1.5 hover:bg-base-300/30 transition-colors text-xs"
            role="row"
        >
            <span
                class={`absolute left-0 top-1 bottom-1 w-[2.5px] ${is_buy ? 'bg-success' : 'bg-error'}`}
                aria-hidden="true"
            />
            <button
                type="button"
                class="flex-1 flex items-center gap-1.5 cursor-pointer hover:opacity-80 min-w-0 bg-transparent border-none p-0 text-left"
                onClick={handle_symbol_click}
                aria-label={`Navigate to ${format_symbol(trade.symbol)} chart`}
            >
                <span class="text-base-content/40 shrink-0" aria-hidden="true">
                    {get_exchange_icon(trade.exchange)}
                </span>
                <span class={`font-medium truncate ${is_buy ? 'text-success' : 'text-error'}`}>
                    {format_symbol(trade.symbol)}
                </span>
            </button>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content">{format_relative_time(trade.closed_at)}</div>
                <div class="text-[10px] text-base-content/50">
                    {format_short_time(trade.closed_at)}
                </div>
            </div>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content">{mask_value(format_usd(usd_size), is_private)}</div>
                <div class="text-[10px] text-base-content/50">
                    {mask_value(
                        `${format_size(trade.size, qty_step)} ${parse_symbol(trade.symbol).base}`,
                        is_private
                    )}
                </div>
            </div>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content/70">{format_display_price(trade.entry_price)}</div>
                <div class="text-base-content">{format_display_price(trade.close_price)}</div>
            </div>

            {is_private ? (
                <div class={`flex-1 text-right ${pnl_color}`} role="cell">
                    <div>{mask_value(format_pnl(trade.realized_pnl), is_private)}</div>
                    <div class="text-[10px] opacity-70">{format_pct(roi_pct)}</div>
                </div>
            ) : (
                <button
                    type="button"
                    class={`flex-1 text-right ${pnl_color} cursor-pointer hover:opacity-70 bg-transparent border-none p-0`}
                    onClick={handle_pnl_click}
                    aria-label="Open PnL card"
                >
                    <div>{format_pnl(trade.realized_pnl)}</div>
                    <div class="text-[10px] opacity-70">{format_pct(roi_pct)}</div>
                </button>
            )}
        </div>
    );
});

function sort_history(
    trades: TradeHistory[],
    key: HistorySortKey,
    direction: SortDirection
): TradeHistory[] {
    return trades.toSorted((a, b) => {
        let cmp = 0;
        switch (key) {
            case 'symbol':
                cmp = a.symbol.localeCompare(b.symbol);
                break;
            case 'time':
                cmp = a.closed_at - b.closed_at;
                break;
            case 'size':
                cmp = a.size - b.size;
                break;
            case 'entry':
                cmp = a.entry_price - b.entry_price;
                break;
            case 'pnl':
                cmp = a.realized_pnl - b.realized_pnl;
                break;
        }
        return direction === 'asc' ? cmp : -cmp;
    });
}

async function fetch_missing_leverages(
    trades: TradeHistory[],
    signal?: AbortSignal
): Promise<void> {
    const by_exchange = new Map<ExchangeId, Set<string>>();

    for (const trade of trades) {
        if (trade.exchange === 'bybit') continue;
        if (!by_exchange.has(trade.exchange)) {
            by_exchange.set(trade.exchange, new Set());
        }
        by_exchange.get(trade.exchange)!.add(trade.symbol);
    }

    const fetch_tasks = [...by_exchange].map(async ([exchange_id, symbols]) => {
        if (signal?.aborted) return;

        const missing = get_missing_leverage_symbols(exchange_id, [...symbols]);
        if (missing.length === 0) return;

        try {
            const leverages = await fetch_leverage_settings(exchange_id, missing);
            if (signal?.aborted) return;
            if (Object.keys(leverages).length > 0) {
                set_symbol_leverages(exchange_id, leverages);
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            console.error('failed to fetch leverage settings:', (err as Error).message);
        }
    });

    await Promise.all(fetch_tasks);
}

export function HistoryTab() {
    const trades = history.value;
    const is_private = privacy_mode.value;
    const is_loading = loading.value.history;
    const [sort_key, set_sort_key] = useState<HistorySortKey>('time');
    const [sort_direction, set_sort_direction] = useState<SortDirection>('desc');
    const abort_controller_ref = useRef<AbortController | null>(null);

    const leverages = useComputed(() => symbol_leverage.value);

    useEffect(() => {
        refresh_history([...EXCHANGE_IDS]);
    }, []);

    useEffect(() => {
        if (trades.length === 0) return;

        if (abort_controller_ref.current) {
            abort_controller_ref.current.abort();
        }
        abort_controller_ref.current = new AbortController();

        fetch_missing_leverages(trades, abort_controller_ref.current.signal);

        return () => {
            abort_controller_ref.current?.abort();
        };
    }, [trades]);

    const handle_sort = useCallback(
        (key: HistorySortKey) => {
            if (key === sort_key) {
                set_sort_direction((d) => (d === 'asc' ? 'desc' : 'asc'));
            } else {
                set_sort_key(key);
                set_sort_direction('desc');
            }
        },
        [sort_key]
    );

    const sorted_trades = useMemo(
        () => sort_history(trades, sort_key, sort_direction),
        [trades, sort_key, sort_direction]
    );

    if (trades.length === 0) {
        return (
            <div class="flex-1 flex items-center justify-center">
                <div class="text-xs text-base-content/50 text-center py-8">
                    {is_loading ? 'Loading history...' : 'No trade history'}
                </div>
            </div>
        );
    }

    return (
        <div class="flex-1 flex flex-col overflow-hidden" role="table" aria-label="Trade history">
            <div
                class="flex items-center px-2 py-1 text-[10px] text-base-content/50 border-b border-base-300/50 bg-base-200"
                role="row"
            >
                <SortHeader
                    label="Symbol"
                    sort_key="symbol"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    flex
                />
                <SortHeader
                    label="Time"
                    sort_key="time"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="Size"
                    sort_key="size"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="Entry/Close"
                    sort_key="entry"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="PNL"
                    sort_key="pnl"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
            </div>
            <VList class="flex-1" role="rowgroup">
                {sorted_trades.map((trade) => (
                    <HistoryRow
                        key={trade.id}
                        trade={trade}
                        is_private={is_private}
                        fetched_leverage={leverages.value[trade.exchange]?.[trade.symbol] ?? null}
                    />
                ))}
            </VList>
        </div>
    );
}
