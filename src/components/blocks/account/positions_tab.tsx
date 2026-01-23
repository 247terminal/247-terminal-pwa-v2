import { memo } from 'preact/compat';
import { useState, useMemo, useCallback } from 'preact/hooks';
import { VList } from 'virtua';
import type {
    Position,
    PositionSortKey,
    PositionRowProps,
    SortDirection,
} from '../../../types/account.types';
import {
    positions_list,
    privacy_mode,
    loading,
    close_position,
    open_tpsl_modal,
} from '../../../stores/account_store';
import { LogoSpinner } from '../../common/logo_spinner';
import { show_pnl_card } from '../../../stores/pnl_card_store';
import { get_market, get_ticker_signal } from '../../../stores/exchange_store';
import { navigate_to_symbol } from '../../../stores/chart_navigation_store';
import { format_symbol, parse_symbol } from '../../chart/symbol_row';
import { get_exchange_icon } from '../../common/exchanges';
import { format_price, format_size } from '../../../utils/format';
import { format_pnl, format_pct, format_usd, mask_value } from '../../../utils/account_format';
import { calculate_position_pnl } from '../../../utils/pnl';
import { SortHeader } from './sort_header';

const PositionRow = memo(function PositionRow({ position, is_private }: PositionRowProps) {
    const is_long = position.side === 'long';
    const market = get_market(position.exchange, position.symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const qty_step = market?.qty_step ?? 0.001;

    const ticker = get_ticker_signal(position.exchange, position.symbol).value;
    const last_price = ticker?.last_price ?? position.last_price;
    const { pnl, pnl_pct } = calculate_position_pnl(
        is_long,
        position.entry_price,
        last_price,
        position.size,
        position.margin,
        position.leverage
    );
    const pnl_color = pnl >= 0 ? 'text-success' : 'text-error';

    const handle_close = useCallback(() => {
        close_position(position.exchange, position.symbol);
    }, [position.exchange, position.symbol]);

    const handle_tpsl = useCallback(() => {
        open_tpsl_modal(position);
    }, [position]);

    const handle_symbol_click = useCallback(() => {
        navigate_to_symbol(position.exchange, position.symbol);
    }, [position.exchange, position.symbol]);

    const handle_pnl_click = useCallback(() => {
        if (is_private) return;
        show_pnl_card({
            type: 'position',
            position,
            exchange_id: position.exchange,
        });
    }, [is_private, position]);

    return (
        <div
            class="relative flex items-center px-2 py-1.5 hover:bg-base-300/30 transition-colors text-xs"
            role="row"
        >
            <span
                class={`absolute left-0 top-1 bottom-1 w-[2.5px] ${is_long ? 'bg-success' : 'bg-error'}`}
                aria-hidden="true"
            />
            <button
                type="button"
                class="flex-1 flex items-center gap-1.5 cursor-pointer hover:opacity-80 min-w-0 bg-transparent border-none p-0 text-left"
                onClick={handle_symbol_click}
                aria-label={`Navigate to ${format_symbol(position.symbol)} chart`}
            >
                <span class="text-base-content/40 shrink-0" aria-hidden="true">
                    {get_exchange_icon(position.exchange)}
                </span>
                <span class="min-w-0">
                    <span
                        class={`font-medium truncate block ${is_long ? 'text-success' : 'text-error'}`}
                    >
                        {format_symbol(position.symbol)}
                    </span>
                    <span class="text-[10px] text-base-content/50 capitalize block">
                        {position.margin_mode} {position.leverage}x
                    </span>
                </span>
            </button>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content">
                    {mask_value(format_usd(position.size * last_price), is_private)}
                </div>
                <div class="text-[10px] text-base-content/50">
                    {mask_value(
                        `${format_size(position.size, qty_step)} ${parse_symbol(position.symbol).base}`,
                        is_private
                    )}
                </div>
            </div>

            <div class="flex-1 text-right" role="cell">
                <div class="text-base-content/70">
                    {format_price(position.entry_price, tick_size)}
                </div>
                <div class="text-base-content">{format_price(last_price, tick_size)}</div>
            </div>

            <div class="flex-1 text-right text-error/70" role="cell">
                {is_private
                    ? '****'
                    : position.liquidation_price
                      ? format_price(position.liquidation_price, tick_size)
                      : '--'}
            </div>

            {is_private ? (
                <div class={`flex-1 text-right ${pnl_color}`} role="cell">
                    <div>{mask_value(format_pnl(pnl), is_private)}</div>
                    <div class="text-[10px] opacity-70">{format_pct(pnl_pct)}</div>
                </div>
            ) : (
                <button
                    type="button"
                    class={`flex-1 text-right ${pnl_color} cursor-pointer hover:opacity-70 bg-transparent border-none p-0`}
                    onClick={handle_pnl_click}
                    aria-label="Open PnL card"
                >
                    <div>{format_pnl(pnl)}</div>
                    <div class="text-[10px] opacity-70">{format_pct(pnl_pct)}</div>
                </button>
            )}

            <div class="flex-1 flex justify-end gap-1" role="cell">
                <button
                    type="button"
                    onClick={handle_tpsl}
                    class="px-1.5 py-0.5 text-[10px] rounded bg-base-300 hover:bg-base-content/20 text-base-content/70 hover:text-base-content transition-colors"
                    aria-label={`Set take profit and stop loss for ${format_symbol(position.symbol)}`}
                >
                    TP/SL
                </button>
                <button
                    type="button"
                    onClick={handle_close}
                    class="px-1.5 py-0.5 text-[10px] rounded bg-error/20 hover:bg-error/40 text-error transition-colors"
                    aria-label={`Close ${format_symbol(position.symbol)} position`}
                >
                    Close
                </button>
            </div>
        </div>
    );
});

function sort_positions(
    positions: Position[],
    key: PositionSortKey,
    direction: SortDirection
): Position[] {
    return positions.toSorted((a, b) => {
        let cmp = 0;
        switch (key) {
            case 'symbol':
                cmp = a.symbol.localeCompare(b.symbol);
                break;
            case 'size':
                cmp = a.size * a.last_price - b.size * b.last_price;
                break;
            case 'entry':
                cmp = a.entry_price - b.entry_price;
                break;
            case 'liq':
                cmp = (a.liquidation_price ?? 0) - (b.liquidation_price ?? 0);
                break;
            case 'pnl':
                cmp = a.unrealized_pnl - b.unrealized_pnl;
                break;
        }
        return direction === 'asc' ? cmp : -cmp;
    });
}

export function PositionsTab() {
    const positions = positions_list.value;
    const is_private = privacy_mode.value;
    const is_loading = loading.value.positions;
    const [sort_key, set_sort_key] = useState<PositionSortKey>('pnl');
    const [sort_direction, set_sort_direction] = useState<SortDirection>('desc');

    const handle_sort = useCallback(
        (key: PositionSortKey) => {
            if (key === sort_key) {
                set_sort_direction((d) => (d === 'asc' ? 'desc' : 'asc'));
            } else {
                set_sort_key(key);
                set_sort_direction('desc');
            }
        },
        [sort_key]
    );

    const sorted_positions = useMemo(
        () => sort_positions(positions, sort_key, sort_direction),
        [positions, sort_key, sort_direction]
    );

    if (positions.length === 0) {
        return (
            <div class="flex-1 flex items-center justify-center">
                {is_loading ? (
                    <LogoSpinner size={32} />
                ) : (
                    <div class="text-xs text-base-content/50 text-center py-8">
                        No open positions
                    </div>
                )}
            </div>
        );
    }

    return (
        <div class="flex-1 flex flex-col overflow-hidden" role="table" aria-label="Open positions">
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
                    label="Size"
                    sort_key="size"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="Entry/Last"
                    sort_key="entry"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="Liq"
                    sort_key="liq"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <SortHeader
                    label="uPNL"
                    sort_key="pnl"
                    current_key={sort_key}
                    direction={sort_direction}
                    on_sort={handle_sort}
                    align="right"
                    flex
                />
                <div class="flex-1 text-right" role="columnheader">
                    Actions
                </div>
            </div>
            <VList class="flex-1" role="rowgroup">
                {sorted_positions.map((pos) => (
                    <PositionRow key={pos.id} position={pos} is_private={is_private} />
                ))}
            </VList>
        </div>
    );
}
