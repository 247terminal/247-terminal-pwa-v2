import { useState, useMemo, useCallback, useEffect, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { EXCHANGE_ORDER, type ExchangeId } from '../../../types/exchange.types';
import type {
    TradeFilterType,
    TradeListItem,
    TradeSymbolWithExchange,
    TradeExchangeSymbols,
    SymbolRowItemProps,
    SymbolSelectorProps,
} from '../../../types/trade.types';
import { get_exchange_icon } from '../../common/exchanges';
import { favourites, toggle_favourite } from '../../../stores/symbol_favourites';
import { get_ticker, get_market } from '../../../stores/exchange_store';
import {
    selected_exchange,
    selected_symbol,
    set_exchange_symbol,
} from '../../../stores/trade_store';
import { exchange_connection_status } from '../../../stores/credentials_store';
import { format_symbol } from '../../chart/symbol_row';
import { format_price } from '../../../utils/format';
import { use_escape_key } from '../../../hooks';

export type { TradeExchangeSymbols as ExchangeSymbols };

const ITEM_HEIGHT = 28;
const HEADER_HEIGHT = 24;
const CONTAINER_HEIGHT = 250;
const OVERSCAN = 5;

const SymbolRowItem = memo(function SymbolRowItem({
    exchange,
    symbol,
    is_selected,
    is_fav,
    on_select,
    on_toggle_fav,
}: SymbolRowItemProps) {
    const ticker = get_ticker(exchange, symbol);
    const market = get_market(exchange, symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const price = format_price(ticker?.last_price ?? null, tick_size);

    const handle_click = useCallback(() => {
        on_select(exchange, symbol);
    }, [exchange, symbol, on_select]);

    const handle_fav_click = useCallback(
        (e: Event) => {
            e.stopPropagation();
            on_toggle_fav(exchange, symbol);
        },
        [exchange, symbol, on_toggle_fav]
    );

    return (
        <div
            onClick={handle_click}
            class={`flex items-center px-2 text-xs transition-colors cursor-pointer ${
                is_selected
                    ? 'bg-primary text-primary-content'
                    : 'text-base-content/70 hover:text-base-content hover:bg-base-300/50'
            }`}
            style={{ height: `${ITEM_HEIGHT}px` }}
        >
            <button
                type="button"
                onClick={handle_fav_click}
                class={`w-4 mr-2 flex-shrink-0 transition-colors ${
                    is_fav
                        ? 'text-warning'
                        : is_selected
                          ? 'text-primary-content/50 hover:text-primary-content'
                          : 'text-base-content/30 hover:text-warning'
                }`}
            >
                {is_fav ? '★' : '☆'}
            </button>
            <span class="flex-1 font-medium">{format_symbol(symbol)}</span>
            <span
                class={`tabular-nums ${is_selected ? 'text-primary-content/80' : 'text-base-content/60'}`}
            >
                {price}
            </span>
        </div>
    );
});

export function SymbolSelector({ exchange_symbols }: SymbolSelectorProps) {
    const [open, set_open] = useState(false);
    const [search, set_search] = useState('');
    const [active_filter, set_active_filter] = useState<TradeFilterType>('all');
    const [scroll_top, set_scroll_top] = useState(0);
    const scroll_ref = useRef<HTMLDivElement>(null);

    const exchange = selected_exchange.value;
    const symbol = selected_symbol.value;
    const connection_status = exchange_connection_status.value;

    const sorted_exchanges = useMemo(() => {
        return [...EXCHANGE_ORDER]
            .filter((ex) => (exchange_symbols[ex]?.length ?? 0) > 0)
            .sort((a, b) => {
                const a_connected = connection_status[a] ? 1 : 0;
                const b_connected = connection_status[b] ? 1 : 0;
                return b_connected - a_connected;
            });
    }, [exchange_symbols, connection_status]);

    useEffect(() => {
        if (open) {
            set_scroll_top(0);
            if (scroll_ref.current) {
                scroll_ref.current.scrollTop = 0;
            }
        }
    }, [open]);

    const close_dropdown = useCallback(() => {
        if (open) set_open(false);
    }, [open]);

    use_escape_key(close_dropdown);

    const all_symbols = useMemo(() => {
        const result: TradeSymbolWithExchange[] = [];
        for (const ex of sorted_exchanges) {
            const symbols = exchange_symbols[ex] || [];
            for (const s of symbols) {
                result.push({ exchange: ex, symbol: s });
            }
        }
        return result;
    }, [exchange_symbols, sorted_exchanges]);

    const favourites_list = favourites.value;

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

        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.symbol.toLowerCase().includes(s) ||
                    format_symbol(item.symbol).toLowerCase().includes(s)
            );
        }

        const groups = sorted_exchanges.reduce(
            (acc, ex) => ({ ...acc, [ex]: [] }),
            {} as Record<ExchangeId, TradeSymbolWithExchange[]>
        );
        for (const item of filtered) {
            groups[item.exchange]?.push(item);
        }

        const items: TradeListItem[] = [];
        for (const ex of sorted_exchanges) {
            const group = groups[ex];
            if (!group || group.length === 0) continue;
            items.push({ type: 'header', exchange: ex, count: group.length });
            for (const item of group) {
                items.push({ type: 'symbol', exchange: item.exchange, symbol: item.symbol });
            }
        }
        return items;
    }, [all_symbols, active_filter, search, favourites_list, sorted_exchanges]);

    const total_height = useMemo(() => {
        return flat_list.reduce(
            (sum, item) => sum + (item.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT),
            0
        );
    }, [flat_list]);

    const visible_items = useMemo(() => {
        if (flat_list.length === 0) {
            return { items: [], top_offset: 0 };
        }

        const start_offset = scroll_top;
        const end_offset = scroll_top + CONTAINER_HEIGHT;

        let current_offset = 0;
        let start_index = -1;
        let end_index = flat_list.length;

        for (let i = 0; i < flat_list.length; i++) {
            const item = flat_list[i];
            const height = item.type === 'header' ? HEADER_HEIGHT : ITEM_HEIGHT;

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

        return { items: flat_list.slice(start_index, end_index), top_offset };
    }, [flat_list, scroll_top]);

    const handle_scroll = useCallback((e: Event) => {
        set_scroll_top((e.target as HTMLDivElement).scrollTop);
    }, []);

    const handle_select = useCallback((ex: ExchangeId, sym: string) => {
        set_exchange_symbol(ex, sym);
        set_open(false);
        set_search('');
    }, []);

    const handle_toggle_fav = useCallback((ex: ExchangeId, sym: string) => {
        toggle_favourite(ex, sym);
    }, []);

    return (
        <div class="relative">
            <button
                type="button"
                onClick={() => set_open(!open)}
                class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-base-200 hover:bg-base-300 text-base-content transition-colors font-medium min-w-24 text-left"
            >
                <span class="text-base-content/30">{get_exchange_icon(exchange)}</span>
                <span>{format_symbol(symbol)}</span>
            </button>

            {open && (
                <>
                    <div
                        class="fixed inset-0 z-40 no-drag cursor-default"
                        onClick={() => set_open(false)}
                    />
                    <div class="absolute top-full left-0 mt-1 bg-base-200 rounded shadow-lg z-50 w-72 no-drag cursor-default">
                        <div class="p-1">
                            <input
                                type="text"
                                value={search}
                                onInput={(e) => set_search((e.target as HTMLInputElement).value)}
                                placeholder="Search symbols..."
                                class="w-full px-2 py-1 text-xs bg-base-200 rounded border-none outline-none text-base-content"
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
                                All
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
                                ★
                            </button>
                            <div class="flex items-center gap-0.5 ml-auto">
                                {sorted_exchanges.map((ex) => (
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
                        <div
                            ref={scroll_ref}
                            class="overflow-y-auto border-t border-base-300"
                            style={{ height: `${CONTAINER_HEIGHT}px` }}
                            onScroll={handle_scroll}
                        >
                            <div style={{ height: `${total_height}px`, position: 'relative' }}>
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
                                                    <span class="uppercase">{item.exchange}</span>
                                                    <span class="text-base-content/40">
                                                        ({item.count})
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return (
                                            <SymbolRowItem
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
                                                on_select={handle_select}
                                                on_toggle_fav={handle_toggle_fav}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            {flat_list.length === 0 && (
                                <div class="px-2 py-4 text-xs text-base-content/50 text-center">
                                    No symbols found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
