import { useState } from 'preact/hooks';
import { CommandBar } from '../common/command_bar';
import { RigSelector } from '../common/rig_selector';
import { get_exchange_icon } from '../common/exchanges';
import { SettingsButton } from '../common/settings_button';
import { BlocksMenu } from '../common/blocks_menu';
import { ThemeToggle } from '../common/theme_toggle';
import { ConnectionStatus } from '../common/connection_status';
import { LayoutLockToggle } from '../common/layout_lock_toggle';
import { HeaderBalance } from '../common/header_balance';
import { ExchangeButton } from '../common/exchange_button';
import { ExchangePanel } from '../exchange/exchange_panel';
import { SettingsDrawer } from '../settings/settings_drawer';
import { exchange_connection_status } from '@/stores/credentials_store';
import { EXCHANGE_ORDER, type ExchangeId } from '@/types/exchange.types';

function get_sorted_exchanges(connection_status: Record<ExchangeId, boolean>): ExchangeId[] {
    return [...EXCHANGE_ORDER].sort((a, b) => {
        const a_connected = connection_status[a] ? 1 : 0;
        const b_connected = connection_status[b] ? 1 : 0;
        return b_connected - a_connected;
    });
}

export function Header() {
    const [open_exchange, set_open_exchange] = useState<ExchangeId | null>(null);
    const [settings_open, set_settings_open] = useState(false);
    const connection_status = exchange_connection_status.value;
    const sorted_exchanges = get_sorted_exchanges(connection_status);

    function handle_command(command: string): void {
        console.log('Command submitted:', command);
    }

    function handle_exchange_click(exchange_id: ExchangeId): void {
        set_open_exchange((prev) => (prev === exchange_id ? null : exchange_id));
    }

    function handle_panel_close(): void {
        set_open_exchange(null);
    }

    return (
        <header class="h-10 bg-theme-header flex items-center px-3 shrink-0 relative">
            <div class="flex-1 flex items-center gap-1">
                {sorted_exchanges.map((exchange_id) => (
                    <ExchangeButton
                        key={exchange_id}
                        connected={connection_status[exchange_id]}
                        is_selected={open_exchange === exchange_id}
                        on_click={() => handle_exchange_click(exchange_id)}
                    >
                        {get_exchange_icon(exchange_id)}
                    </ExchangeButton>
                ))}
            </div>
            <div class="flex items-center gap-3">
                <ConnectionStatus />
                <CommandBar on_submit={handle_command} />
                <SettingsButton
                    on_click={() => set_settings_open(true)}
                    is_active={settings_open}
                />
            </div>
            <div class="flex-1 flex items-center justify-end gap-2">
                <HeaderBalance />
                <ThemeToggle />
                <LayoutLockToggle />
                <BlocksMenu />
                <RigSelector />
            </div>

            {open_exchange && (
                <ExchangePanel
                    exchange_id={open_exchange}
                    is_open={true}
                    on_close={handle_panel_close}
                />
            )}

            <SettingsDrawer is_open={settings_open} on_close={() => set_settings_open(false)} />
        </header>
    );
}
