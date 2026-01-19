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
