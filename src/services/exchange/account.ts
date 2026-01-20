import * as ccxt from 'ccxt';
import { PROXY_CONFIG } from '@/config';
import type { ExchangeId } from '@/types/exchange.types';
import type { PositionMode, MarginMode, Balance } from '@/types/trading.types';
import type { Position, Order } from '@/types/account.types';
import type { ExchangeValidationCredentials } from './validators/types';
import { get_market } from '@/stores/exchange_store';

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
                options: {
                    warnOnFetchOpenOrdersWithoutSymbol: false,
                },
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

async function fetch_position_mode_binance(exchange: ccxt.Exchange): Promise<PositionMode> {
    try {
        const response = await (exchange as ccxt.binanceusdm).fapiPrivateGetPositionSideDual();
        return response?.dualSidePosition ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

async function fetch_position_mode_bybit(exchange: ccxt.Exchange): Promise<PositionMode> {
    try {
        const positions = await exchange.fetchPositions();
        const has_hedge = positions.some(
            (p: ccxt.Position) => p.info?.positionIdx === 1 || p.info?.positionIdx === 2
        );
        return has_hedge ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

async function fetch_position_mode_blofin(exchange: ccxt.Exchange): Promise<PositionMode> {
    try {
        const positions = await exchange.fetchPositions();
        const has_hedge = positions.some(
            (p: ccxt.Position) =>
                p.info?.positionSide === 'long' || p.info?.positionSide === 'short'
        );
        return has_hedge ? 'hedge' : 'one_way';
    } catch {
        return 'one_way';
    }
}

export async function fetch_account_config(exchange_id: ExchangeId): Promise<AccountConfig> {
    const exchange = get_exchange(exchange_id);

    let position_mode: PositionMode = 'one_way';

    switch (exchange_id) {
        case 'binance':
            position_mode = await fetch_position_mode_binance(exchange);
            break;
        case 'bybit':
            position_mode = await fetch_position_mode_bybit(exchange);
            break;
        case 'blofin':
            position_mode = await fetch_position_mode_blofin(exchange);
            break;
    }

    return {
        position_mode,
        default_margin_mode: 'cross',
    };
}

function map_balance(raw: ccxt.Balances, exchange_id: ExchangeId): Balance | null {
    const currency = exchange_id === 'hyperliquid' ? 'USDC' : 'USDT';

    let total = 0;
    let available = 0;
    let used = 0;

    if (exchange_id === 'binance') {
        const info = raw.info as Record<string, unknown>;
        total = parseFloat(String(info?.totalMarginBalance ?? 0));
        available = parseFloat(String(info?.availableBalance ?? 0));
        used = total - available;
    } else {
        const account = raw[currency];
        if (account) {
            total = Number(account.total ?? 0);
            available = Number(account.free ?? 0);
            used = Number(account.used ?? 0);
        }
    }

    return {
        total,
        available,
        used,
        currency,
        last_updated: Date.now(),
    };
}

function get_contract_size(exchange_id: ExchangeId, symbol: string): number {
    if (exchange_id !== 'blofin') return 1;
    const market = get_market(exchange_id, symbol);
    return market?.contract_size ?? 1;
}

function map_position(raw: ccxt.Position, exchange_id: ExchangeId): Position {
    const side: 'long' | 'short' = raw.side === 'short' ? 'short' : 'long';
    const margin_mode: MarginMode = raw.marginMode === 'isolated' ? 'isolated' : 'cross';
    const contract_size = get_contract_size(exchange_id, raw.symbol);
    const contracts = Math.abs(Number(raw.contracts ?? 0));

    return {
        id: raw.id || `${exchange_id}-${raw.symbol}-${side}`,
        exchange: exchange_id,
        symbol: raw.symbol,
        side,
        size: contracts * contract_size,
        entry_price: Number(raw.entryPrice ?? 0),
        last_price: Number(raw.markPrice ?? raw.entryPrice ?? 0),
        liquidation_price: raw.liquidationPrice ? Number(raw.liquidationPrice) : null,
        unrealized_pnl: Number(raw.unrealizedPnl ?? 0),
        unrealized_pnl_pct: Number(raw.percentage ?? 0),
        margin: Number(raw.initialMargin ?? raw.collateral ?? 0),
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

const ORDER_STATUS_MAP: Record<string, Order['status']> = {
    open: 'open',
    closed: 'closed',
    canceled: 'canceled',
    expired: 'canceled',
    rejected: 'canceled',
};

function map_order(raw: ccxt.Order, exchange_id: ExchangeId): Order {
    const contract_size = get_contract_size(exchange_id, raw.symbol);
    const raw_size = Number(raw.amount ?? 0);
    const raw_filled = Number(raw.filled ?? 0);
    const size = raw_size * contract_size;
    const filled = raw_filled * contract_size;
    const base_status = ORDER_STATUS_MAP[raw.status ?? 'open'] ?? 'open';
    const status: Order['status'] =
        base_status === 'open' && raw_filled > 0 && raw_filled < raw_size ? 'partial' : base_status;

    return {
        id: raw.id,
        exchange: exchange_id,
        symbol: raw.symbol,
        side: raw.side === 'buy' ? 'buy' : 'sell',
        type: ORDER_TYPE_MAP[raw.type ?? 'limit'] ?? 'limit',
        size,
        price: Number(raw.price ?? 0),
        filled,
        status,
        created_at: raw.timestamp ?? Date.now(),
    };
}

export async function fetch_balance(exchange_id: ExchangeId): Promise<Balance | null> {
    const exchange = get_exchange(exchange_id);

    try {
        const raw = await exchange.fetchBalance();
        return map_balance(raw, exchange_id);
    } catch (err) {
        console.error(`failed to fetch ${exchange_id} balance:`, err);
        return null;
    }
}

export async function fetch_positions(exchange_id: ExchangeId): Promise<Position[]> {
    const exchange = get_exchange(exchange_id);

    try {
        const raw = await exchange.fetchPositions();
        return raw
            .filter((p: ccxt.Position) => Math.abs(Number(p.contracts ?? 0)) > 0)
            .map((p: ccxt.Position) => map_position(p, exchange_id));
    } catch (err) {
        console.error(`failed to fetch ${exchange_id} positions:`, err);
        return [];
    }
}

export async function fetch_orders(exchange_id: ExchangeId): Promise<Order[]> {
    const exchange = get_exchange(exchange_id);

    try {
        if (exchange_id === 'binance') {
            const [regular, conditional] = await Promise.all([
                exchange.fetchOpenOrders(),
                exchange.fetchOpenOrders(undefined, undefined, undefined, { stop: true }),
            ]);
            const unique = new Map<string, ccxt.Order>();
            for (const o of [...regular, ...conditional]) {
                unique.set(o.id, o);
            }
            return Array.from(unique.values()).map((o) => map_order(o, exchange_id));
        }

        const orders = await exchange.fetchOpenOrders();
        return orders.map((o: ccxt.Order) => map_order(o, exchange_id));
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
