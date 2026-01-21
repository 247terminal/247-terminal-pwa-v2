import type { PnlResult } from '../types/account.types';

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
