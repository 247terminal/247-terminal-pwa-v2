# 247 Terminal v2.0 - Authentication Implementation

**Date:** 2025-01-09
**Status:** Ready for Implementation
**Reference:** See `v2_authentication_system.md` for architecture decisions and flow diagrams.

---

## Directory Structure

Create the following directories and files:

```
src/
├── services/
│   └── auth/
│       ├── types.ts
│       ├── session.service.ts
│       └── auth.service.ts
├── stores/
│   └── auth.store.ts
├── hooks/
│   └── use_auth.ts
├── components/
│   └── auth/
│       ├── license_input.tsx
│       ├── license_modal.tsx
│       ├── auth_loading.tsx
│       └── auth_guard.tsx
```

---

## Phase 1: Core Services

### 1.1 Types (`src/services/auth/types.ts`)

```typescript
export interface User {
    membership_id: string;
    email: string;
    is_admin: boolean;
    is_global_key: boolean;
    status: string;
    expires_at: string;
}

export interface AuthResult {
    success: boolean;
    valid: boolean;
    token?: string;
    user?: User;
    error?: string;
    cached?: boolean;
}

export interface ValidateResponse {
    success: boolean;
    status: string;
    message: string;
    data: {
        valid: boolean;
        is_admin: boolean;
        is_global_key: boolean;
        email: string | null;
        membership_id: string | null;
        status: string | null;
        token?: string;
        user?: {
            email: string;
            membership_id: string;
            is_global_key: boolean;
            expires_at: string;
        };
        cached: boolean;
    };
}

export interface AuthState {
    status: 'loading' | 'authenticated' | 'unauthenticated';
    user: User | null;
    error: string | null;
}
```

---

### 1.2 Session Service (`src/services/auth/session.service.ts`)

Handles localStorage token storage and JWT decoding.

```typescript
const TOKEN_KEY = '247_session_token';

export function save_token(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function get_token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function clear_token(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export function decode_jwt_payload(token: string): Record<string, unknown> | null {
    try {
        const base64_payload = token.split('.')[1];
        const payload = atob(base64_payload);
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

export function is_token_expired(token: string): boolean {
    const payload = decode_jwt_payload(token);
    if (!payload || typeof payload.exp !== 'number') {
        return true;
    }
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
}

export function get_token_expiry(token: string): Date | null {
    const payload = decode_jwt_payload(token);
    if (!payload || typeof payload.exp !== 'number') {
        return null;
    }
    return new Date(payload.exp * 1000);
}
```

---

### 1.3 Auth Service (`src/services/auth/auth.service.ts`)

Core authentication logic - validates license keys and manages sessions.

```typescript
import type { AuthResult, ValidateResponse, User } from './types';
import {
    save_token,
    get_token,
    clear_token,
    is_token_expired,
    decode_jwt_payload
} from './session.service';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function validate_license(license_key: string): Promise<AuthResult> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/license/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key }),
        });

        if (response.status === 429) {
            return {
                success: false,
                valid: false,
                error: 'Too many attempts. Please wait and try again.'
            };
        }

        const data: ValidateResponse = await response.json();

        if (!data.data.valid) {
            return {
                success: false,
                valid: false,
                error: data.message || 'Invalid license key'
            };
        }

        const token = data.data.token;
        if (token) {
            save_token(token);
        }

        const user: User = {
            membership_id: data.data.membership_id || '',
            email: data.data.email || '',
            is_admin: data.data.is_admin,
            is_global_key: data.data.is_global_key,
            status: data.data.status || '',
            expires_at: data.data.user?.expires_at || '',
        };

        return { success: true, valid: true, token, user };
    } catch (error) {
        return {
            success: false,
            valid: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

export function check_existing_session(): { valid: boolean; user: User | null } {
    const token = get_token();

    if (!token) {
        return { valid: false, user: null };
    }

    if (is_token_expired(token)) {
        clear_token();
        return { valid: false, user: null };
    }

    const payload = decode_jwt_payload(token);
    if (!payload) {
        clear_token();
        return { valid: false, user: null };
    }

    const user: User = {
        membership_id: (payload.membership_id as string) || '',
        email: (payload.email as string) || '',
        is_admin: (payload.is_admin as boolean) || false,
        is_global_key: (payload.is_global_key as boolean) || false,
        status: 'active',
        expires_at: '',
    };

    return { valid: true, user };
}

export function logout(): void {
    clear_token();
}

export function get_auth_headers(): Record<string, string> {
    const token = get_token();
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
}
```

