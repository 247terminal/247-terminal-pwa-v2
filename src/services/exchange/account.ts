import * as ccxt from 'ccxt';
import { PROXY_CONFIG } from '@/config';
import type { ExchangeId } from '@/types/exchange.types';
import type { PositionMode, MarginMode, Balance } from '@/types/trading.types';
import type { Position, Order } from '@/types/account.types';
import type { ExchangeValidationCredentials } from './validators/types';
import { get_market } from '@/stores/exchange_store';
import { binance, bybit, blofin, hyperliquid, type RawPosition, type RawOrder } from './adapters';

interface AccountConfig {
    position_mode: PositionMode;
    default_margin_mode: MarginMode;
}

interface AccountData {
    balance: Balance | null;
    positions: Position[];
    orders: Order[];
}

const exchange_instances = new Map<ExchangeId, ccxt.Exchange>();

function get_proxy_options(exchange_id: ExchangeId): {
    proxy?: string;
    headers?: Record<string, string>;
} {
    const proxy = PROXY_CONFIG[exchange_id];
    if (!proxy) return {};
    return {
        proxy: proxy.url,
        headers: { 'x-proxy-auth': proxy.auth },
    };
}

function create_exchange_instance(
    exchange_id: ExchangeId,
    credentials: ExchangeValidationCredentials
): ccxt.Exchange {
    const proxy_options = get_proxy_options(exchange_id);

    switch (exchange_id) {
        case 'binance':
            return new ccxt.binanceusdm({
                ...proxy_options,
                apiKey: credentials.api_key,
                secret: credentials.api_secret,
                options: { warnOnFetchOpenOrdersWithoutSymbol: false },
            });
        case 'bybit':
            return new ccxt.bybit({
                apiKey: credentials.api_key,
                secret: credentials.api_secret,
            });
        case 'blofin':
            return new ccxt.blofin({
                ...proxy_options,
                apiKey: credentials.api_key,
                secret: credentials.api_secret,
                password: credentials.passphrase,
            });
        case 'hyperliquid':
            return new ccxt.hyperliquid({
                walletAddress: credentials.wallet_address,
                privateKey: credentials.private_key,
            });
        default:
            throw new Error(`unsupported exchange: ${exchange_id}`);
    }
}

export function init_exchange(
    exchange_id: ExchangeId,
    credentials: ExchangeValidationCredentials
): void {
    if (exchange_instances.has(exchange_id)) {
        destroy_exchange(exchange_id);
    }
    const instance = create_exchange_instance(exchange_id, credentials);
    instance.markets = {};
    instance.markets_by_id = {};
    exchange_instances.set(exchange_id, instance);
}

export function destroy_exchange(exchange_id: ExchangeId): void {
    exchange_instances.delete(exchange_id);
}

export function destroy_all_exchanges(): void {
    exchange_instances.clear();
}

export function has_exchange(exchange_id: ExchangeId): boolean {
    return exchange_instances.has(exchange_id);
}

function get_exchange(exchange_id: ExchangeId): ccxt.Exchange {
    const instance = exchange_instances.get(exchange_id);
    if (!instance) {
        throw new Error(`exchange ${exchange_id} not initialized. call init_exchange first`);
    }
    return instance;
}

export async function fetch_account_config(exchange_id: ExchangeId): Promise<AccountConfig> {
    const exchange = get_exchange(exchange_id);
    let position_mode: PositionMode = 'one_way';

    switch (exchange_id) {
        case 'binance':
            position_mode = await binance.fetch_position_mode(exchange);
            break;
        case 'bybit':
            position_mode = await bybit.fetch_position_mode(exchange);
            break;
        case 'blofin':
            position_mode = await blofin.fetch_position_mode(exchange);
            break;
    }

    return { position_mode, default_margin_mode: 'cross' };
}

function get_contract_size(exchange_id: ExchangeId, symbol: string): number {
    if (exchange_id !== 'blofin') return 1;
    const market = get_market(exchange_id, symbol);
    return market?.contract_size ?? 1;
}

