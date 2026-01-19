import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { use_click_outside, use_escape_key } from '@/hooks';
import {
    exchange_credentials,
    update_exchange_credentials,
    disconnect_exchange,
} from '@/stores/credentials_store';
import {
    validate_exchange_credentials,
    get_exchange_fields,
    EXCHANGE_LINKS,
    EXCHANGE_SETUP_GUIDES,
} from '@/services/exchange/exchange.service';
import { get_exchange_icon, get_exchange_logo } from '@/components/common/exchanges';
import type { ExchangeId } from '@/types/credentials.types';

interface ExchangePanelProps {
    exchange_id: ExchangeId;
    is_open: boolean;
    on_close: () => void;
}

interface PasswordInputProps {
    value: string;
    placeholder: string;
    on_change: (value: string) => void;
}

function PasswordInput({ value, placeholder, on_change }: PasswordInputProps) {
    const [visible, set_visible] = useState(false);

    return (
        <div class="relative">
            <input
                type={visible ? 'text' : 'password'}
                class="w-full bg-base-300 px-2 py-1.5 pr-8 rounded text-xs text-base-content outline-none"
                value={value}
                onInput={(e) => on_change((e.target as HTMLInputElement).value)}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={() => set_visible(!visible)}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
            >
                {visible ? (
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                ) : (
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </button>
        </div>
    );
}

interface HelpModalProps {
    exchange_id: ExchangeId;
    on_close: () => void;
}

function HelpModal({ exchange_id, on_close }: HelpModalProps) {
    const modal_ref = useRef<HTMLDivElement>(null);
    const { steps, notes } = EXCHANGE_SETUP_GUIDES[exchange_id];

    use_click_outside(modal_ref, on_close);
    use_escape_key(on_close);

    return (
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60">
            <div
                ref={modal_ref}
                class="bg-base-100 rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden"
            >
                <div class="flex items-center justify-between px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="text-primary">
                            {get_exchange_icon(exchange_id)}
                        </div>
                        <span class="text-base font-semibold text-base-content">Setup Guide</span>
                    </div>
                    <button
                        type="button"
                        onClick={on_close}
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div class="px-6 pb-6 overflow-y-auto max-h-[65vh]">
                    <div class="space-y-3">
                        {steps.map((step, index) => (
                            <div key={index} class="flex items-baseline gap-3">
                                <span class="shrink-0 text-sm text-primary font-medium">
                                    {index + 1}.
                                </span>
                                <p class="text-sm text-base-content/80 leading-relaxed">{step}</p>
                            </div>
                        ))}
                    </div>

                    {notes.length > 0 && (
                        <div class="mt-6 p-4 rounded-xl bg-warning/5 border border-warning/20">
                            <div class="flex items-center gap-2 mb-3">
                                <svg class="w-4 h-4 text-warning" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                                </svg>
                                <span class="text-sm font-medium text-warning">Important Notes</span>
                            </div>
                            <ul class="space-y-2">
                                {notes.map((note, index) => (
                                    <li key={index} class="flex items-start gap-2 text-sm text-base-content/70">
                                        <span class="text-warning leading-relaxed">•</span>
                                        <span class="leading-relaxed">{note}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ExchangePanel({ exchange_id, is_open, on_close }: ExchangePanelProps) {
    const container_ref = useRef<HTMLDivElement>(null);
    const [testing, set_testing] = useState(false);
    const [error, set_error] = useState<string | null>(null);
    const [help_open, set_help_open] = useState(false);

    const credentials = exchange_credentials.value[exchange_id];
    const fields = get_exchange_fields(exchange_id);
    const links = EXCHANGE_LINKS[exchange_id];

    const [form_data, set_form_data] = useState({
        api_key: credentials.api_key,
        api_secret: credentials.api_secret,
        passphrase: credentials.passphrase || '',
        wallet_address: credentials.wallet_address || '',
        private_key: credentials.private_key || '',
        hedge_mode: credentials.hedge_mode,
    });

    useEffect(() => {
        const creds = exchange_credentials.value[exchange_id];
        set_form_data({
            api_key: creds.api_key,
            api_secret: creds.api_secret,
            passphrase: creds.passphrase || '',
            wallet_address: creds.wallet_address || '',
            private_key: creds.private_key || '',
            hedge_mode: creds.hedge_mode,
        });
    }, [exchange_id]);

    const handle_close = useCallback(() => {
        set_error(null);
        on_close();
    }, [on_close]);

    use_click_outside(container_ref, handle_close);
    use_escape_key(handle_close);

    if (!is_open) return null;

    function update_field(field: string, value: string | boolean): void {
        set_form_data((prev) => ({ ...prev, [field]: value }));
    }

    async function handle_test(): Promise<void> {
        set_testing(true);
        set_error(null);

        const result = await validate_exchange_credentials(exchange_id, {
            api_key: form_data.api_key,
            api_secret: form_data.api_secret,
            passphrase: form_data.passphrase || undefined,
            wallet_address: form_data.wallet_address || undefined,
            private_key: form_data.private_key || undefined,
        });

        set_testing(false);

        if (!result.valid) {
            set_error(result.error || 'Validation failed');
            return;
        }

        update_exchange_credentials(exchange_id, {
            api_key: form_data.api_key,
            api_secret: form_data.api_secret,
            passphrase: form_data.passphrase || undefined,
            wallet_address: form_data.wallet_address || undefined,
            private_key: form_data.private_key || undefined,
            hedge_mode: form_data.hedge_mode,
            connected: true,
            last_validated: Date.now(),
        });

        handle_close();
    }

    function handle_disconnect(): void {
        disconnect_exchange(exchange_id);
        set_form_data({
            api_key: '',
            api_secret: '',
            passphrase: '',
            wallet_address: '',
            private_key: '',
            hedge_mode: false,
        });
        set_error(null);
    }

    function open_link(url: string): void {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return (
        <>
            <div
                ref={container_ref}
                class="fixed top-10 left-0 mt-1 w-80 bg-base-100 rounded-r shadow-lg z-50"
            >
                <div class="flex justify-center py-4 text-base-content/60">
                    {get_exchange_logo(exchange_id)}
                </div>
                <div class="flex">
                    <button
                        type="button"
                        onClick={() => open_link(links.open_account)}
                        class="group relative flex-1 flex justify-center py-2 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                        <span class="absolute bottom-full mb-1 px-2 py-1 text-xs bg-base-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Open Account
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => open_link(links.api_management)}
                        class="group relative flex-1 flex justify-center py-2 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                        </svg>
                        <span class="absolute bottom-full mb-1 px-2 py-1 text-xs bg-base-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Get API Key
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => set_help_open(true)}
                        class="group relative flex-1 flex justify-center py-2 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <circle cx="12" cy="17" r="0.5" fill="currentColor" />
                        </svg>
                        <span class="absolute bottom-full mb-1 px-2 py-1 text-xs bg-base-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Setup Guide
                        </span>
                    </button>
                </div>
                <div class="p-3 space-y-2">
                {fields.includes('api_key') && (
                    <PasswordInput
                        value={form_data.api_key}
                        placeholder="API KEY"
                        on_change={(value) => update_field('api_key', value)}
                    />
                )}

                {fields.includes('api_secret') && (
                    <PasswordInput
                        value={form_data.api_secret}
                        placeholder="API SECRET"
                        on_change={(value) => update_field('api_secret', value)}
                    />
                )}

                {fields.includes('passphrase') && (
                    <PasswordInput
                        value={form_data.passphrase}
                        placeholder="PASSPHRASE"
                        on_change={(value) => update_field('passphrase', value)}
                    />
                )}

                {fields.includes('wallet_address') && (
                    <input
                        type="text"
                        class="w-full bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                        value={form_data.wallet_address}
                        onInput={(e) => update_field('wallet_address', (e.target as HTMLInputElement).value)}
                        placeholder="WALLET ADDRESS"
                    />
                )}

                {fields.includes('private_key') && (
                    <PasswordInput
                        value={form_data.private_key}
                        placeholder="PRIVATE KEY"
                        on_change={(value) => update_field('private_key', value)}
                    />
                )}

                {fields.includes('hedge_mode') && (
                    <label class="flex items-center justify-between cursor-pointer">
                        <span class="text-xs text-base-content tracking-wide">HEDGE MODE</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-xs toggle-primary"
                            checked={form_data.hedge_mode}
                            onChange={(e) => update_field('hedge_mode', (e.target as HTMLInputElement).checked)}
                        />
                    </label>
                )}

                {error && (
                    <div class="text-xs text-error">{error}</div>
                )}
            </div>

            <div>
                <button
                    type="button"
                    onClick={handle_test}
                    disabled={testing}
                    class="w-full px-3 py-2 text-xs text-primary bg-base-200/50 hover:bg-base-200 transition-colors disabled:opacity-50"
                >
                    {testing ? 'CONNECTING...' : 'CONNECT'}
                </button>

                {credentials.connected && (
                    <button
                        type="button"
                        onClick={handle_disconnect}
                        class="w-full px-3 py-2 text-xs text-error/60 hover:text-error hover:bg-base-200 transition-colors"
                    >
                        DISCONNECT
                    </button>
                )}
            </div>
            </div>

            {help_open && (
                <HelpModal
                    exchange_id={exchange_id}
                    on_close={() => set_help_open(false)}
                />
            )}
        </>
    );
}