---

### 1.4 Auth Store (`src/stores/auth.store.ts`)

Reactive state management using Preact Signals.

```typescript
import { signal, computed } from '@preact/signals';
import type { AuthState, User } from '../services/auth/types';

export const auth_state = signal<AuthState>({
    status: 'loading',
    user: null,
    error: null,
});

export const is_authenticated = computed(() =>
    auth_state.value.status === 'authenticated'
);

export const is_loading = computed(() =>
    auth_state.value.status === 'loading'
);

export const current_user = computed(() =>
    auth_state.value.user
);

export const auth_error = computed(() =>
    auth_state.value.error
);

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
```

---

### 1.5 Auth Hook (`src/hooks/use_auth.ts`)

Custom hook that provides auth functionality to components.

```typescript
import { useEffect } from 'preact/hooks';
import {
    auth_state,
    is_authenticated,
    is_loading,
    current_user,
    auth_error,
    set_authenticated,
    set_unauthenticated,
    set_loading,
    clear_error
} from '../stores/auth.store';
import {
    validate_license,
    check_existing_session,
    logout as logout_service
} from '../services/auth/auth.service';

export function use_auth() {
    useEffect(() => {
        const { valid, user } = check_existing_session();
        if (valid && user) {
            set_authenticated(user);
        } else {
            set_unauthenticated();
        }
    }, []);

    const login = async (license_key: string): Promise<boolean> => {
        set_loading();
        clear_error();

        const result = await validate_license(license_key);

        if (result.success && result.valid && result.user) {
            set_authenticated(result.user);
            return true;
        } else {
            set_unauthenticated(result.error);
            return false;
        }
    };

    const logout = (): void => {
        logout_service();
        set_unauthenticated();
    };

    return {
        state: auth_state,
        is_authenticated,
        is_loading,
        user: current_user,
        error: auth_error,
        login,
        logout,
        clear_error,
    };
}
```

---

## Phase 2: Components

### 2.1 License Input (`src/components/auth/license_input.tsx`)

Styled input for license key entry. Uses `type="password"` and `autocomplete="current-password"` to trigger browser credential manager.

```typescript
interface LicenseInputProps {
    value: string;
    on_change: (value: string) => void;
    error?: string;
    disabled?: boolean;
}

export function LicenseInput({ value, on_change, error, disabled }: LicenseInputProps) {
    const handle_change = (e: Event) => {
        const target = e.target as HTMLInputElement;
        on_change(target.value.toUpperCase());
    };

    return (
        <div class="form-control w-full">
            <input
                type="password"
                name="license_key"
                autocomplete="current-password"
                placeholder="Enter your license key"
                class={`input input-bordered w-full font-mono ${error ? 'input-error' : ''}`}
                value={value}
                onInput={handle_change}
                disabled={disabled}
            />
            {error && (
                <label class="label">
                    <span class="label-text-alt text-error">{error}</span>
                </label>
            )}
        </div>
    );
}
```

---

### 2.2 Auth Loading (`src/components/auth/auth_loading.tsx`)

Loading spinner shown while checking existing session.

```typescript
export function AuthLoading() {
    return (
        <div class="min-h-screen bg-base-100 flex items-center justify-center">
            <div class="flex flex-col items-center gap-4">
                <span class="loading loading-spinner loading-lg text-primary"></span>
                <p class="text-base-content/70">Checking session...</p>
            </div>
        </div>
    );
}
```

