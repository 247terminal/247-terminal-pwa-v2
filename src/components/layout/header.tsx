import { useState } from 'preact/hooks';
import { CommandBar } from '../common/command_bar';
import { RigSelector } from '../common/rig_selector';
import { Exchanges, get_exchange_icon } from '../common/exchanges';
import { SettingsButton } from '../common/settings_button';
import { BlocksMenu } from '../common/blocks_menu';

export function Header() {
    const handle_command = (command: string) => {
        console.log('Command submitted:', command);
    };

    const [exchanges, set_exchanges] = useState([
        { id: 'blofin', name: 'Blofin', connected: false, icon: get_exchange_icon('blofin') },
        { id: 'binance', name: 'Binance', connected: false, icon: get_exchange_icon('binance') },
        { id: 'hyperliquid', name: 'Hyperliquid', connected: false, icon: get_exchange_icon('hyperliquid') },
        { id: 'bybit', name: 'Bybit', connected: false, icon: get_exchange_icon('bybit') },
    ]);

    const handle_exchange_click = (exchange_id: string) => {
        set_exchanges(prev => prev.map(exchange =>
            exchange.id === exchange_id
                ? { ...exchange, connected: !exchange.connected }
                : exchange
        ));
    };

    return (
        <header class="h-10 bg-theme-header flex items-center px-3 shrink-0">
            <div class="flex-1 flex items-center">
                <Exchanges exchanges={exchanges} on_exchange_click={handle_exchange_click} />
            </div>
            <div class="flex items-center gap-2">
                <CommandBar on_submit={handle_command} />
                <SettingsButton on_click={() => console.log('Settings clicked')} />
            </div>
            <div class="flex-1 flex items-center justify-end gap-2">
                <BlocksMenu />
                <RigSelector rig_name="DEFAULT" on_click={() => console.log('Rig selector clicked')} />
            </div>
        </header>
    );
}
