import { memo } from 'preact/compat';
import type { Position } from '../../../types/account.types';
import { positions_list, privacy_mode } from '../../../stores/account_store';
import { get_market } from '../../../stores/exchange_store';
import { format_symbol } from '../../chart/symbol_row';
import { get_exchange_icon } from '../../common/exchanges';
import { format_price, format_size } from '../../../utils/format';
import { format_pnl, format_pct, format_usd, mask_value } from '../../../utils/account_format';

interface PositionRowProps {
    position: Position;
    is_private: boolean;
}

const PositionRow = memo(function PositionRow({ position, is_private }: PositionRowProps) {
    const is_long = position.side === 'long';
    const pnl_color = position.unrealized_pnl >= 0 ? 'text-success' : 'text-error';
    const market = get_market(position.exchange, position.symbol);
    const tick_size = market?.tick_size ?? 0.01;
    const qty_step = market?.qty_step ?? 0.001;

    const handle_close = () => {
        console.error('close position not implemented');
    };

    const handle_tpsl = () => {
        console.error('tp/sl not implemented');
    };

    return (
        <div class="relative flex items-center gap-2 px-2 py-1.5 border-b border-base-300/30 hover:bg-base-300/30 transition-colors text-xs">
            <span
                class={`absolute left-0 top-1 bottom-1 w-0.5 rounded-full ${is_long ? 'bg-success' : 'bg-error'}`}
            />
            <div class="w-24 shrink-0 flex items-center gap-1.5">
                <span class="text-base-content/40 shrink-0">
                    {get_exchange_icon(position.exchange)}
                </span>
                <div>
                    <div class="font-medium text-base-content truncate">
                        {format_symbol(position.symbol)}
                    </div>
                    <div class="text-[10px] text-base-content/50">
                        {position.leverage}x {position.side.toUpperCase()}
                    </div>
                </div>
            </div>

            <div class="w-20 shrink-0 text-right">
                <div class="text-base-content">
                    {mask_value(format_usd(position.size * position.last_price), is_private)}
                </div>
                <div class="text-[10px] text-base-content/50">
                    {mask_value(format_size(position.size, qty_step), is_private)}
                </div>
            </div>

            <div class="w-20 shrink-0 text-right">
                <div class="text-base-content/70">
                    {mask_value(format_price(position.entry_price, tick_size), is_private)}
                </div>
                <div class="text-base-content">
                    {mask_value(format_price(position.last_price, tick_size), is_private)}
                </div>
                {position.liquidation_price && (
                    <div class="text-error/70 text-[10px]">
                        {mask_value(
                            format_price(position.liquidation_price, tick_size),
                            is_private
                        )}
                    </div>
                )}
            </div>

            <div class={`w-20 shrink-0 text-right ${pnl_color}`}>
                <div>{mask_value(format_pnl(position.unrealized_pnl), is_private)}</div>
                <div class="text-[10px] opacity-70">
                    {mask_value(format_pct(position.unrealized_pnl_pct), is_private)}
                </div>
            </div>

            <div class="flex-1 flex justify-end gap-1">
                <button
                    type="button"
                    onClick={handle_tpsl}
                    class="px-1.5 py-0.5 text-[10px] rounded bg-base-300 hover:bg-base-content/20 text-base-content/70 hover:text-base-content transition-colors"
                >
                    TP/SL
                </button>
                <button
                    type="button"
                    onClick={handle_close}
                    class="px-1.5 py-0.5 text-[10px] rounded bg-error/20 hover:bg-error/40 text-error transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
});

export function PositionsTab() {
    const positions = positions_list.value;
    const is_private = privacy_mode.value;

    if (positions.length === 0) {
        return (
            <div class="flex-1 flex items-center justify-center">
                <div class="text-xs text-base-content/50 text-center py-8">No open positions</div>
            </div>
        );
    }

    return (
        <div class="flex-1 overflow-auto">
            <div class="flex items-center gap-2 px-2 py-1 text-[10px] text-base-content/50 border-b border-base-300/50 sticky top-0 bg-base-200">
                <div class="w-24 shrink-0">Symbol</div>
                <div class="w-20 shrink-0 text-right">Size</div>
                <div class="w-20 shrink-0 text-right">Entry/Last</div>
                <div class="w-20 shrink-0 text-right">uPNL</div>
                <div class="flex-1 text-right">Actions</div>
            </div>
            {positions.map((pos) => (
                <PositionRow key={pos.id} position={pos} is_private={is_private} />
            ))}
        </div>
    );
}