---

### 2.3 License Modal (`src/components/auth/license_modal.tsx`)

Modal overlay for license key entry. Appears over blurred app content.

```typescript
import { useState } from 'preact/hooks';
import { LicenseInput } from './license_input';

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
                    <h1 class="text-2xl font-bold text-base-content">247 Terminal</h1>
                    <p class="text-base-content/70 text-center">
                        Enter your license key to continue
                    </p>

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
                                'Activate'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

---

### 2.4 Auth Guard (`src/components/auth/auth_guard.tsx`)

Wrapper component that protects the app. Shows modal when unauthenticated.

```typescript
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
```

---

## Phase 3: Integration

### 3.1 Update App (`src/app.tsx`)

Wrap the entire app with AuthGuard:

```typescript
import { AuthGuard } from './components/auth/auth_guard';
import { ThemeToggle } from './components/common/theme_toggle';

export function App() {
    return (
        <AuthGuard>
            <div class="min-h-screen bg-base-100 flex flex-col items-center justify-center gap-4 p-8">
                <div class="flex-justify-end">
                    <ThemeToggle />
                </div>
                <h1 class="text-4xl font-bold text-base-content">247 Terminal</h1>
                <p class="text-base-content/70">Welcome to 247 Terminal v2</p>

                {/* Terminal content goes here */}
            </div>
        </AuthGuard>
    );
}
```

---

### 3.2 Environment Variables

Create `.env` file in project root:

```
VITE_API_URL=https://api.247trading.com
```

For local development, you may need:

```
VITE_API_URL=http://localhost:3000
```

---

## Phase 4: Testing Checklist

### Manual Testing

- [ ] Fresh visit (no token) shows license modal
- [ ] Invalid license key shows error message
- [ ] Valid license key logs in and shows terminal
- [ ] Page refresh with valid token auto-logs in
- [ ] Page refresh with expired token shows modal
- [ ] Logout clears token and shows modal
- [ ] Browser offers to save license key (credential manager)
- [ ] Browser autofills license key on return visit
- [ ] Rate limit error (429) shows friendly message
- [ ] Network error shows friendly message

### Edge Cases

- [ ] Malformed JWT token is handled gracefully
- [ ] Empty license key submission is prevented
- [ ] Double-click submit is prevented (loading state)
- [ ] Modal cannot be dismissed without valid login

---

## Usage Examples

### Accessing User Data in Components

```typescript
import { use_auth } from '../hooks/use_auth';

function UserProfile() {
    const { user, logout } = use_auth();

    return (
        <div>
            <p>Email: {user.value?.email}</p>
            <p>Admin: {user.value?.is_admin ? 'Yes' : 'No'}</p>
            <button onClick={logout} class="btn btn-error">
                Logout
            </button>
        </div>
    );
}
```

### Making Authenticated API Calls

```typescript
import { get_auth_headers } from '../services/auth/auth.service';

async function fetch_protected_data() {
    const response = await fetch('/v1/api/protected', {
        headers: {
            'Content-Type': 'application/json',
            ...get_auth_headers(),
        },
    });
    return response.json();
}
```

### Checking Auth State Outside Components

```typescript
import { is_authenticated, current_user } from '../stores/auth.store';

if (is_authenticated.value) {
    console.log('User is logged in:', current_user.value?.email);
}
```

---

## Troubleshooting

### Token not persisting

- Check browser's localStorage is not blocked
- Verify `247_session_token` key exists in Application > Local Storage

### Browser not offering to save license

- Ensure `type="password"` and `autocomplete="current-password"` on input
- Must be served over HTTPS (or localhost)
- Form must have a submit button

### CORS errors

- Verify `VITE_API_URL` is correct
- Backend must allow frontend origin
- Check if credentials mode is needed

### 429 Rate Limit

- Wait 15 minutes before retrying
- Backend allows 15 requests per 15-minute window
