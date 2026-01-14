import { useState, useMemo, useCallback, useEffect, useRef } from 'preact/hooks';
import { EXCHANGE_IDS, type ExchangeId } from '../../services/exchange/types';
import { get_exchange_icon } from '../common/exchanges';
import { favourites, toggle_favourite } from '../../stores/symbol_favourites';
import { get_ticker, get_market } from '../../stores/exchange_store';
import { tick_size_to_precision } from '../../utils/format';

const FILTER_STORAGE_KEY = '247terminal_symbol_filter';
const ITEM_HEIGHT = 28;
const HEADER_HEIGHT = 24;
const CONTAINER_HEIGHT = 300;
const OVERSCAN = 5;

type FilterType = 'all' | 'favourites' | ExchangeId;
type SortField = 'symbol' | 'price' | 'change' | 'volume';
type SortDirection = 'asc' | 'desc';

type ListItem =
    | { type: 'header'; exchange: ExchangeId; count: number }
    | { type: 'symbol'; exchange: ExchangeId; symbol: string; data: SymbolRowData };

interface SymbolRowData {
    base: string;
    quote: string;
    price: string;
    change_text: string;
    change_positive: boolean;
    volume: string;
    is_fav: boolean;
}

function load_filter(): FilterType {
    try {
        const stored = localStorage.getItem(FILTER_STORAGE_KEY);
        if (stored) return stored as FilterType;
    } catch {}
    return 'all';
}

function save_filter(filter: FilterType): void {
    try {
        localStorage.setItem(FILTER_STORAGE_KEY, filter);
    } catch {}
}

function format_symbol(symbol: string): string {
    const parts = symbol.split('/');
    const base = parts[0] || symbol;
    const quote = parts[1]?.split(':')[0] || '';
    return `${base}${quote}`.toUpperCase();
}

function parse_symbol(symbol: string): { base: string; quote: string } {
    const parts = symbol.split('/');
    const base = (parts[0] || symbol).toUpperCase();
    const quote = (parts[1]?.split(':')[0] || '').toUpperCase();
    return { base, quote };
}

function format_price(price: number | null, tick_size: number): string {
    if (price === null || price === 0) return '-';
    const precision = tick_size_to_precision(tick_size);
    return price.toFixed(precision);
}

function format_change(
    last: number | null,
    open: number | null
): { text: string; positive: boolean } {
    if (last === null || open === null || open === 0) return { text: '-', positive: true };
    const pct = ((last - open) / open) * 100;
    return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, positive: pct >= 0 };
}

function format_volume(vol: number | null): string {
    if (vol === null) return '-';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toFixed(0);
}

export type Timeframe =
    | 'S1'
    | 'S5'
    | 'S15'
    | 'S30'
    | '1'
    | '5'
    | '15'
    | '30'
    | '60'
    | '120'
    | '240'
    | '480'
    | '720'
    | 'D'
    | 'W'
    | 'M';

export type ExchangeSymbols = Partial<Record<ExchangeId, string[]>>;

interface SymbolWithExchange {
    exchange: ExchangeId;
    symbol: string;
}

interface ChartToolbarProps {
    exchange: ExchangeId;
    symbol: string;
    exchange_symbols: ExchangeSymbols;
    timeframe: Timeframe;
    on_symbol_change: (exchange: ExchangeId, symbol: string) => void;
    on_timeframe_change: (tf: Timeframe) => void;
    loading?: boolean;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    S1: '1s',
    S5: '5s',
    S15: '15s',
    S30: '30s',
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '120': '2h',
    '240': '4h',
    '480': '8h',
    '720': '12h',
    D: '1D',
    W: '1W',
    M: '1M',
};

