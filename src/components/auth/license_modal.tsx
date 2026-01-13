import { useState } from 'preact/hooks';
import { LicenseInput } from './license_input';
import { Logo } from '../common/logo';

interface LicenseModalProps {
    on_submit: (license_key: string) => Promise<boolean>;
    error?: string;
    is_loading: boolean;
}

export function LicenseModal({ on_submit, error, is_loading }: LicenseModalProps) {
    const [license_key, set_license_key] = useState('');

    const handle_submit = async (e: Event) => {
        e.preventDefault();
        if (!license_key.trim() || is_loading) return;
        await on_submit(license_key.trim());
    };

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center">
            <div class="absolute inset-0 bg-base-300/80 backdrop-blur-sm"></div>

            <div class="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-8">
                <div class="flex flex-col items-center gap-6">
                    <Logo class="h-12" />

                    <form onSubmit={handle_submit} class="w-full flex flex-col gap-4">
                        <LicenseInput
                            value={license_key}
                            on_change={set_license_key}
                            error={error}
                            disabled={is_loading}
                        />

                        <button
                            type="submit"
                            class="btn btn-primary w-full"
                            disabled={!license_key.trim() || is_loading}
                        >
                            {is_loading ? (
                                <span class="loading loading-spinner loading-sm"></span>
                            ) : (
                                'ACTIVATE'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}