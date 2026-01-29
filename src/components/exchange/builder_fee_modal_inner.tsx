import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { RainbowKitProvider, darkTheme, useConnectModal } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { X, Wallet, Check, AlertCircle, Loader2 } from 'lucide-preact';
import { wagmi_config } from '@/config/wallet';
import { approve_builder_fee, get_builder_info } from '@/services/hyperliquid/builder_fee';
import type { BuilderFeeModalProps, ApprovalStep } from '@/types/builder_fee.types';
import '@rainbow-me/rainbowkit/styles.css';

let query_client: QueryClient | null = null;
function get_query_client() {
    if (!query_client) {
        query_client = new QueryClient({
            defaultOptions: {
                queries: { staleTime: 60_000, gcTime: 300_000 },
            },
        });
    }
    return query_client;
}

const BUILDER_INFO = get_builder_info();

function ModalContent({ wallet_address, on_success, on_close }: BuilderFeeModalProps) {
    const [step, set_step] = useState<ApprovalStep>('connect');
    const [error, set_error] = useState<string | null>(null);
    const timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { openConnectModal } = useConnectModal();
    const { address, isConnected } = useAccount();
    const { data: wallet_client } = useWalletClient();
    const { disconnect } = useDisconnect();

    const is_correct_wallet = useMemo(
        () => address?.toLowerCase() === wallet_address.toLowerCase(),
        [address, wallet_address]
    );

    useEffect(() => {
        return () => {
            if (timeout_ref.current) clearTimeout(timeout_ref.current);
        };
    }, []);

    useEffect(() => {
        if (isConnected && is_correct_wallet) {
            set_step('confirm');
        } else if (isConnected && !is_correct_wallet) {
            set_error(
                `Please connect the wallet: ${wallet_address.slice(0, 6)}...${wallet_address.slice(-4)}`
            );
        }
    }, [isConnected, is_correct_wallet, wallet_address]);

    async function handle_approve() {
        if (!wallet_client) {
            set_error('Wallet not connected');
            return;
        }

        set_step('signing');
        set_error(null);

        try {
            await approve_builder_fee(wallet_client);
            set_step('success');
            timeout_ref.current = setTimeout(() => {
                on_success();
            }, 1500);
        } catch (err) {
            set_step('error');
            set_error(err instanceof Error ? err.message : 'Failed to approve builder fee');
        }
    }

    function handle_connect() {
        if (isConnected && !is_correct_wallet) {
            disconnect();
            timeout_ref.current = setTimeout(() => {
                openConnectModal?.();
            }, 100);
        } else {
            openConnectModal?.();
        }
    }

    function handle_retry() {
        set_error(null);
        set_step('confirm');
    }

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div class="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <h2 class="text-lg font-semibold text-base-content">Builder Fee Approval</h2>
                    <button
                        onClick={on_close}
                        class="p-1 rounded-lg hover:bg-base-200 transition-colors"
                    >
                        <X class="w-5 h-5 text-base-content/60" />
                    </button>
                </div>

                <div class="px-6 py-6 space-y-6">
                    <div class="bg-base-200 rounded-xl p-4 space-y-3">
                        <div class="flex items-center gap-2 text-warning">
                            <AlertCircle class="w-5 h-5" />
                            <span class="font-medium">Action Required</span>
                        </div>
                        <p class="text-sm text-base-content/70">
                            To trade on Hyperliquid through 247 Terminal, you need to approve our
                            builder fee. This is a one-time signature.
                        </p>
                    </div>

                    <div class="space-y-3">
                        <div class="flex justify-between text-sm">
                            <span class="text-base-content/60">Builder Address</span>
                            <span class="font-mono text-xs text-base-content">
                                {BUILDER_INFO.address.slice(0, 8)}...
                                {BUILDER_INFO.address.slice(-6)}
                            </span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-base-content/60">Fee Rate</span>
                            <span class="font-mono text-xs text-base-content">
                                {BUILDER_INFO.fee_percent}
                            </span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-base-content/60">Your Wallet</span>
                            <span class="font-mono text-xs text-base-content">
                                {wallet_address.slice(0, 8)}...{wallet_address.slice(-6)}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div class="bg-error/10 border border-error/20 rounded-lg p-3">
                            <p class="text-sm text-error">{error}</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div class="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                            <Check class="w-5 h-5 text-success" />
                            <span class="text-success font-medium">
                                Builder fee approved successfully!
                            </span>
                        </div>
                    )}

                    <div class="space-y-3">
                        {(step === 'connect' || (isConnected && !is_correct_wallet)) && (
                            <button onClick={handle_connect} class="btn btn-primary w-full gap-2">
                                <Wallet class="w-4 h-4" />
                                {isConnected && !is_correct_wallet
                                    ? 'Switch Wallet'
                                    : 'Connect Wallet'}
                            </button>
                        )}

                        {step === 'confirm' && is_correct_wallet && (
                            <button onClick={handle_approve} class="btn btn-primary w-full">
                                Approve Builder Fee
                            </button>
                        )}

                        {step === 'signing' && (
                            <button class="btn btn-primary w-full" disabled>
                                <Loader2 class="w-4 h-4 animate-spin" />
                                Waiting for signature...
                            </button>
                        )}

                        {step === 'error' && (
                            <button onClick={handle_retry} class="btn btn-primary w-full">
                                Try Again
                            </button>
                        )}

                        {step !== 'success' && (
                            <button
                                onClick={on_close}
                                class="btn btn-ghost w-full text-base-content/60"
                            >
                                Skip for now
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function BuilderFeeModalInner(props: BuilderFeeModalProps) {
    return (
        <WagmiProvider config={wagmi_config}>
            <QueryClientProvider client={get_query_client()}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#3b82f6',
                        borderRadius: 'medium',
                    })}
                >
                    <ModalContent {...props} />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
