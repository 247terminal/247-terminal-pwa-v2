import type { LineStyle } from 'lightweight-charts';

export type PriceLineType =
    | 'long_entry'
    | 'short_entry'
    | 'liquidation'
    | 'buy_limit'
    | 'sell_limit'
    | 'buy_stop_loss'
    | 'sell_stop_loss'
    | 'buy_take_profit'
    | 'sell_take_profit';

export interface PriceLineConfig {
    id: string;
    type: PriceLineType;
    price: number;
    color: string;
    line_style: LineStyle;
    label: string;
}
