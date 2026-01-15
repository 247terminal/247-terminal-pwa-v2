import { useState, useEffect, useRef } from 'preact/hooks';
import { effect } from '@preact/signals';
import type { ExchangeId } from '../../types/exchange.types';
import { get_ticker_signal, get_market } from '../../stores/exchange_store';
import { format_price } from '../../utils/format';
import { format_change } from './symbol_row';

type FlashDirection = 'up' | 'down' | null;

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

interface TickerInfoProps {
    exchange: ExchangeId;
    symbol: string;
}

export function TickerInfo({ exchange, symbol }: TickerInfoProps) {
    const ticker_signal = get_ticker_signal(exchange, symbol);
    const [ticker, set_ticker] = useState(ticker_signal.value);
    const [countdown, set_countdown] = useState('');
    const [price_flash, set_price_flash] = useState<FlashDirection>(null);
    const prev_price = useRef<number | null>(null);

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
        const timeout = setTimeout(() => set_price_flash(null), 3000);
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

    const price_flash_class =
        price_flash === 'up'
            ? 'animate-flash-up'
            : price_flash === 'down'
              ? 'animate-flash-down'
              : '';

    if (!ticker) return null;

    return (
        <div class="flex items-center gap-4 text-xs">
            <span class={`font-semibold text-sm tabular-nums ${price_flash_class}`}>{price}</span>
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
                <span class="text-base-content/50">Funding</span>
                <span
                    class={`font-semibold tabular-nums ${funding.positive ? 'text-success' : 'text-error'}`}
                >
                    {funding.text}
                </span>
            </div>
            <div class="flex flex-col leading-tight">
                <span class="text-base-content/50">Countdown</span>
                <span class="font-semibold tabular-nums text-base-content/70">{countdown}</span>
            </div>
        </div>
    );
}
