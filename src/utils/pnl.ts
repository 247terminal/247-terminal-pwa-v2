import type { PnlResult } from '../types/account.types';

export function calculate_roi_pct(
    entry_price: number,
    exit_price: number,
    leverage: number,
    is_long: boolean
): number {
    if (entry_price <= 0) return 0;
    const price_change_pct = ((exit_price - entry_price) / entry_price) * 100;
    const roi = price_change_pct * leverage;
    return is_long ? roi : -roi;
}

export function calculate_position_pnl(
    is_long: boolean,
    entry_price: number,
    current_price: number,
    size: number,
    margin: number,
    leverage: number
): PnlResult {
    const pnl = is_long
        ? (current_price - entry_price) * size
        : (entry_price - current_price) * size;

    const notional = size * entry_price;
    const effective_leverage = leverage > 0 ? leverage : 1;
    const effective_margin = margin > 0 ? margin : notional / effective_leverage;
    const pnl_pct = effective_margin > 0 ? (pnl / effective_margin) * 100 : 0;

    return { pnl, pnl_pct };
}
