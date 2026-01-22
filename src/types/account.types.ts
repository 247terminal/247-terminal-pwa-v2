import type { ExchangeId } from './exchange.types';

export interface Position {
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

export interface Order {
    id: string;
    exchange: ExchangeId;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market' | 'stop' | 'take_profit' | 'stop_loss';
    size: number;
    price: number;
    filled: number;
    status: 'open' | 'partial' | 'closed' | 'canceled';
    created_at: number;
}

export interface TradeHistory {
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

export type AccountTab = 'positions' | 'orders' | 'history';

export type SortDirection = 'asc' | 'desc';

export type HistorySortKey = 'symbol' | 'time' | 'size' | 'entry' | 'pnl';

export type PositionSortKey = 'symbol' | 'size' | 'entry' | 'liq' | 'pnl';

export type OrderSortKey = 'symbol' | 'size' | 'price' | 'id';

export interface SortHeaderProps<T extends string> {
    label: string;
    sort_key: T;
    current_key: T;
    direction: SortDirection;
    on_sort: (key: T) => void;
    align?: 'left' | 'right';
    flex?: boolean;
}

export interface HistoryRowProps {
    trade: TradeHistory;
    is_private: boolean;
    fetched_leverage: number | null;
}

export interface PositionRowProps {
    position: Position;
    is_private: boolean;
}

export interface OrderRowProps {
    order: Order;
    is_private: boolean;
}

export interface TabButtonProps {
    tab: AccountTab;
    label: string;
    count?: number;
}

export interface PnlResult {
    pnl: number;
    pnl_pct: number;
}
