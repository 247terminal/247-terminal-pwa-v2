import { memo } from 'preact/compat';
import type { TradeHistory } from '../../../types/account.types';
import { history, privacy_mode } from '../../../stores/account_store';
import { format_symbol } from '../../chart/symbol_row';
import {
    format_display_price,
    format_pnl,
    format_pct,
    format_relative_time,
    format_full_time,
    mask_value,
} from '../../../utils/account_format';

interface HistoryRowProps {
    trade: TradeHistory;
    is_private: boolean;
}

const HistoryRow = memo(function HistoryRow({ trade, is_private }: HistoryRowProps) {
    const is_buy = trade.side === 'buy';
    const pnl_color = trade.realized_pnl >= 0 ? 'text-success' : 'text-error';

    return (
        <div class="flex items-center gap-2 px-2 py-1.5 border-b border-base-300/30 hover:bg-base-300/30 transition-colors text-xs">
            <div class="w-20 shrink-0">
                <div class="flex items-center gap-1.5">
                    <span
                        class={`w-1.5 h-1.5 rounded-full ${is_buy ? 'bg-success' : 'bg-error'}`}
                    />
                    <span class="font-medium text-base-content">{format_symbol(trade.symbol)}</span>
                </div>
            </div>

            <div
                class="w-14 shrink-0 text-right text-base-content/50"
                title={format_full_time(trade.closed_at)}
            >
                {format_relative_time(trade.closed_at)}
            </div>

            <div class="w-14 shrink-0 text-right">
                <div class="text-base-content">{mask_value(trade.size.toString(), is_private)}</div>
            </div>

            <div class="w-20 shrink-0 text-right">
                <div class="text-base-content/70">
                    {mask_value(format_display_price(trade.entry_price), is_private)}
                </div>
                <div class="text-base-content">
                    {mask_value(format_display_price(trade.close_price), is_private)}
                </div>
            </div>

            <div class={`flex-1 text-right ${pnl_color}`}>
                <div>{mask_value(format_pnl(trade.realized_pnl), is_private)}</div>
                <div class="text-[10px] opacity-70">
                    {mask_value(format_pct(trade.realized_pnl_pct), is_private)}
                </div>
            </div>
        </div>
    );
});

export function HistoryTab() {
    const trades = history.value;
    const is_private = privacy_mode.value;

    if (trades.length === 0) {
        return (
            <div class="flex-1 flex items-center justify-center">
                <div class="text-xs text-base-content/50 text-center py-8">No trade history</div>
            </div>
        );
    }

    return (
        <div class="flex-1 overflow-auto">
            <div class="flex items-center gap-2 px-2 py-1 text-[10px] text-base-content/50 border-b border-base-300/50 sticky top-0 bg-base-200">
                <div class="w-20 shrink-0">Symbol</div>
                <div class="w-14 shrink-0 text-right">Time</div>
                <div class="w-14 shrink-0 text-right">Size</div>
                <div class="w-20 shrink-0 text-right">Entry/Close</div>
                <div class="flex-1 text-right">PNL</div>
            </div>
            {trades.map((trade) => (
                <HistoryRow key={trade.id} trade={trade} is_private={is_private} />
            ))}
        </div>
    );
}
