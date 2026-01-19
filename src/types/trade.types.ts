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
    tp_sl_enabled: boolean;
    tp_price: string;
    sl_price: string;
    post_only: boolean;
    reduce_only: boolean;
}

export interface MarketOrderForm {
    quantity: string;
    size_unit: SizeUnit;
    post_only: boolean;
    reduce_only: boolean;
}

export interface ScaleOrderForm {
    price_from: string;
    price_to: string;
    orders_count: number;
    price_distribution: PriceDistribution;
    size_distribution: SizeDistribution;
    total_size_usd: string;
    post_only: boolean;
    reduce_only: boolean;
}

export interface TwapOrderForm {
    duration_minutes: number;
    orders_count: number;
    total_size_usd: string;
    post_only: boolean;
    reduce_only: boolean;
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
