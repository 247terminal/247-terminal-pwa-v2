import type { ExchangeId } from '@/types/worker.types';
import type { RawPosition, RawOrder, RawClosedPosition } from './adapters';
import type { MarketInfo } from './account_worker';
import { calculate_roi_pct } from '@/utils/pnl';

const ORDER_TYPE_MAP = {
    limit: 'limit',
    market: 'market',
    stop: 'stop',
    stop_market: 'stop',
    take_profit: 'take_profit',
    take_profit_market: 'take_profit',
    stop_loss: 'stop_loss',
    trailing_stop: 'stop',
} as const;

export interface MappedPosition {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    contracts?: number;
    entry_price: number;
    last_price: number;
    liquidation_price: number | null;
    unrealized_pnl: number;
    unrealized_pnl_pct: number;
    margin: number;
    leverage: number;
    margin_mode: 'cross' | 'isolated';
    updated_at: number;
}

export interface MappedOrder {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    type: string;
    size: number;
    price: number;
    filled: number;
    status: 'open' | 'partial';
    created_at: number;
}

export interface MappedClosedPosition {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    entry_price: number;
    close_price: number;
    realized_pnl: number;
    realized_pnl_pct: number;
    leverage: number;
    closed_at: number;
}

export function mapPosition(
    raw: RawPosition,
    exchangeId: ExchangeId,
    marketMap: Record<string, MarketInfo>
): MappedPosition {
    const side: 'long' | 'short' = raw.side === 'short' ? 'short' : 'long';
    const margin_mode = raw.margin_mode;
    const market = marketMap[raw.symbol];
    const entry_price = Number(raw.entry_price ?? 0);
    const margin = Number(raw.initial_margin ?? 0);
    const leverage = Number(raw.leverage ?? 1);
    const unrealized_pnl = Number(raw.unrealized_pnl ?? 0);
    const unrealized_pnl_pct = margin > 0 ? (unrealized_pnl / margin) * 100 : 0;

    let size = raw.contracts;
    let contracts: number | undefined;

    if (exchangeId === 'blofin') {
        contracts = raw.contracts;
        const contract_size = market?.contract_size;
        if (contract_size && contract_size > 0) {
            size = raw.contracts * contract_size;
        }
    }

    return {
        id: `${exchangeId}-${raw.symbol}-${side}`,
        exchange: exchangeId,
        symbol: raw.symbol,
        side,
        size,
        contracts,
        entry_price,
        last_price: Number(raw.mark_price ?? raw.entry_price ?? 0),
        liquidation_price: raw.liquidation_price ? Number(raw.liquidation_price) : null,
        unrealized_pnl,
        unrealized_pnl_pct,
        margin,
        leverage,
        margin_mode,
        updated_at: Date.now(),
    };
}

export function mapOrder(
    raw: RawOrder,
    exchangeId: ExchangeId,
    marketMap: Record<string, MarketInfo>
): MappedOrder {
    const market = marketMap[raw.symbol];
    const contract_size =
        exchangeId === 'blofin' && market?.contract_size && market.contract_size > 0
            ? market.contract_size
            : 1;
    const size = raw.amount * contract_size;
    const filled = raw.filled * contract_size;
    const status: 'open' | 'partial' =
        raw.filled > 0 && raw.filled < raw.amount ? 'partial' : 'open';

    return {
        id: raw.id,
        exchange: exchangeId,
        symbol: raw.symbol,
        side: raw.side,
        type: ORDER_TYPE_MAP[raw.type as keyof typeof ORDER_TYPE_MAP] ?? 'limit',
        size,
        price: raw.price,
        filled,
        status,
        created_at: raw.timestamp,
    };
}

export function mapClosedPosition(
    raw: RawClosedPosition,
    exchangeId: ExchangeId,
    idx: number
): MappedClosedPosition {
    const is_long = raw.side === 'long';

    return {
        id: `${exchangeId}-${raw.symbol}-${raw.close_time}-${idx}`,
        exchange: exchangeId,
        symbol: raw.symbol,
        side: is_long ? 'buy' : 'sell',
        size: raw.size,
        entry_price: raw.entry_price,
        close_price: raw.exit_price,
        realized_pnl: raw.realized_pnl,
        realized_pnl_pct: calculate_roi_pct(raw.entry_price, raw.exit_price, raw.leverage, is_long),
        leverage: raw.leverage,
        closed_at: raw.close_time,
    };
}
