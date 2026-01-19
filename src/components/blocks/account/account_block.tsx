import { X } from 'lucide-preact';
import { active_tab } from '../../../stores/account_store';
import { AccountToolbar } from './account_toolbar';
import { PositionsTab } from './positions_tab';
import { OrdersTab } from './orders_tab';
import { HistoryTab } from './history_tab';

interface AccountBlockProps {
    on_remove?: () => void;
}

export function AccountBlock({ on_remove }: AccountBlockProps) {
    const current_tab = active_tab.value;

    return (
        <div class="h-full flex flex-col group">
            <div class="drag-handle flex items-center justify-between px-3 py-2 bg-theme-header border-b border-base-300/50 cursor-move">
                <span class="text-xs font-medium text-base-content tracking-wide">ACCOUNT</span>
                {on_remove && (
                    <button
                        type="button"
                        onClick={on_remove}
                        class="text-base-content/40 hover:text-base-content transition-all opacity-0 group-hover:opacity-100"
                    >
                        <X class="w-4 h-4" />
                    </button>
                )}
            </div>
            <AccountToolbar />
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
                {current_tab === 'positions' && <PositionsTab />}
                {current_tab === 'orders' && <OrdersTab />}
                {current_tab === 'history' && <HistoryTab />}
            </div>
        </div>
    );
}
