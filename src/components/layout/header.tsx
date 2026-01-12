import { useState } from 'preact/hooks';
import { CommandBar } from '../common/command_bar';
import { RigSelector } from '../common/rig_selector';
import { Exchanges, get_exchange_icon } from '../common/exchanges';

export function Header() {
    const handle_command = (command: string) => {
        console.log('Command submitted:', command);
    };

    const [exchanges, set_exchanges] = useState([
        { id: 'blofin', name: 'Blofin', connected: false, icon: get_exchange_icon('blofin') },
        { id: 'binance', name: 'Binance', connected: true, icon: get_exchange_icon('binance') },
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
        <header class="h-10 bg-neutral border-b border-base-300 flex items-center px-3 shrink-0">
            <div class="flex-1 flex items-center">
                <Exchanges exchanges={exchanges} on_exchange_click={handle_exchange_click} />
            </div>
            <div class="flex items-center gap-2">
                <CommandBar on_submit={handle_command} />
                <button class="flex items-center justify-center px-2 py-1 bg-primary/10 rounded text-primary hover:bg-primary/20 transition-colors">
                    <svg class="w-4 h-4" viewBox="0 0 36 36" fill="currentColor">
                        <path d="M33.53,18.76,26.6,15.57V6.43A1,1,0,0,0,26,5.53l-7.5-3.45a1,1,0,0,0-.84,0l-7.5,3.45a1,1,0,0,0-.58.91v9.14L2.68,18.76a1,1,0,0,0-.58.91v9.78h0a1,1,0,0,0,.58.91l7.5,3.45a1,1,0,0,0,.84,0l7.08-3.26,7.08,3.26a1,1,0,0,0,.84,0l7.5-3.45a1,1,0,0,0,.58-.91h0V19.67A1,1,0,0,0,33.53,18.76Zm-2.81.91L25.61,22,20.5,19.67l5.11-2.35ZM18.1,4.08l5.11,2.35L18.1,8.78,13,6.43ZM10.6,17.31l5.11,2.35L10.6,22,5.49,19.67Zm6.5,11.49-6.5,3-6.5-3V21.23L10.18,24A1,1,0,0,0,11,24l6.08-2.8ZM11.6,15.57h0V8l6.08,2.8a1,1,0,0,0,.84,0L24.6,8v7.58h0l-6.5,3ZM32.11,28.81l-6.5,3-6.51-3V21.22L25.19,24A1,1,0,0,0,26,24l6.08-2.8Z"/>
                    </svg>
                </button>
            </div>
            <div class="flex-1 flex items-center justify-end gap-2">
                <button class="flex items-center justify-center px-2 py-1 bg-base-300/50 rounded text-base-content/50 hover:text-base-content/70 transition-colors">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                </button>
                <RigSelector rig_name="DEFAULT" on_click={() => console.log('Rig selector clicked')} />
            </div>
        </header>
    );
}
