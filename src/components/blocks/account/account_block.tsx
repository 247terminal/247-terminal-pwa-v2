import { active_tab } from '../../../stores/account_store';
import { AccountToolbar } from './account_toolbar';
import { PositionsTab } from './positions_tab';
import { OrdersTab } from './orders_tab';
import { HistoryTab } from './history_tab';

export function AccountBlock() {
    const current_tab = active_tab.value;

    return (
        <div class="h-full flex flex-col bg-theme-header">
            <AccountToolbar />
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
                {current_tab === 'positions' && <PositionsTab />}
                {current_tab === 'orders' && <OrdersTab />}
                {current_tab === 'history' && <HistoryTab />}
            </div>
        </div>
    );
}
