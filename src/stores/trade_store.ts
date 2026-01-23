import { signal, computed } from '@preact/signals';
import { toast } from 'sonner';
import { EXCHANGE_ORDER, type ExchangeId } from '../types/exchange.types';
import type {
    TradeFormState,
    OrderType,
    LimitOrderForm,
    MarketOrderForm,
    ScaleOrderForm,
    TwapOrderForm,
} from '../types/trade.types';
import {
    get_market,
    get_ticker,
    get_symbol_leverage,
    set_symbol_leverages,
} from './exchange_store';
import { exchange_connection_status } from './credentials_store';
import {
    fetch_leverage_settings,
    has_exchange,
    set_leverage as set_exchange_leverage,
} from '../services/exchange/account_bridge';

function get_default_exchange(): ExchangeId {
    const status = exchange_connection_status.value;
    const sorted = [...EXCHANGE_ORDER].sort((a, b) => {
        const a_connected = status[a] ? 1 : 0;
        const b_connected = status[b] ? 1 : 0;
        return b_connected - a_connected;
    });
    return sorted[0];
}

function create_initial_state(): TradeFormState {
    return {
        exchange: EXCHANGE_ORDER[0],
        symbol: 'BTC/USDT:USDT',
        order_type: 'market',
        leverage: 10,
        limit: {
            price: '',
            quantity: '',
            size_unit: 'usd',
            tp_sl_enabled: false,
            tp_price: '',
            sl_price: '',
            post_only: false,
            reduce_only: false,
        },
        market: {
            quantity: '',
            size_unit: 'usd',
            post_only: false,
            reduce_only: false,
        },
        scale: {
            price_from: '',
            price_to: '',
            orders_count: 25,
            price_distribution: 'linear',
            size_distribution: 'equal',
            total_size_usd: '',
            post_only: false,
            reduce_only: false,
        },
        twap: {
            duration_minutes: 60,
            orders_count: 50,
            total_size_usd: '',
            post_only: false,
            reduce_only: false,
        },
    };
}

export const trade_state = signal<TradeFormState>(create_initial_state());

export const selected_exchange = computed(() => trade_state.value.exchange);
export const selected_symbol = computed(() => trade_state.value.symbol);
export const selected_order_type = computed(() => trade_state.value.order_type);
export const selected_leverage = computed(() => trade_state.value.leverage);

export const current_market = computed(() => {
    const { exchange, symbol } = trade_state.value;
    return get_market(exchange, symbol);
});

export const max_leverage = computed(() => {
    const market = current_market.value;
    return market?.max_leverage ?? 100;
});

function apply_symbol_leverage(exchange: ExchangeId, symbol: string): void {
    const cached = get_symbol_leverage(exchange, symbol);
    if (cached !== null) {
        const max = get_market(exchange, symbol)?.max_leverage ?? 100;
        const clamped = Math.min(cached, max);
        trade_state.value = { ...trade_state.value, leverage: clamped };
        return;
    }

    if (!has_exchange(exchange)) return;

    fetch_leverage_settings(exchange, [symbol])
        .then((result) => {
            const lev = result[symbol];
            if (lev === undefined) return;
            set_symbol_leverages(exchange, result);
            const max = get_market(exchange, symbol)?.max_leverage ?? 100;
            const clamped = Math.min(lev, max);
            if (trade_state.value.exchange === exchange && trade_state.value.symbol === symbol) {
                trade_state.value = { ...trade_state.value, leverage: clamped };
            }
        })
        .catch(() => {});
}

export function set_exchange(exchange: ExchangeId): void {
    trade_state.value = { ...trade_state.value, exchange };
    apply_symbol_leverage(exchange, trade_state.value.symbol);
}

export function set_symbol(symbol: string): void {
    trade_state.value = { ...trade_state.value, symbol };
    apply_symbol_leverage(trade_state.value.exchange, symbol);
}

export function set_exchange_symbol(exchange: ExchangeId, symbol: string): void {
    trade_state.value = { ...trade_state.value, exchange, symbol };
    apply_symbol_leverage(exchange, symbol);
}

export function set_order_type(order_type: OrderType): void {
    trade_state.value = { ...trade_state.value, order_type };
}

export function set_leverage(leverage: number): void {
    const { exchange, symbol } = trade_state.value;
    const max = max_leverage.value;
    const clamped = Math.min(Math.max(1, leverage), max);
    trade_state.value = { ...trade_state.value, leverage: clamped };

    if (!has_exchange(exchange)) return;

    const base = symbol.split('/')[0];
    set_exchange_leverage(exchange, symbol, clamped)
        .then(() => {
            set_symbol_leverages(exchange, { [symbol]: clamped });
            toast.success(`${base} leverage set to ${clamped}x`);
        })
        .catch((err) => {
            console.error('failed to set leverage:', (err as Error).message);
            toast.error(`Failed to set ${base} leverage`);
        });
}

export function update_limit_form(updates: Partial<LimitOrderForm>): void {
    trade_state.value = {
        ...trade_state.value,
        limit: { ...trade_state.value.limit, ...updates },
    };
}

export function update_market_form(updates: Partial<MarketOrderForm>): void {
    trade_state.value = {
        ...trade_state.value,
        market: { ...trade_state.value.market, ...updates },
    };
}

export function update_scale_form(updates: Partial<ScaleOrderForm>): void {
    trade_state.value = {
        ...trade_state.value,
        scale: { ...trade_state.value.scale, ...updates },
    };
}

export function update_twap_form(updates: Partial<TwapOrderForm>): void {
    trade_state.value = {
        ...trade_state.value,
        twap: { ...trade_state.value.twap, ...updates },
    };
}

export function calculate_twap_max_orders(duration_minutes: number): number {
    if (duration_minutes <= 5) return Math.max(10, duration_minutes * 10);
    if (duration_minutes <= 30) return Math.min(200, 50 + (duration_minutes - 5) * 6);
    if (duration_minutes <= 60)
        return Math.min(300, 200 + Math.floor((duration_minutes - 30) * 3.3));
    if (duration_minutes <= 240)
        return Math.min(500, 300 + Math.floor((duration_minutes - 60) * 1.1));
    return Math.min(1000, 500 + Math.floor((duration_minutes - 240) * 0.4));
}

export function fill_last_price(
    field: 'price' | 'tp_price' | 'sl_price' | 'price_from' | 'price_to'
): void {
    const { exchange, symbol, order_type } = trade_state.value;
    const ticker = get_ticker(exchange, symbol);
    if (!ticker) return;

    const price = ticker.last_price.toString();

    if (order_type === 'limit') {
        update_limit_form({ [field]: price });
    } else if (order_type === 'scale' && (field === 'price_from' || field === 'price_to')) {
        update_scale_form({ [field]: price });
    }
}

export function init_default_exchange(): void {
    const default_exchange = get_default_exchange();
    if (trade_state.value.exchange !== default_exchange) {
        set_exchange(default_exchange);
    } else {
        apply_symbol_leverage(default_exchange, trade_state.value.symbol);
    }
}
