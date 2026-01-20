export interface RawPosition {
    symbol: string;
    contracts: number;
    side: string;
    entry_price: string | number;
    mark_price: string | number;
    liquidation_price: string | number | null;
    unrealized_pnl: string | number;
    leverage: string | number;
    margin_mode: 'cross' | 'isolated';
    initial_margin: string | number;
}

export interface RawOrder {
    symbol: string;
    id: string;
    side: 'buy' | 'sell';
    type: string;
    amount: number;
    price: number;
    filled: number;
    timestamp: number;
}
