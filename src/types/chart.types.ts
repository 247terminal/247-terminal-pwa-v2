import type { ExchangeId } from './exchange.types';
import type { Timeframe } from './candle.types';

export interface MarketData {
    symbol: string;
    base: string;
    quote: string;
    settle: string;
    active: boolean;
    type: string;
    tick_size: number;
    min_qty: number;
    max_qty: number;
    qty_step: number;
    contract_size: number;
    max_leverage: number | null;
}

export interface TickerInfo {
    last_price: number;
    price_24h: number | null;
    volume_24h: number | null;
}

export interface OHLCV {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type ChartTimeframe =
    | '1'
    | '5'
    | '15'
    | '30'
    | '60'
    | '120'
    | '240'
    | '480'
    | '720'
    | 'D'
    | 'W'
    | 'M';

export interface ChartSettings {
    exchange: ExchangeId;
    symbol: string;
    timeframe: string;
    volume_visible: boolean;
    grid_visible: boolean;
}

export interface TradingChartProps {
    data: OHLCV[];
    data_key?: string;
    loading?: boolean;
    tick_size?: number;
    timeframe?: string;
    volume_visible?: boolean;
    grid_visible?: boolean;
    on_volume_toggle?: () => void;
    on_grid_toggle?: () => void;
}

export interface ToggleButtonProps {
    label: string;
    visible: boolean;
    on_toggle: () => void;
    with_background?: boolean;
}

export interface ChartBlockProps {
    id: string;
    on_remove?: () => void;
}

export interface GridOverlayProps {
    row_height: number;
    width: number;
}

export type FlashDirection = 'up' | 'down' | null;

export interface TickerInfoProps {
    exchange: ExchangeId;
    symbol: string;
}

export interface MarketCapData {
    symbol: string;
    circulatingSupply: number;
}

export type ChartFilterType = 'all' | 'favourites' | ExchangeId;

export type ChartSortField = 'symbol' | 'price' | 'change' | 'volume';

export type ChartSortDirection = 'asc' | 'desc';

export type ChartListItem =
    | { type: 'header'; exchange: ExchangeId; count: number }
    | { type: 'symbol'; exchange: ExchangeId; symbol: string };

export interface SymbolWithExchange {
    exchange: ExchangeId;
    symbol: string;
}

export type ExchangeSymbols = Partial<Record<ExchangeId, string[]>>;

export interface ChartToolbarProps {
    exchange: ExchangeId;
    symbol: string;
    exchange_symbols: ExchangeSymbols;
    timeframe: Timeframe;
    on_symbol_change: (exchange: ExchangeId, symbol: string) => void;
    on_timeframe_change: (tf: Timeframe) => void;
    loading?: boolean;
}

export interface SymbolRowProps {
    exchange: ExchangeId;
    symbol: string;
    is_selected: boolean;
    is_fav: boolean;
    on_select: () => void;
    on_toggle_fav: () => void;
}

export interface TimeframeSelectorProps {
    timeframe: Timeframe;
    on_change: (tf: Timeframe) => void;
}
