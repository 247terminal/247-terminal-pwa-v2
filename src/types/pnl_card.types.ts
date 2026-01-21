import type { Position } from './account.types';
import type { ExchangeId } from './exchange.types';

export interface PnlCardPosition {
    type: 'position';
    position: Position;
    exchange_id: ExchangeId;
}

export interface PnlCardHistory {
    type: 'history';
    exchange_id: ExchangeId;
    symbol: string;
    side: 'long' | 'short';
    leverage: number;
    roi_percent: number;
    pnl_amount: number;
    entry_price: string;
    close_price: string;
}

export type PnlCardData = PnlCardPosition | PnlCardHistory;

export interface PnlCardRenderData {
    symbol: string;
    side: 'long' | 'short';
    leverage: number;
    roi_percent: number;
    pnl_amount: number;
    entry_price: string;
    current_price: string;
    is_realized: boolean;
}
