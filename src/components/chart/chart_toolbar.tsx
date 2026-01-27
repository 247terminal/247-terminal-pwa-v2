import { useState, useMemo, useCallback, useEffect, useRef } from 'preact/hooks';
import { type ExchangeId } from '../../types/exchange.types';
import type { Timeframe } from '../../types/candle.types';
import type {
    ChartFilterType,
    ChartSortField,
    ChartSortDirection,
    ChartListItem,
    SymbolWithExchange,
    ExchangeSymbols,
    ChartToolbarProps,
} from '../../types/chart.types';
import { get_exchange_icon } from '../common/exchanges';
import { favourites, toggle_favourite } from '../../stores/symbol_favourites';
import { get_ticker } from '../../stores/exchange_store';
import { SymbolRow, ITEM_HEIGHT, format_symbol } from './symbol_row';
import { TimeframeSelector } from './timeframe_selector';
import { TickerInfo } from './ticker_info';
import { use_escape_key } from '../../hooks';

export type { Timeframe, ExchangeSymbols };

const FILTER_STORAGE_KEY = '247terminal_symbol_filter';
const HEADER_HEIGHT = 24;
const CONTAINER_HEIGHT = 300;
const OVERSCAN = 5;

function load_filter(): ChartFilterType {
    try {
        const stored = localStorage.getItem(FILTER_STORAGE_KEY);
        if (stored) return stored as ChartFilterType;
    } catch (e) {
        console.warn('failed to load symbol filter from localStorage:', (e as Error).message);
    }
    return 'all';
}

function save_filter(filter: ChartFilterType): void {
    try {
        localStorage.setItem(FILTER_STORAGE_KEY, filter);
    } catch (e) {
        console.warn('failed to save symbol filter to localStorage:', (e as Error).message);
    }
}