const SECONDS: Timeframe[] = ['S1', 'S5', 'S15', 'S30'];
const MINUTES: Timeframe[] = ['1', '5', '15', '30'];
const HOURS: Timeframe[] = ['60', '120', '240', '480'];
const DAYS: Timeframe[] = ['720', 'D', 'W', 'M'];

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
    const [timeframe_open, set_timeframe_open] = useState(false);
    const [symbol_search, set_symbol_search] = useState('');
    const [active_filter, set_active_filter] = useState<FilterType>(load_filter);
    const [sort_field, set_sort_field] = useState<SortField>('volume');
    const [sort_direction, set_sort_direction] = useState<SortDirection>('desc');
    const [scroll_top, set_scroll_top] = useState(0);
    const scroll_ref = useRef<HTMLDivElement>(null);

    const toggle_sort = (field: SortField) => {
        if (sort_field === field) {
            set_sort_direction(sort_direction === 'asc' ? 'desc' : 'asc');
        } else {
            set_sort_field(field);
            set_sort_direction('asc');
        }
    };

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

    const all_symbols = useMemo(() => {
        const result: SymbolWithExchange[] = [];
        for (const ex of EXCHANGE_IDS) {
            const symbols = exchange_symbols[ex] || [];
            for (const s of symbols) {
                result.push({ exchange: ex, symbol: s });
            }
        }
        return result;
    }, [exchange_symbols]);

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

        const groups = EXCHANGE_IDS.reduce(
            (acc, ex) => ({ ...acc, [ex]: [] }),
            {} as Record<ExchangeId, SymbolWithExchange[]>
        );
        for (const item of sorted) {
            groups[item.exchange].push(item);
        }

        const items: ListItem[] = [];
        for (const ex of EXCHANGE_IDS) {
            const group = groups[ex];
            if (group.length === 0) continue;

            items.push({ type: 'header', exchange: ex, count: group.length });

            for (const item of group) {
                const ticker = get_ticker(item.exchange, item.symbol);
                const market = get_market(item.exchange, item.symbol);
                const tick_size = market?.tick_size ?? 0.01;
                const parsed = parse_symbol(item.symbol);
                const change = format_change(ticker?.last_price ?? null, ticker?.price_24h ?? null);

                items.push({
                    type: 'symbol',
                    exchange: item.exchange,
                    symbol: item.symbol,
                    data: {
                        base: parsed.base,
                        quote: parsed.quote,
                        price: format_price(ticker?.last_price ?? null, tick_size),
                        change_text: change.text,
                        change_positive: change.positive,
                        volume: format_volume(ticker?.volume_24h ?? null),
                        is_fav: favourites_list.some(
                            (f) => f.exchange === item.exchange && f.symbol === item.symbol
                        ),
                    },
                });
            }
        }

        return items;
    }, [all_symbols, active_filter, symbol_search, sort_field, sort_direction, favourites_list]);

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

    const handle_timeframe_select = useCallback(
        (tf: Timeframe) => {
            on_timeframe_change(tf);
            set_timeframe_open(false);
        },
        [on_timeframe_change]
    );

    const render_timeframe_row = (timeframes: Timeframe[]) => (
        <div class="flex gap-0.5">
            {timeframes.map((tf) => (
                <button
                    type="button"
                    key={tf}
                    onClick={() => handle_timeframe_select(tf)}
                    class={`py-1 w-[36px] text-xs rounded transition-colors text-center ${
                        timeframe === tf
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content/70 hover:text-base-content hover:bg-base-300'
                    }`}
                >
                    {TIMEFRAME_LABELS[tf]}
                </button>
            ))}
        </div>
    );

    return (
        <div class="flex items-center gap-2 px-3 py-1.5">
            <div class="relative">
                <button
                    type="button"
                    onClick={() => set_symbol_open(!symbol_open)}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors font-medium min-w-[120px] text-left"
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
                        <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 w-[388px] no-drag cursor-default">
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
                                    {EXCHANGE_IDS.map((ex) => (
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
                                <span class="w-4 mr-2 flex-shrink-0" />
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('symbol')}
                                    class="w-32 text-left hover:text-base-content transition-colors flex-shrink-0"
                                >
                                    Symbol{' '}
                                    {sort_field === 'symbol' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('price')}
                                    class="w-20 text-right hover:text-base-content transition-colors flex-shrink-0"
                                >
                                    {sort_field === 'price' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}{' '}
                                    Price
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('change')}
                                    class="w-16 text-right hover:text-base-content transition-colors flex-shrink-0"
                                >
                                    {sort_field === 'change' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}{' '}
                                    24h%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle_sort('volume')}
                                    class="w-16 text-right hover:text-base-content transition-colors flex-shrink-0"
                                >
                                    {sort_field === 'volume' &&
                                        (sort_direction === 'asc' ? '↑' : '↓')}{' '}
                                    Vol
                                </button>
                            </div>
                            <div class="relative">
                                {visible_items.sticky_header && scroll_top >= HEADER_HEIGHT && (
                                    <div
                                        class="absolute top-0 left-0 right-[15px] z-10 flex items-center gap-1.5 px-2 text-xs bg-base-300 text-base-content/70"
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

                                                const is_selected =
                                                    exchange === item.exchange &&
                                                    symbol === item.symbol;
                                                const { data } = item;

                                                return (
                                                    <div
                                                        key={`${item.exchange}-${item.symbol}`}
                                                        onClick={() =>
                                                            handle_symbol_select(
                                                                item.exchange,
                                                                item.symbol
                                                            )
                                                        }
                                                        class={`flex items-center px-2 text-xs transition-colors cursor-pointer ${
                                                            is_selected
                                                                ? 'bg-primary text-primary-content'
                                                                : 'text-base-content/70 hover:text-base-content hover:bg-base-300/50'
                                                        }`}
                                                        style={{ height: `${ITEM_HEIGHT}px` }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggle_favourite(
                                                                    item.exchange,
                                                                    item.symbol
                                                                );
                                                            }}
                                                            class={`w-4 mr-2 flex-shrink-0 transition-colors ${
                                                                data.is_fav
                                                                    ? 'text-warning'
                                                                    : is_selected
                                                                      ? 'text-primary-content/50 hover:text-primary-content'
                                                                      : 'text-base-content/30 hover:text-warning'
                                                            }`}
                                                        >
                                                            {data.is_fav ? '★' : '☆'}
                                                        </button>
                                                        <span class="w-32 flex-shrink-0 font-medium">
                                                            {data.base}
                                                            <span
                                                                class={
                                                                    is_selected
                                                                        ? 'text-primary-content/60'
                                                                        : 'text-base-content/40'
                                                                }
                                                            >
                                                                {data.quote}
                                                            </span>
                                                        </span>
                                                        <span class="w-20 text-right tabular-nums flex-shrink-0">
                                                            {data.price}
                                                        </span>
                                                        <span
                                                            class={`w-16 text-right tabular-nums flex-shrink-0 ${
                                                                is_selected
                                                                    ? ''
                                                                    : data.change_positive
                                                                      ? 'text-success'
                                                                      : 'text-error'
                                                            }`}
                                                        >
                                                            {data.change_text}
                                                        </span>
                                                        <span
                                                            class={`w-16 text-right tabular-nums flex-shrink-0 ${
                                                                is_selected
                                                                    ? ''
                                                                    : 'text-base-content/50'
                                                            }`}
                                                        >
                                                            {data.volume}
                                                        </span>
                                                    </div>
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

            <div class="relative">
                <button
                    type="button"
                    onClick={() => set_timeframe_open(!timeframe_open)}
                    class="px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors"
                >
                    {TIMEFRAME_LABELS[timeframe]}
                </button>
                {timeframe_open && (
                    <>
                        <div
                            class="fixed inset-0 z-40 no-drag cursor-default"
                            onClick={() => set_timeframe_open(false)}
                        />
                        <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 no-drag cursor-default">
                            <div class="flex flex-col gap-0.5 p-1">
                                {render_timeframe_row(SECONDS)}
                                {render_timeframe_row(MINUTES)}
                                {render_timeframe_row(HOURS)}
                                {render_timeframe_row(DAYS)}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
