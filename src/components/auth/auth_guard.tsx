import type { ComponentChildren } from 'preact';
import { use_auth } from '../../hooks/use_auth';
import { LicenseModal } from './license_modal';
import { AuthLoading } from './auth_loading';

interface AuthGuardProps {
    children: ComponentChildren;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { is_authenticated, is_loading, error, login } = use_auth();

    if (is_loading.value) {
        return <AuthLoading />;
    }

    return (
        <>
            {!is_authenticated.value && (
                <LicenseModal
                    on_submit={login}
                    error={error.value || undefined}
                    is_loading={is_loading.value}
                />
            )}
            <div class={!is_authenticated.value ? 'blur-sm pointer-events-none' : ''}>
                {children}
            </div>
        </>
    );
}