export function ChartToolbar({
    exchange,
    symbol,
    exchange_symbols,
    timeframe,
    on_symbol_change,
    on_timeframe_change,
    loading,
}: ChartToolbarProps) {
    const [symbol_open, set_symbol_open] = useState(false);
    const [symbol_search, set_symbol_search] = useState('');
    const [active_filter, set_active_filter] = useState<ChartFilterType>(load_filter);
    const [sort_field, set_sort_field] = useState<ChartSortField>('volume');
    const [sort_direction, set_sort_direction] = useState<ChartSortDirection>('desc');
    const [scroll_top, set_scroll_top] = useState(0);
    const scroll_ref = useRef<HTMLDivElement>(null);

    const toggle_sort = useCallback(
        (field: ChartSortField) => {
            if (sort_field === field) {
                set_sort_direction((d) => (d === 'asc' ? 'desc' : 'asc'));
            } else {
                set_sort_field(field);
                set_sort_direction('asc');
            }
        },
        [sort_field]
    );

    useEffect(() => {
        save_filter(active_filter);
    }, [active_filter]);

    useEffect(() => {
        if (symbol_open) {
            set_scroll_top(0);
            if (scroll_ref.current) {
                scroll_ref.current.scrollTop = 0;
            }
        }
    }, [symbol_open]);

    const close_symbol_dropdown = useCallback(() => {
        if (symbol_open) set_symbol_open(false);
    }, [symbol_open]);

    use_escape_key(close_symbol_dropdown);

    const available_exchanges = useMemo(() => {
        return (Object.keys(exchange_symbols) as ExchangeId[]).filter(
            (ex) => (exchange_symbols[ex]?.length ?? 0) > 0
        );
    }, [exchange_symbols]);

    const all_symbols = useMemo(() => {
        const result: SymbolWithExchange[] = [];
        for (const ex of available_exchanges) {
            const symbols = exchange_symbols[ex] || [];
            for (const s of symbols) {
                result.push({ exchange: ex, symbol: s });
            }
        }
        return result;
    }, [exchange_symbols, available_exchanges]);

    const favourites_list = favourites.value;

    const favourites_count = useMemo(() => {
        return all_symbols.filter((item) =>
            favourites_list.some((f) => f.exchange === item.exchange && f.symbol === item.symbol)
        ).length;
    }, [all_symbols, favourites_list]);

    const flat_list = useMemo(() => {
        let filtered = all_symbols;

        if (active_filter === 'favourites') {
            filtered = filtered.filter((item) =>
                favourites_list.some(
                    (f) => f.exchange === item.exchange && f.symbol === item.symbol
                )
            );
        } else if (active_filter !== 'all') {
            filtered = filtered.filter((item) => item.exchange === active_filter);
        }

        if (symbol_search) {
            const search = symbol_search.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.symbol.toLowerCase().includes(search) ||
                    format_symbol(item.symbol).toLowerCase().includes(search)
            );
        }

        const sorted = [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sort_field === 'symbol') {
                cmp = format_symbol(a.symbol).localeCompare(format_symbol(b.symbol));
            } else {
                const ta = get_ticker(a.exchange, a.symbol);
                const tb = get_ticker(b.exchange, b.symbol);
                if (sort_field === 'price') {
                    cmp = (ta?.last_price ?? 0) - (tb?.last_price ?? 0);
                } else if (sort_field === 'change') {
                    const ca = ta?.price_24h
                        ? ((ta.last_price - ta.price_24h) / ta.price_24h) * 100
                        : 0;
                    const cb = tb?.price_24h
                        ? ((tb.last_price - tb.price_24h) / tb.price_24h) * 100
                        : 0;
                    cmp = ca - cb;
                } else if (sort_field === 'volume') {
                    cmp = (ta?.volume_24h ?? 0) - (tb?.volume_24h ?? 0);
                }
            }
            return sort_direction === 'asc' ? cmp : -cmp;
        });

        const groups = available_exchanges.reduce(
            (acc, ex) => ({ ...acc, [ex]: [] }),
            {} as Record<ExchangeId, SymbolWithExchange[]>
        );
        for (const item of sorted) {
            groups[item.exchange]?.push(item);
        }

        const items: ChartListItem[] = [];
        for (const ex of available_exchanges) {
            const group = groups[ex];
            if (!group || group.length === 0) continue;

            items.push({ type: 'header', exchange: ex, count: group.length });

            for (const item of group) {
                items.push({
                    type: 'symbol',
                    exchange: item.exchange,
                    symbol: item.symbol,
                });
            }
        }

        return items;
    }, [
        all_symbols,
        active_filter,
        symbol_search,
        sort_field,
        sort_direction,
        favourites_list,
        available_exchanges,
    ]);

    const total_height = useMemo(() => {
        return flat_list.reduce(
            (sum, item) => sum + (item.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT),
            0
        );
    }, [flat_list]);

    const visible_items = useMemo(() => {
        if (flat_list.length === 0) {
            return { items: [], top_offset: 0, start_index: 0, sticky_header: null };
        }

        const start_offset = scroll_top;
        const end_offset = scroll_top + CONTAINER_HEIGHT;

        let current_offset = 0;
        let start_index = -1;
        let end_index = flat_list.length;
        let sticky_header: { exchange: ExchangeId; count: number } | null = null;

        for (let i = 0; i < flat_list.length; i++) {
            const item = flat_list[i];
            const height = item.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT;

            if (item.type === 'header' && current_offset <= start_offset) {
                sticky_header = { exchange: item.exchange, count: item.count };
            }

            if (start_index === -1 && current_offset + height > start_offset) {
                start_index = Math.max(0, i - OVERSCAN);
            }

            current_offset += height;

            if (current_offset > end_offset) {
                end_index = Math.min(flat_list.length, i + 1 + OVERSCAN);
                break;
            }
        }

        if (start_index === -1) start_index = 0;

        let top_offset = 0;
        for (let i = 0; i < start_index; i++) {
            top_offset += flat_list[i].type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT;
        }

        return {
            items: flat_list.slice(start_index, end_index),
            top_offset,
            start_index,
            sticky_header,
        };
    }, [flat_list, scroll_top]);

    const handle_scroll = useCallback((e: Event) => {
        set_scroll_top((e.target as HTMLDivElement).scrollTop);
    }, []);

    const handle_symbol_select = useCallback(
        (ex: ExchangeId, sym: string) => {
            on_symbol_change(ex, sym);
            set_symbol_open(false);
            set_symbol_search('');
        },
        [on_symbol_change]
    );

    return (
        <div class="flex items-center gap-2 px-3 py-1.5">
            <div class="relative">
                <button
                    type="button"
                    onClick={() => set_symbol_open(!symbol_open)}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors font-medium min-w-30 text-left"
                >
                    {loading ? (
                        'Loading...'
                    ) : symbol ? (
                        <>
                            <span class="text-base-content/30">{get_exchange_icon(exchange)}</span>
                            <span>{format_symbol(symbol)}</span>
                        </>
                    ) : (
                        'Select symbol'
                    )}
                </button>
                {symbol_open && (
                    <>
                        <div
                            class="fixed inset-0 z-40 no-drag cursor-default"
                            onClick={() => set_symbol_open(false)}
                        />
                        <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 w-97 no-drag cursor-default">
                            <div class="p-1">
                                <input
                                    type="text"
                                    value={symbol_search}
                                    onInput={(e) =>
                                        set_symbol_search((e.target as HTMLInputElement).value)
                                    }
                                    placeholder="Search symbols..."
                                    class="w-full px-2 py-1 text-xs bg-base-300 rounded border-none outline-none text-base-content"
                                />
                            </div>
                            <div class="flex items-center gap-1 px-1 pb-1">
                                <button
                                    type="button"
                                    onClick={() => set_active_filter('all')}
                                    class={`px-2 py-1 text-xs rounded transition-colors ${
                                        active_filter === 'all'
                                            ? 'bg-primary text-primary-content'
                                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                                    }`}
                                >
                                    All ({all_symbols.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => set_active_filter('favourites')}
                                    class={`px-2 py-1 text-xs rounded transition-colors ${
                                        active_filter === 'favourites'
                                            ? 'bg-primary text-primary-content'
                                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                                    }`}
                                >
                                    ★ ({favourites_count})
                                </button>
                                <div class="flex items-center gap-0.5 ml-auto">
                                    {available_exchanges.map((ex) => (
                                        <button
                                            type="button"
                                            key={ex}
                                            onClick={() => set_active_filter(ex)}
                                            class={`p-1 rounded transition-colors ${
                                                active_filter === ex
                                                    ? 'bg-primary text-primary-content'
                                                    : 'text-base-content/30 hover:text-base-content hover:bg-base-300'
                                            }`}
                                        >
                                            {get_exchange_icon(ex)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div class="flex items-center px-2 py-1 text-xs text-base-content/50 border-t border-base-300">
                                <span class="w-4 mr-2 shrink-0" />
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('symbol')}
                                    class="w-32 text-left hover:text-base-content transition-colors shrink-0"
                                >
                                    Symbol{' '}
                                    {sort_field === 'symbol' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('price')}
                                    class="w-20 text-right hover:text-base-content transition-colors shrink-0"
                                >
                                    {sort_field === 'price' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}{' '}
                                    Price
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('change')}
                                    class="w-16 text-right hover:text-base-content transition-colors shrink-0"
                                >
                                    {sort_field === 'change' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}{' '}
                                    24h%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('volume')}
                                    class="w-16 text-right hover:text-base-content transition-colors shrink-0"
                                >
                                    {sort_field === 'volume' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}{' '}
                                    Vol
                                </button>
                            </div>
                            <div class="relative">
                                {visible_items.sticky_header && scroll_top >= HEADER_HEIGHT && (
                                    <div
                                        class="absolute top-0 left-0 right-3.75 z-10 flex items-center gap-1.5 px-2 text-xs bg-base-300 text-base-content/70"
                                        style={{ height: `${HEADER_HEIGHT}px` }}
                                    >
                                        {get_exchange_icon(visible_items.sticky_header.exchange)}
                                        <span class="uppercase">
                                            {visible_items.sticky_header.exchange}
                                        </span>
                                        <span class="text-base-content/40">
                                            ({visible_items.sticky_header.count})
                                        </span>
                                    </div>
                                )}
                                <div
                                    ref={scroll_ref}
                                    class="overflow-y-auto"
                                    style={{ height: `${CONTAINER_HEIGHT}px` }}
                                    onScroll={handle_scroll}
                                >
                                    <div
                                        style={{
                                            height: `${total_height}px`,
                                            position: 'relative',
                                        }}
                                    >
                                        <div
                                            style={{
                                                transform: `translateY(${visible_items.top_offset}px)`,
                                            }}
                                        >
                                            {visible_items.items.map((item) => {
                                                if (item.type === 'header') {
                                                    return (
                                                        <div
                                                            key={`header-${item.exchange}`}
                                                            class="flex items-center gap-1.5 px-2 text-xs bg-base-300 text-base-content/70"
                                                            style={{ height: `${HEADER_HEIGHT}px` }}
                                                        >
                                                            {get_exchange_icon(item.exchange)}
                                                            <span class="uppercase">
                                                                {item.exchange}
                                                            </span>
                                                            <span class="text-base-content/40">
                                                                ({item.count})
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <SymbolRow
                                                        key={`${item.exchange}-${item.symbol}`}
                                                        exchange={item.exchange}
                                                        symbol={item.symbol}
                                                        is_selected={
                                                            exchange === item.exchange &&
                                                            symbol === item.symbol
                                                        }
                                                        is_fav={favourites_list.some(
                                                            (f) =>
                                                                f.exchange === item.exchange &&
                                                                f.symbol === item.symbol
                                                        )}
                                                        on_select={() =>
                                                            handle_symbol_select(
                                                                item.exchange,
                                                                item.symbol
                                                            )
                                                        }
                                                        on_toggle_fav={() =>
                                                            toggle_favourite(
                                                                item.exchange,
                                                                item.symbol
                                                            )
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {flat_list.length === 0 && (
                                        <div class="px-2 py-1 text-xs text-base-content/50">
                                            No symbols found
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <TimeframeSelector timeframe={timeframe} on_change={on_timeframe_change} />

            {symbol && <TickerInfo exchange={exchange} symbol={symbol} />}
        </div>
    );
}
