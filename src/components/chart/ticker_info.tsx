import { useState, useEffect, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { effect } from '@preact/signals';
import {
    get_ticker_signal,
    get_market,
    get_circulating_supply,
    ensure_circulating_supply_loaded,
    circulating_supply as circulating_supply_signal,
} from '../../stores/exchange_store';
import { format_price, format_market_cap } from '../../utils/format';
import { format_change } from './symbol_row';
import type { FlashDirection, TickerInfoProps } from '../../types/chart.types';
import { TICKER_CONSTANTS } from '../../config/chart.constants';

function format_funding_rate(rate: number | null): { text: string; positive: boolean } {
    if (rate === null) return { text: '-', positive: true };
    const pct = rate * 100;
    return { text: `${pct.toFixed(4)}%`, positive: pct >= 0 };
}

function format_countdown(next_funding_time: number | null): string {
    if (!next_funding_time) return '-';
    const now = Date.now();
    const diff = next_funding_time - now;
    if (diff <= 0) return '00:00:00';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function get_base_symbol(symbol: string): string {
    return symbol.split('/')[0];
}

export const TickerInfo = memo(function TickerInfo({ exchange, symbol }: TickerInfoProps) {
    const ticker_signal = get_ticker_signal(exchange, symbol);
    const [ticker, set_ticker] = useState(ticker_signal.value);
    const [countdown, set_countdown] = useState('');
    const [price_flash, set_price_flash] = useState<FlashDirection>(null);
    const [circulating_supply, set_circulating_supply] = useState<number | null>(null);
    const prev_price = useRef<number | null>(null);

    useEffect(() => {
        ensure_circulating_supply_loaded();
        const dispose = effect(() => {
            void circulating_supply_signal.value;
            const base = get_base_symbol(symbol);
            set_circulating_supply(get_circulating_supply(base));
        });
        return dispose;
    }, [symbol]);

    useEffect(() => {
        const dispose = effect(() => {
            const new_ticker = ticker_signal.value;
            const new_price = new_ticker?.last_price ?? null;
            const old_price = prev_price.current;

            if (old_price !== null && new_price !== null && new_price !== old_price) {
                set_price_flash(new_price > old_price ? 'up' : 'down');
            }

            prev_price.current = new_price;
            set_ticker(new_ticker);
        });
        return dispose;
    }, [ticker_signal]);

    useEffect(() => {
        if (!price_flash) return;
        const timeout = setTimeout(
            () => set_price_flash(null),
            TICKER_CONSTANTS.PRICE_FLASH_DURATION_MS
        );
        return () => clearTimeout(timeout);
    }, [price_flash]);

    useEffect(() => {
        prev_price.current = null;
        set_price_flash(null);
    }, [exchange, symbol]);

    useEffect(() => {
        const update_countdown = () => {
            set_countdown(format_countdown(ticker?.next_funding_time ?? null));
        };
        update_countdown();
        const interval = setInterval(update_countdown, 1000);
        return () => clearInterval(interval);
    }, [ticker?.next_funding_time]);

    const market = get_market(exchange, symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const price = format_price(ticker?.last_price ?? null, tick_size, true);
    const change = format_change(ticker?.last_price ?? null, ticker?.price_24h ?? null);
    const volume =
        ticker?.volume_24h?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '-';
    const funding = format_funding_rate(ticker?.funding_rate ?? null);
    const market_cap_value =
        circulating_supply && ticker?.last_price ? circulating_supply * ticker.last_price : null;
    const market_cap = format_market_cap(market_cap_value);

    const price_flash_class =
        price_flash === 'up'
            ? 'animate-flash-up'
            : price_flash === 'down'
              ? 'animate-flash-down'
              : '';

    return (
        <div class="flex items-center gap-4 text-xs no-drag cursor-default">
            <span class={`font-semibold text-sm tabular-nums ${price_flash_class}`}>${price}</span>
            <div class="flex flex-col leading-tight">
                <span class="text-base-content/50">24h Change</span>
                <span
                    class={`font-semibold tabular-nums ${change.positive ? 'text-success' : 'text-error'}`}
                >
                    {change.text}
                </span>
            </div>
            <div class="flex flex-col leading-tight">
                <span class="text-base-content/50">24h Volume</span>
                <span class="font-semibold tabular-nums text-base-content/70">{volume}</span>
            </div>
            <div class="flex flex-col leading-tight">
                <span class="text-base-content/50">Funding / Countdown</span>
                <span class="font-semibold tabular-nums">
                    <span class={funding.positive ? 'text-success' : 'text-error'}>
                        {funding.text}
                    </span>
                    <span class="text-base-content/50 mx-1">/</span>
                    <span class="text-base-content/70">{countdown}</span>
                </span>
            </div>
            <div class="flex flex-col leading-tight">
                <span class="text-base-content/50">Market Cap</span>
                <span class="font-semibold tabular-nums text-base-content/70">{market_cap}</span>
            </div>
        </div>
    );
});
