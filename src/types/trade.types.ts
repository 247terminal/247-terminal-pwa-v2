import type { ExchangeId } from './exchange.types';

export type OrderType = 'limit' | 'market' | 'scale' | 'twap';
export type OrderSide = 'buy' | 'sell';
export type SizeUnit = 'usd' | 'coin';
export type PriceDistribution = 'linear' | 'start_weighted' | 'end_weighted';
export type SizeDistribution = 'equal' | 'end_bigger' | 'start_bigger';

export interface LimitOrderForm {
    price: string;
    quantity: string;
    size_unit: SizeUnit;
    post_only: boolean;
    reduce_only: boolean;
}

export interface MarketOrderForm {
    quantity: string;
    size_unit: SizeUnit;
    reduce_only: boolean;
}

export interface ScaleOrderForm {
    price_from: string;
    price_to: string;
    orders_count: number;
    price_distribution: PriceDistribution;
    size_distribution: SizeDistribution;
    total_size_usd: string;
}

export interface TwapOrderForm {
    duration_minutes: number;
    orders_count: number;
    total_size_usd: string;
}

export interface TradeFormState {
    exchange: ExchangeId;
    symbol: string;
    order_type: OrderType;
    leverage: number;
    limit: LimitOrderForm;
    market: MarketOrderForm;
    scale: ScaleOrderForm;
    twap: TwapOrderForm;
}

export interface PriceInputProps {
    label: string;
    value: string;
    on_change: (value: string) => void;
    show_last?: boolean;
    on_last_click?: () => void;
    placeholder?: string;
}

export interface QuantityInputProps {
    label?: string;
    value: string;
    on_change: (value: string) => void;
    size_unit: SizeUnit;
    on_unit_change: (unit: SizeUnit) => void;
    coin_symbol?: string;
}

export interface TotalInputProps {
    label?: string;
    value: string;
    on_change: (value: string) => void;
    suffix?: string;
}

export interface SliderInputProps {
    label: string;
    value: number;
    min: number;
    max: number;
    on_change: (value: number) => void;
    format_value?: (value: number) => string;
    show_max?: boolean;
}

export interface ToggleInputProps {
    label: string;
    checked: boolean;
    on_change: (checked: boolean) => void;
}

export interface SegmentOption<T> {
    value: T;
    label: string;
}

export interface SegmentSelectorProps<T extends string> {
    label: string;
    value: T;
    options: SegmentOption<T>[];
    on_change: (value: T) => void;
}

export type TradeFilterType = 'all' | 'favourites' | ExchangeId;

export type TradeListItem =
    | { type: 'header'; exchange: ExchangeId; count: number }
    | { type: 'symbol'; exchange: ExchangeId; symbol: string };

export interface TradeSymbolWithExchange {
    exchange: ExchangeId;
    symbol: string;
}

export type TradeExchangeSymbols = Partial<Record<ExchangeId, string[]>>;

export interface SymbolRowItemProps {
    exchange: ExchangeId;
    symbol: string;
    is_selected: boolean;
    is_fav: boolean;
    on_select: (exchange: ExchangeId, symbol: string) => void;
    on_toggle_fav: (exchange: ExchangeId, symbol: string) => void;
}

export interface SymbolSelectorProps {
    exchange_symbols: TradeExchangeSymbols;
}

export interface TradeToolbarProps {
    exchange_symbols: TradeExchangeSymbols;
}
