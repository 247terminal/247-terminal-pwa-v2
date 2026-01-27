import { memo } from 'preact/compat';
import { useCallback, useMemo, useState, useEffect } from 'preact/hooks';
import { toast } from 'sonner';
import {
    active_twaps_list,
    get_twap_progress,
    active_twap_count,
} from '../../../stores/twap_store';
import { cancel_twap_api } from '../../../services/exchange/account_bridge';
import { get_exchange_icon } from '../../common/exchanges';
import type { TwapOrder } from '../../../types/twap.types';

function format_time(ms: number): string {
    if (ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function get_time_until_next_order(twap: TwapOrder): number {
    const orders_executed = twap.orders_placed + twap.orders_failed;
    if (orders_executed >= twap.orders_count) return 0;
    const next_order_time = twap.started_at + (orders_executed + 1) * twap.interval_ms;
    return Math.max(0, next_order_time - Date.now());
}

interface TwapRowProps {
    twap: TwapOrder;
    tick: number;
}

function get_sync_delay(): string {
    const cycle_ms = 1000;
    const offset = Date.now() % cycle_ms;
    return `-${offset}ms`;
}

const TwapRow = memo(function TwapRow({ twap, tick }: TwapRowProps) {
    void tick;
    const progress = get_twap_progress(twap);
    const time_until_next = get_time_until_next_order(twap);
    const base = useMemo(() => twap.symbol.split('/')[0], [twap.symbol]);
    const sync_delay = useMemo(() => get_sync_delay(), [tick]);

    const handle_cancel = useCallback(async () => {
        try {
            await cancel_twap_api(twap.id);
            toast.success('TWAP cancelled');
        } catch (err) {
            toast.error(`Failed to cancel TWAP: ${(err as Error).message}`);
        }
    }, [twap.id]);

    const is_buy = twap.side === 'buy';
    const is_active = twap.status === 'active';
    const accent = is_buy ? 'success' : 'error';

    return (
        <div
            class={`
                relative overflow-hidden rounded-lg
                bg-gradient-to-r ${is_buy ? 'from-success/5' : 'from-error/5'} to-transparent
                border border-base-content/5
                transition-all duration-200 hover:border-base-content/10
            `}
        >
            <div class={`absolute left-0 top-0 bottom-0 w-0.5 bg-${accent}`} aria-hidden="true" />

            <div class="p-2.5 pl-3">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-base-content/40 shrink-0">
                            {get_exchange_icon(twap.exchange)}
                        </span>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class={`font-semibold text-sm text-${accent}`}>{base}</span>
                                <span
                                    class={`
                                        text-[10px] font-medium px-1.5 py-0.5 rounded
                                        ${is_buy ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}
                                    `}
                                >
                                    {twap.side.toUpperCase()}
                                </span>
                            </div>
                            <div class="text-[10px] text-base-content/50">
                                ${twap.total_size_usd.toLocaleString()} · {twap.orders_count} orders
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        {is_active && (
                            <div class="flex items-center gap-1.5">
                                <span class="relative flex h-2 w-2">
                                    <span
                                        class={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${accent} opacity-75`}
                                        style={{ animationDelay: sync_delay }}
                                    />
                                    <span
                                        class={`relative inline-flex rounded-full h-2 w-2 bg-${accent}`}
                                    />
                                </span>
                                <span class={`text-[10px] font-medium text-${accent}`}>Active</span>
                            </div>
                        )}
                        {twap.status === 'completed' && (
                            <span class="text-[10px] font-medium text-success flex items-center gap-1">
                                <svg
                                    class="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                Done
                            </span>
                        )}
                        {twap.status === 'cancelled' && (
                            <span class="text-[10px] font-medium text-warning">Cancelled</span>
                        )}
                        {twap.status === 'error' && (
                            <span class="text-[10px] font-medium text-error">Failed</span>
                        )}
                        {is_active && (
                            <button
                                type="button"
                                onClick={handle_cancel}
                                class="text-[10px] px-2 py-1 rounded bg-base-content/5 text-base-content/60 hover:bg-error/20 hover:text-error transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-[10px]">
                        <div class="flex items-center gap-3">
                            <span class="text-base-content/70">
                                <span class={`font-medium text-${accent}`}>
                                    {twap.orders_placed}
                                </span>
                                <span class="text-base-content/40">/{twap.orders_count}</span>
                                {twap.orders_failed > 0 && (
                                    <span class="text-error ml-1">
                                        ({twap.orders_failed} failed)
                                    </span>
                                )}
                            </span>
                            {is_active && progress.orders_remaining > 0 && (
                                <span class="text-base-content/50">
                                    Next in{' '}
                                    <span class="text-base-content/70">
                                        {format_time(time_until_next)}
                                    </span>
                                </span>
                            )}
                        </div>
                        <span class="text-base-content/50">
                            {format_time(progress.remaining_ms)} left
                        </span>
                    </div>

                    <div class="relative h-1 bg-base-content/10 rounded-full overflow-hidden">
                        <div
                            class={`
                                absolute inset-y-0 left-0 rounded-full
                                bg-gradient-to-r ${is_buy ? 'from-success/80 to-success' : 'from-error/80 to-error'}
                                transition-all duration-500 ease-out
                            `}
                            style={{ width: `${Math.min(100, progress.percent)}%` }}
                        />
                        {is_active && (
                            <div
                                class={`absolute inset-y-0 left-0 rounded-full bg-${accent}/30 animate-pulse`}
                                style={{
                                    width: `${Math.min(100, progress.percent)}%`,
                                    animationDelay: sync_delay,
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export const ActiveTwaps = memo(function ActiveTwaps() {
    const twaps = active_twaps_list.value;
    const has_active = active_twap_count.value > 0;
    const [tick, set_tick] = useState(0);

    useEffect(() => {
        if (!has_active) return;
        const interval = setInterval(() => set_tick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, [has_active]);

    if (twaps.length === 0) return null;

    return (
        <div class="mt-3 space-y-2">
            <div class="flex items-center gap-2 px-0.5">
                <div class="text-[10px] uppercase tracking-wider text-base-content/40 font-medium">
                    TWAP Orders
                </div>
                <div class="text-[10px] px-1.5 py-0.5 rounded-full bg-base-content/10 text-base-content/50">
                    {twaps.length}
                </div>
            </div>
            <div class="space-y-2">
                {twaps.map((twap) => (
                    <TwapRow key={twap.id} twap={twap} tick={tick} />
                ))}
            </div>
        </div>
    );
});
