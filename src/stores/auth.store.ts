import { signal, computed } from '@preact/signals';
import type { AuthState, User } from '@/services/auth/types';

export const auth_state = signal<AuthState>({
    status: 'loading',
    user: null,
    error: null,
});

export const is_authenticated = computed(() => auth_state.value.status === 'authenticated');

export const is_loading = computed(() => auth_state.value.status === 'loading');

export const current_user = computed(() => auth_state.value.user);

export const auth_error = computed(() => auth_state.value.error);

export function set_authenticated(user: User): void {
    auth_state.value = { status: 'authenticated', user, error: null };
}

export function set_unauthenticated(error?: string): void {
    auth_state.value = { status: 'unauthenticated', user: null, error: error || null };
}

export function set_loading(): void {
    auth_state.value = { status: 'loading', user: null, error: null };
}

export function clear_error(): void {
    auth_state.value = { ...auth_state.value, error: null };
}
