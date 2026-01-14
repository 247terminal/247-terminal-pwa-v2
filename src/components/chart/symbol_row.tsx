import { useState, useEffect } from 'preact/hooks';
import { effect } from '@preact/signals';
import type { ExchangeId } from '../../services/exchange/types';
import { get_market, get_ticker_signal } from '../../stores/exchange_store';
import { tick_size_to_precision } from '../../utils/format';

export const ITEM_HEIGHT = 28;

export function parse_symbol(symbol: string): { base: string; quote: string } {
    const parts = symbol.split('/');
    const base = (parts[0] || symbol).toUpperCase();
    const quote = (parts[1]?.split(':')[0] || '').toUpperCase();
    return { base, quote };
}

export function format_symbol(symbol: string): string {
    const parts = symbol.split('/');
    const base = parts[0] || symbol;
    const quote = parts[1]?.split(':')[0] || '';
    return `${base}${quote}`.toUpperCase();
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

export function format_volume(vol: number | null): string {
    if (vol === null) return '-';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toFixed(0);
}

interface SymbolRowProps {
    exchange: ExchangeId;
    symbol: string;
    is_selected: boolean;
    is_fav: boolean;
    on_select: () => void;
    on_toggle_fav: () => void;
}

export function SymbolRow({
    exchange,
    symbol,
    is_selected,
    is_fav,
    on_select,
    on_toggle_fav,
}: SymbolRowProps) {
    const ticker_signal = get_ticker_signal(exchange, symbol);
    const [ticker, set_ticker] = useState(ticker_signal.value);

    useEffect(() => {
        const dispose = effect(() => {
            set_ticker(ticker_signal.value);
        });
        return dispose;
    }, [ticker_signal]);

    const market = get_market(exchange, symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const parsed = parse_symbol(symbol);
    const change = format_change(ticker?.last_price ?? null, ticker?.price_24h ?? null);
    const price = format_price(ticker?.last_price ?? null, tick_size);
    const volume = format_volume(ticker?.volume_24h ?? null);

    return (
        <div
            onClick={on_select}
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
                    on_toggle_fav();
                }}
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
            <span class="w-32 flex-shrink-0 font-medium">
                {parsed.base}
                <span class={is_selected ? 'text-primary-content/60' : 'text-base-content/40'}>
                    {parsed.quote}
                </span>
            </span>
            <span class="w-20 text-right tabular-nums flex-shrink-0">{price}</span>
            <span
                class={`w-16 text-right tabular-nums flex-shrink-0 ${
                    is_selected ? '' : change.positive ? 'text-success' : 'text-error'
                }`}
            >
                {change.text}
            </span>
            <span
                class={`w-16 text-right tabular-nums flex-shrink-0 ${
                    is_selected ? '' : 'text-base-content/50'
                }`}
            >
                {volume}
            </span>
        </div>
    );
}
