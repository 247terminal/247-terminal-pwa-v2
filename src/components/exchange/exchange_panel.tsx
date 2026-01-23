import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { Eye, EyeOff, X, UserPlus, KeyRound, AlertTriangle } from 'lucide-preact';
import { toast } from 'sonner';
import { use_click_outside, use_escape_key } from '@/hooks';
import {
    exchange_credentials,
    update_exchange_credentials,
    disconnect_exchange as disconnect_exchange_credentials,
} from '@/stores/credentials_store';
import {
    validate_exchange_credentials,
    get_exchange_fields,
    EXCHANGE_LINKS,
    EXCHANGE_SETUP_GUIDES,
} from '@/services/exchange/exchange.service';
import { init_exchange, destroy_exchange } from '@/services/exchange/account_bridge';
import { load_exchange } from '@/services/exchange/init';
import { refresh_account, clear_exchange_data } from '@/stores/account_store';
import { get_exchange_icon, get_exchange_logo } from '@/components/common/exchanges';
import type {
    ExchangePanelProps,
    PasswordInputProps,
    HelpModalProps,
} from '@/types/exchange.types';

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
                {visible ? <EyeOff class="w-3.5 h-3.5" /> : <Eye class="w-3.5 h-3.5" />}
            </button>
        </div>
    );
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
                        <div class="text-primary">{get_exchange_icon(exchange_id)}</div>
                        <span class="text-base font-semibold text-base-content">Setup Guide</span>
                    </div>
                    <button
                        type="button"
                        onClick={on_close}
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <X class="w-5 h-5" />
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
                                <AlertTriangle class="w-4 h-4 text-warning" />
                                <span class="text-sm font-medium text-warning">
                                    Important Notes
                                </span>
                            </div>
                            <ul class="space-y-2">
                                {notes.map((note, index) => (
                                    <li
                                        key={index}
                                        class="flex items-start gap-2 text-sm text-base-content/70"
                                    >
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
    });

    useEffect(() => {
        const creds = exchange_credentials.value[exchange_id];
        set_form_data({
            api_key: creds.api_key,
            api_secret: creds.api_secret,
            passphrase: creds.passphrase || '',
            wallet_address: creds.wallet_address || '',
            private_key: creds.private_key || '',
        });
    }, [exchange_id]);

    const handle_close = useCallback(() => {
        set_error(null);
        on_close();
    }, [on_close]);

    use_click_outside(container_ref, handle_close);
    use_escape_key(handle_close);

    if (!is_open) return null;

    function update_field(field: string, value: string): void {
        set_form_data((prev) => ({ ...prev, [field]: value }));
    }

    async function handle_test(): Promise<void> {
        set_testing(true);
        set_error(null);

        try {
            const creds = {
                api_key: form_data.api_key,
                api_secret: form_data.api_secret,
                passphrase: form_data.passphrase || undefined,
                wallet_address: form_data.wallet_address || undefined,
                private_key: form_data.private_key || undefined,
            };

            const result = await validate_exchange_credentials(exchange_id, creds);

            if (!result.valid) {
                const exchange_name = exchange_id.charAt(0).toUpperCase() + exchange_id.slice(1);
                set_error(result.error || 'validation failed');
                toast.error(`Failed to connect to ${exchange_name}`);
                return;
            }

            await init_exchange(exchange_id, creds);

            update_exchange_credentials(exchange_id, {
                ...creds,
                connected: true,
                last_validated: Date.now(),
            });

            load_exchange(exchange_id).catch(console.error);
            refresh_account(exchange_id).catch(console.error);

            const exchange_name = exchange_id.charAt(0).toUpperCase() + exchange_id.slice(1);
            toast.success(`Connected to ${exchange_name}`);
            handle_close();
        } catch (err) {
            const exchange_name = exchange_id.charAt(0).toUpperCase() + exchange_id.slice(1);
            const message = err instanceof Error ? err.message : 'connection failed';
            set_error(message);
            toast.error(`Failed to connect to ${exchange_name}`);
        } finally {
            set_testing(false);
        }
    }

    async function handle_disconnect(): Promise<void> {
        await destroy_exchange(exchange_id);
        disconnect_exchange_credentials(exchange_id);
        clear_exchange_data(exchange_id);
        set_form_data({
            api_key: '',
            api_secret: '',
            passphrase: '',
            wallet_address: '',
            private_key: '',
        });
        set_error(null);
        const exchange_name = exchange_id.charAt(0).toUpperCase() + exchange_id.slice(1);
        toast.success(`Disconnected from ${exchange_name}`);
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
                        <UserPlus class="w-4 h-4" />
                        <span class="absolute bottom-full mb-1 px-2 py-1 text-xs bg-base-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Open Account
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => open_link(links.api_management)}
                        class="group relative flex-1 flex justify-center py-2 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <KeyRound class="w-4 h-4" />
                        <span class="absolute bottom-full mb-1 px-2 py-1 text-xs bg-base-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Get API Key
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => set_help_open(true)}
                        class="group relative flex-1 flex justify-center py-2 text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                    >
                        <svg
                            class="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
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
                            onInput={(e) =>
                                update_field('wallet_address', (e.target as HTMLInputElement).value)
                            }
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

                    {error && <div class="text-xs text-error">{error}</div>}
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
                <HelpModal exchange_id={exchange_id} on_close={() => set_help_open(false)} />
            )}
        </>
    );
}