function map_position(raw: RawPosition, exchange_id: ExchangeId): Position {
    const side: 'long' | 'short' = raw.side === 'short' ? 'short' : 'long';
    const margin_mode: MarginMode = raw.margin_mode;
    const contract_size = get_contract_size(exchange_id, raw.symbol);
    const margin = Number(raw.initial_margin ?? 0);
    const unrealized_pnl = Number(raw.unrealized_pnl ?? 0);
    const unrealized_pnl_pct = margin > 0 ? (unrealized_pnl / margin) * 100 : 0;

    return {
        id: `${exchange_id}-${raw.symbol}-${side}`,
        exchange: exchange_id,
        symbol: raw.symbol,
        side,
        size: raw.contracts * contract_size,
        entry_price: Number(raw.entry_price ?? 0),
        last_price: Number(raw.mark_price ?? raw.entry_price ?? 0),
        liquidation_price: raw.liquidation_price ? Number(raw.liquidation_price) : null,
        unrealized_pnl,
        unrealized_pnl_pct,
        margin,
        leverage: Number(raw.leverage ?? 1),
        margin_mode,
        updated_at: Date.now(),
    };
}

const ORDER_TYPE_MAP: Record<string, Order['type']> = {
    limit: 'limit',
    market: 'market',
    stop: 'stop',
    stop_market: 'stop',
    take_profit: 'take_profit',
    take_profit_market: 'take_profit',
    stop_loss: 'stop_loss',
    trailing_stop: 'stop',
};

function map_order(raw: RawOrder, exchange_id: ExchangeId): Order {
    const contract_size = get_contract_size(exchange_id, raw.symbol);
    const size = raw.amount * contract_size;
    const filled = raw.filled * contract_size;
    const status: Order['status'] = raw.filled > 0 && raw.filled < raw.amount ? 'partial' : 'open';

    return {
        id: raw.id,
        exchange: exchange_id,
        symbol: raw.symbol,
        side: raw.side,
        type: ORDER_TYPE_MAP[raw.type] ?? 'limit',
        size,
        price: raw.price,
        filled,
        status,
        created_at: raw.timestamp,
    };
}

export async function fetch_balance(exchange_id: ExchangeId): Promise<Balance | null> {
    const exchange = get_exchange(exchange_id);

    try {
        switch (exchange_id) {
            case 'binance':
                return await binance.fetch_balance(exchange);
            case 'bybit':
                return await bybit.fetch_balance(exchange);
            case 'blofin':
                return await blofin.fetch_balance(exchange);
            case 'hyperliquid':
                return await hyperliquid.fetch_balance(exchange);
            default:
                return null;
        }
    } catch (err) {
        console.error(`failed to fetch ${exchange_id} balance:`, err);
        return null;
    }
}

export async function fetch_positions(exchange_id: ExchangeId): Promise<Position[]> {
    const exchange = get_exchange(exchange_id);

    try {
        let raw: RawPosition[] = [];

        switch (exchange_id) {
            case 'binance':
                raw = await binance.fetch_positions(exchange);
                break;
            case 'bybit':
                raw = await bybit.fetch_positions(exchange);
                break;
            case 'blofin':
                raw = await blofin.fetch_positions(exchange);
                break;
            case 'hyperliquid':
                raw = await hyperliquid.fetch_positions(exchange);
                break;
        }

        const result: Position[] = [];
        for (const p of raw) {
            if (Math.abs(p.contracts) > 0) {
                result.push(map_position(p, exchange_id));
            }
        }
        return result;
    } catch (err) {
        console.error(`failed to fetch ${exchange_id} positions:`, err);
        return [];
    }
}

export async function fetch_orders(exchange_id: ExchangeId): Promise<Order[]> {
    const exchange = get_exchange(exchange_id);

    try {
        let raw: RawOrder[] = [];

        switch (exchange_id) {
            case 'binance':
                raw = await binance.fetch_orders(exchange);
                break;
            case 'bybit':
                raw = await bybit.fetch_orders(exchange);
                break;
            case 'blofin':
                raw = await blofin.fetch_orders(exchange);
                break;
            case 'hyperliquid':
                raw = await hyperliquid.fetch_orders(exchange);
                break;
        }

        return raw.map((o) => map_order(o, exchange_id));
    } catch (err) {
        console.error(`failed to fetch ${exchange_id} orders:`, err);
        return [];
    }
}

export async function fetch_account_data(exchange_id: ExchangeId): Promise<AccountData> {
    const [balance, positions, orders] = await Promise.all([
        fetch_balance(exchange_id),
        fetch_positions(exchange_id),
        fetch_orders(exchange_id),
    ]);

    return { balance, positions, orders };
}
