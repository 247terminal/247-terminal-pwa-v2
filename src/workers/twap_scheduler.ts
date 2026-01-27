import type {
    TwapOrder,
    TwapProgressUpdate,
    TwapStatus,
    TwapWorkerParams,
} from '@/types/twap.types';
import type { MarginMode } from '@/types/trading.types';
import { placeMarketOrder } from './account_worker';
import { fetchTickerPrice } from './data_fetchers';

export type { TwapWorkerParams };

interface ActiveTwap extends TwapOrder {
    leverage: number;
    margin_mode: MarginMode;
    current_price: number;
    max_market_qty?: number;
    qty_step?: number;
    contract_size?: number;
    slippage?: number | 'MARKET';
}

type ProgressCallback = (update: TwapProgressUpdate) => void;

const active_twaps = new Map<string, ActiveTwap>();
const twap_timeouts = new Map<string, ReturnType<typeof setTimeout>>();
const twap_callbacks = new Map<string, ProgressCallback>();

function generate_twap_id(): string {
    return `twap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function to_twap_order(twap: ActiveTwap): TwapOrder {
    return {
        id: twap.id,
        exchange: twap.exchange,
        symbol: twap.symbol,
        side: twap.side,
        total_size_usd: twap.total_size_usd,
        orders_count: twap.orders_count,
        duration_minutes: twap.duration_minutes,
        interval_ms: twap.interval_ms,
        size_per_order_usd: twap.size_per_order_usd,
        status: twap.status,
        orders_placed: twap.orders_placed,
        orders_failed: twap.orders_failed,
        started_at: twap.started_at,
    };
}

export function start_twap(params: TwapWorkerParams, post_update: ProgressCallback): TwapOrder {
    const id = generate_twap_id();
    const interval_ms = (params.duration_minutes * 60 * 1000) / params.orders_count;
    const size_per_order_usd = params.total_size_usd / params.orders_count;

    const twap: ActiveTwap = {
        id,
        exchange: params.exchange,
        symbol: params.symbol,
        side: params.side,
        total_size_usd: params.total_size_usd,
        orders_count: params.orders_count,
        duration_minutes: params.duration_minutes,
        interval_ms,
        size_per_order_usd,
        status: 'active',
        orders_placed: 0,
        orders_failed: 0,
        started_at: Date.now(),
        leverage: params.leverage,
        margin_mode: params.margin_mode,
        current_price: params.current_price,
        max_market_qty: params.max_market_qty,
        qty_step: params.qty_step,
        contract_size: params.contract_size,
        slippage: params.slippage,
    };

    active_twaps.set(id, twap);
    twap_callbacks.set(id, post_update);

    execute_single_order(id);

    return to_twap_order(twap);
}

export function cancel_twap(id: string): TwapOrder | null {
    const twap = active_twaps.get(id);
    if (!twap) return null;

    const timeout_id = twap_timeouts.get(id);
    if (timeout_id) {
        clearTimeout(timeout_id);
        twap_timeouts.delete(id);
    }

    twap.status = 'cancelled';
    const callback = twap_callbacks.get(id);
    if (callback) {
        callback({
            id,
            orders_placed: twap.orders_placed,
            orders_failed: twap.orders_failed,
            status: 'cancelled',
        });
    }

    const result = to_twap_order(twap);
    cleanup_twap(id);

    return result;
}

function cleanup_twap(id: string): void {
    active_twaps.delete(id);
    twap_callbacks.delete(id);
    twap_timeouts.delete(id);
}

async function execute_single_order(id: string): Promise<void> {
    const twap = active_twaps.get(id);
    if (!twap || twap.status !== 'active') return;

    const total_orders_attempted = twap.orders_placed + twap.orders_failed;
    if (total_orders_attempted >= twap.orders_count) {
        complete_twap(id, 'completed');
        return;
    }

    try {
        const fresh_price = await fetchTickerPrice(twap.exchange, twap.symbol);
        if (fresh_price > 0) {
            twap.current_price = fresh_price;
        }
    } catch (err) {
        console.warn(`twap price fetch failed, using last price:`, (err as Error).message);
    }

    const size_in_coins = twap.size_per_order_usd / twap.current_price;

    try {
        await placeMarketOrder(twap.exchange, {
            symbol: twap.symbol,
            side: twap.side,
            size: size_in_coins,
            margin_mode: twap.margin_mode,
            position_mode: 'one_way',
            leverage: twap.leverage,
            reduce_only: false,
            slippage: twap.slippage,
            current_price: twap.current_price,
            max_market_qty: twap.max_market_qty,
            qty_step: twap.qty_step,
            contract_size: twap.contract_size,
        });

        twap.orders_placed++;
    } catch (err) {
        console.error(`twap order failed:`, (err as Error).message);
        twap.orders_failed++;
    }

    const callback = twap_callbacks.get(id);
    if (callback) {
        callback({
            id,
            orders_placed: twap.orders_placed,
            orders_failed: twap.orders_failed,
            status: twap.status,
        });
    }

    const new_total = twap.orders_placed + twap.orders_failed;
    if (new_total >= twap.orders_count) {
        const final_status: TwapStatus = twap.orders_placed === 0 ? 'error' : 'completed';
        complete_twap(id, final_status);
    } else {
        schedule_next(id);
    }
}

function schedule_next(id: string): void {
    const twap = active_twaps.get(id);
    if (!twap || twap.status !== 'active') return;

    const timeout_id = setTimeout(() => {
        twap_timeouts.delete(id);
        execute_single_order(id);
    }, twap.interval_ms);

    twap_timeouts.set(id, timeout_id);
}

function complete_twap(id: string, status: TwapStatus): void {
    const twap = active_twaps.get(id);
    if (!twap) return;

    twap.status = status;
    const callback = twap_callbacks.get(id);
    if (callback) {
        callback({
            id,
            orders_placed: twap.orders_placed,
            orders_failed: twap.orders_failed,
            status,
        });
    }

    cleanup_twap(id);
}
