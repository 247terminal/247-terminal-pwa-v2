import { memo } from 'preact/compat';
import { useState, useMemo, useCallback } from 'preact/hooks';
import { VList } from 'virtua';
import type { TradeHistory } from '../../../types/account.types';
import { history, privacy_mode } from '../../../stores/account_store';
import { navigate_to_symbol } from '../../../stores/chart_navigation_store';
import { format_symbol } from '../../chart/symbol_row';
import { get_exchange_icon } from '../../common/exchanges';
import {
    format_display_price,
    format_pnl,
    format_pct,
    format_relative_time,
    format_full_time,
    mask_value,
} from '../../../utils/account_format';
import { SortHeader, type SortDirection } from './sort_header';

type HistorySortKey = 'symbol' | 'time' | 'size' | 'entry' | 'pnl';

interface HistoryRowProps {
    trade: TradeHistory;
    is_private: boolean;
}

const HistoryRow = memo(function HistoryRow({ trade, is_private }: HistoryRowProps) {
    const is_buy = trade.side === 'buy';
    const pnl_color = trade.realized_pnl >= 0 ? 'text-success' : 'text-error';

    const handle_symbol_click = useCallback(() => {
        navigate_to_symbol(trade.exchange, trade.symbol);
    }, [trade.exchange, trade.symbol]);

    return (
        <div
            class="relative flex items-center gap-2 px-2 py-1.5 hover:bg-base-300/30 transition-colors text-xs"
            role="row"
        >
            <span
                class={`absolute left-0 top-1 bottom-1 w-[2.5px] ${is_buy ? 'bg-success' : 'bg-error'}`}
                aria-hidden="true"
            />
            <div
                class="w-20 shrink-0 flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                onClick={handle_symbol_click}
                onKeyDown={(e) => e.key === 'Enter' && handle_symbol_click()}
                role="button"
                tabIndex={0}
                aria-label={`Navigate to ${format_symbol(trade.symbol)} chart`}
            >
                <span class="text-base-content/40 shrink-0" aria-hidden="true">
                    {get_exchange_icon(trade.exchange)}
                </span>
                <div class={`font-medium truncate ${is_buy ? 'text-success' : 'text-error'}`}>
                    {format_symbol(trade.symbol)}
                </div>
            </div>

            <div
                class="w-14 shrink-0 text-right text-base-content/50"
                title={format_full_time(trade.closed_at)}
                role="cell"
            >
                {format_relative_time(trade.closed_at)}
            </div>

            <div class="w-14 shrink-0 text-right" role="cell">
                <div class="text-base-content">{mask_value(trade.size.toString(), is_private)}</div>
            </div>

            <div class="w-20 shrink-0 text-right" role="cell">
                <div class="text-base-content/70">
                    {mask_value(format_display_price(trade.entry_price), is_private)}
                </div>
                <div class="text-base-content">
                    {mask_value(format_display_price(trade.close_price), is_private)}
                </div>
            </div>

            <div class={`flex-1 text-right ${pnl_color}`} role="cell">
                <div>{mask_value(format_pnl(trade.realized_pnl), is_private)}</div>
                <div class="text-[10px] opacity-70">
                    {mask_value(format_pct(trade.realized_pnl_pct), is_private)}
                </div>
            </div>
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

export function HistoryTab() {
    const trades = history.value;
    const is_private = privacy_mode.value;
    const [sort_key, set_sort_key] = useState<HistorySortKey>('time');
    const [sort_direction, set_sort_direction] = useState<SortDirection>('desc');

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
                <div class="text-xs text-base-content/50 text-center py-8">No trade history</div>
            </div>
        );
    }

    return (
        <div class="flex-1 flex flex-col overflow-hidden" role="table" aria-label="Trade history">
            <div
                class="flex items-center gap-2 px-2 py-1 text-[10px] text-base-content/50 border-b border-base-300/50 bg-base-200"
                role="row"
            >
                <SortHeader
                    label="Symbol"
                    sort_key="symbol"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    width="w-20"
                />
                <SortHeader
                    label="Time"
                    sort_key="time"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    width="w-14"
                />
                <SortHeader
                    label="Size"
                    sort_key="size"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    width="w-14"
                />
                <SortHeader
                    label="Entry/Close"
                    sort_key="entry"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    width="w-20"
                />
                <SortHeader
                    label="PNL"
                    sort_key="pnl"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    width="flex-1"
                />
            </div>
            <VList class="flex-1" role="rowgroup">
                {sorted_trades.map((trade) => (
                    <HistoryRow key={trade.id} trade={trade} is_private={is_private} />
                ))}
            </VList>
        </div>
    );
}
