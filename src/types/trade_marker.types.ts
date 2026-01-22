export type TradeMarkerType = 'open_long' | 'close_long' | 'open_short' | 'close_short';

export interface TradeMarkerConfig {
    id: string;
    type: TradeMarkerType;
    time: number;
    price: number;
}
