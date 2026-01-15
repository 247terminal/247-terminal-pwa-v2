# Exchange Settings Implementation

Focused implementation guide for exchange configuration UI - dropdown panels accessible from header icons.

---

## Overview

Exchange settings allow users to configure API credentials for each supported exchange. The UI follows the existing dropdown pattern used by `blocks_menu.tsx` and `rig_selector.tsx`.

**Key Features:**
- Dropdown panel opens on left side when clicking exchange icon in header
- Credentials stored locally only (never synced to server)
- Icon turns red (`text-error`) when connected, dimmed when disconnected
- Test & Connect validation before saving
- Click outside or Escape to close

---

## File Structure

```
src/
├── types/
│   └── credentials.types.ts       # Exchange credential types
├── stores/
│   └── credentials_store.ts       # Local-only credentials store
├── services/
│   └── exchange/
│       └── exchange.service.ts    # Validation API calls
├── hooks/
│   ├── use_click_outside.ts       # Reusable click outside hook
│   └── use_escape_key.ts          # Reusable escape key hook
└── components/
    ├── common/
    │   └── exchange_button.tsx    # Already exists - icon button
    └── exchange/
        └── exchange_panel.tsx     # Dropdown configuration panel
```

---

## Step 1: Types

### `src/types/credentials.types.ts`

```typescript
export type ExchangeId = 'bybit' | 'binance' | 'blofin' | 'hyperliquid';

export interface ExchangeCredentials {
    api_key: string;
    api_secret: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
    hedge_mode: boolean;
    connected: boolean;
    last_validated: number | null;
}

export interface NewsProviderCredentials {
    phoenix_key: string;
    tree_key: string;
    synoptic_key: string;
    groq_key: string;
}

export interface UserCredentials {
    exchanges: Record<ExchangeId, ExchangeCredentials>;
    news_providers: NewsProviderCredentials;
}

export interface CredentialsState {
    credentials: UserCredentials | null;
    loaded: boolean;
}
```

---

## Step 2: Credentials Store (LOCAL ONLY)

### `src/stores/credentials_store.ts`

```typescript
import { signal, computed } from '@preact/signals';
import type {
    UserCredentials,
    CredentialsState,
    ExchangeId,
    ExchangeCredentials,
} from '@/types/credentials.types';

const CREDENTIALS_STORAGE_KEY = '247terminal_credentials';

const DEFAULT_EXCHANGE_CREDENTIALS: ExchangeCredentials = {
    api_key: '',
    api_secret: '',
    hedge_mode: false,
    connected: false,
    last_validated: null,
};

const DEFAULT_CREDENTIALS: UserCredentials = {
    exchanges: {
        bybit: { ...DEFAULT_EXCHANGE_CREDENTIALS },
        binance: { ...DEFAULT_EXCHANGE_CREDENTIALS },
        blofin: { ...DEFAULT_EXCHANGE_CREDENTIALS, passphrase: '' },
        hyperliquid: { ...DEFAULT_EXCHANGE_CREDENTIALS, wallet_address: '', private_key: '' },
    },
    news_providers: {
        phoenix_key: '',
        tree_key: '',
        synoptic_key: '',
        groq_key: '',
    },
};

function load_from_storage(): UserCredentials | null {
    try {
        const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Failed to load credentials:', error);
        return null;
    }
}

function save_to_storage(credentials: UserCredentials): void {
    try {
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
        console.error('Failed to save credentials:', error);
    }
}

const initial_credentials = load_from_storage() || DEFAULT_CREDENTIALS;

export const credentials_state = signal<CredentialsState>({
    credentials: initial_credentials,
    loaded: true,
});

export const credentials = computed(() => credentials_state.value.credentials);

export const exchange_credentials = computed(() =>
    credentials.value?.exchanges ?? DEFAULT_CREDENTIALS.exchanges
);

export const exchange_connection_status = computed(() => {
    const exchanges = exchange_credentials.value;
    return {
        bybit: exchanges.bybit.connected,
        binance: exchanges.binance.connected,
        blofin: exchanges.blofin.connected,
        hyperliquid: exchanges.hyperliquid.connected,
    };
});

export function get_exchange_credentials(exchange_id: ExchangeId): ExchangeCredentials {
    return exchange_credentials.value[exchange_id];
}

export function update_exchange_credentials(
    exchange_id: ExchangeId,
    updates: Partial<ExchangeCredentials>
): void {
    const current = credentials.value;
    if (!current) return;

    const updated: UserCredentials = {
        ...current,
        exchanges: {
            ...current.exchanges,
            [exchange_id]: {
                ...current.exchanges[exchange_id],
                ...updates,
            },
        },
    };

    credentials_state.value = {
        credentials: updated,
        loaded: true,
    };

    save_to_storage(updated);
}

export function disconnect_exchange(exchange_id: ExchangeId): void {
    update_exchange_credentials(exchange_id, {
        api_key: '',
        api_secret: '',
        passphrase: '',
        wallet_address: '',
        private_key: '',
        connected: false,
        last_validated: null,
    });
}

export function clear_all_credentials(): void {
    credentials_state.value = {
        credentials: { ...DEFAULT_CREDENTIALS },
        loaded: true,
    };
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
}

export const has_connected_exchange = computed(() => {
    const status = exchange_connection_status.value;
    return status.bybit || status.binance || status.blofin || status.hyperliquid;
});
```

---

## Step 3: Exchange Service

### `src/services/exchange/exchange.service.ts`

```typescript
import { get_auth_headers } from '@/services/auth/auth.service';
import type { ExchangeId } from '@/types/credentials.types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ExchangeValidationResult {
    valid: boolean;
    error: string | null;
    balance?: number;
}

export interface ExchangeValidationRequest {
    api_key: string;
    api_secret: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
}

export async function validate_exchange_credentials(
    exchange_id: ExchangeId,
    credentials: ExchangeValidationRequest
): Promise<ExchangeValidationResult> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/exchange/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({
                exchange: exchange_id,
                ...credentials,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { valid: false, error: error.message || 'Validation failed' };
        }

        const result = await response.json();
        return {
            valid: true,
            error: null,
            balance: result.data?.balance,
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

export const EXCHANGE_FIELD_CONFIG: Record<ExchangeId, string[]> = {
    bybit: ['api_key', 'api_secret', 'hedge_mode'],
    binance: ['api_key', 'api_secret', 'hedge_mode'],
    blofin: ['api_key', 'api_secret', 'passphrase', 'hedge_mode'],
    hyperliquid: ['wallet_address', 'private_key'],
};

export function get_exchange_fields(exchange_id: ExchangeId): string[] {
    return EXCHANGE_FIELD_CONFIG[exchange_id];
}

export const EXCHANGE_NAMES: Record<ExchangeId, string> = {
    bybit: 'BYBIT',
    binance: 'BINANCE',
    blofin: 'BLOFIN',
    hyperliquid: 'HYPERLIQUID',
};
```

---

## Step 4: Reusable Hooks

### `src/hooks/use_click_outside.ts`

```typescript
import { useEffect, type RefObject } from 'preact/hooks';

export function use_click_outside(
    ref: RefObject<HTMLElement>,
    handler: () => void
): void {
    useEffect(() => {
        const handle_click = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handler();
            }
        };
        document.addEventListener('mousedown', handle_click);
        return () => document.removeEventListener('mousedown', handle_click);
    }, [ref, handler]);
}
```

### `src/hooks/use_escape_key.ts`

```typescript
import { useEffect } from 'preact/hooks';

export function use_escape_key(handler: () => void): void {
    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handler();
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, [handler]);
}
```

### `src/hooks/index.ts`

```typescript
export { use_click_outside } from './use_click_outside';
export { use_escape_key } from './use_escape_key';
```

---

## Step 5: Exchange Panel Component

### `src/components/exchange/exchange_panel.tsx`

```typescript
import { useState, useRef, useCallback } from 'preact/hooks';
import { use_click_outside, use_escape_key } from '@/hooks';
import {
    exchange_credentials,
    update_exchange_credentials,
    disconnect_exchange,
} from '@/stores/credentials_store';
import {
    validate_exchange_credentials,
    get_exchange_fields,
    EXCHANGE_NAMES,
} from '@/services/exchange/exchange.service';
import type { ExchangeId } from '@/types/credentials.types';

interface ExchangePanelProps {
    exchange_id: ExchangeId;
    is_open: boolean;
    on_close: () => void;
}

export function ExchangePanel({ exchange_id, is_open, on_close }: ExchangePanelProps) {
    const container_ref = useRef<HTMLDivElement>(null);
    const [testing, set_testing] = useState(false);
    const [error, set_error] = useState<string | null>(null);
    const [show_keys, set_show_keys] = useState(false);

    const credentials = exchange_credentials.value[exchange_id];
    const fields = get_exchange_fields(exchange_id);

    const [form_data, set_form_data] = useState({
        api_key: credentials.api_key,
        api_secret: credentials.api_secret,
        passphrase: credentials.passphrase || '',
        wallet_address: credentials.wallet_address || '',
        private_key: credentials.private_key || '',
        hedge_mode: credentials.hedge_mode,
    });

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

    return (
        <div
            ref={container_ref}
            class="fixed top-10 left-0 mt-1 w-64 bg-base-100 rounded-r shadow-lg z-50"
        >
            <div class="px-3 py-2 border-b border-base-300">
                <span class="text-xs font-medium tracking-wide text-base-content">
                    {EXCHANGE_NAMES[exchange_id]} SETUP
                </span>
            </div>

            <div class="p-3 space-y-3">
                {fields.includes('api_key') && (
                    <div>
                        <label class="text-xs text-base-content/60 tracking-wide">API KEY</label>
                        <input
                            type={show_keys ? 'text' : 'password'}
                            class="w-full mt-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                            value={form_data.api_key}
                            onInput={(e) => update_field('api_key', (e.target as HTMLInputElement).value)}
                            placeholder="Enter API key..."
                        />
                    </div>
                )}

                {fields.includes('api_secret') && (
                    <div>
                        <label class="text-xs text-base-content/60 tracking-wide">API SECRET</label>
                        <input
                            type={show_keys ? 'text' : 'password'}
                            class="w-full mt-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                            value={form_data.api_secret}
                            onInput={(e) => update_field('api_secret', (e.target as HTMLInputElement).value)}
                            placeholder="Enter API secret..."
                        />
                    </div>
                )}

                {fields.includes('passphrase') && (
                    <div>
                        <label class="text-xs text-base-content/60 tracking-wide">PASSPHRASE</label>
                        <input
                            type={show_keys ? 'text' : 'password'}
                            class="w-full mt-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                            value={form_data.passphrase}
                            onInput={(e) => update_field('passphrase', (e.target as HTMLInputElement).value)}
                            placeholder="Enter passphrase..."
                        />
                    </div>
                )}

                {fields.includes('wallet_address') && (
                    <div>
                        <label class="text-xs text-base-content/60 tracking-wide">WALLET ADDRESS</label>
                        <input
                            type="text"
                            class="w-full mt-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                            value={form_data.wallet_address}
                            onInput={(e) => update_field('wallet_address', (e.target as HTMLInputElement).value)}
                            placeholder="0x..."
                        />
                    </div>
                )}

                {fields.includes('private_key') && (
                    <div>
                        <label class="text-xs text-base-content/60 tracking-wide">PRIVATE KEY</label>
                        <input
                            type={show_keys ? 'text' : 'password'}
                            class="w-full mt-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                            value={form_data.private_key}
                            onInput={(e) => update_field('private_key', (e.target as HTMLInputElement).value)}
                            placeholder="Enter private key..."
                        />
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => set_show_keys(!show_keys)}
                    class="text-xs text-base-content/40 hover:text-base-content transition-colors"
                >
                    {show_keys ? 'HIDE KEYS' : 'SHOW KEYS'}
                </button>

                {fields.includes('hedge_mode') && (
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            class="checkbox checkbox-xs"
                            checked={form_data.hedge_mode}
                            onChange={(e) => update_field('hedge_mode', (e.target as HTMLInputElement).checked)}
                        />
                        <span class="text-xs text-base-content tracking-wide">HEDGE MODE</span>
                    </label>
                )}

                {error && (
                    <div class="text-xs text-error">{error}</div>
                )}
            </div>

            <div class="border-t border-base-300">
                <button
                    onClick={handle_test}
                    disabled={testing}
                    class="w-full px-3 py-2 text-xs text-primary hover:bg-base-200 transition-colors disabled:opacity-50"
                >
                    {testing ? 'TESTING...' : 'TEST & CONNECT'}
                </button>

                {credentials.connected && (
                    <button
                        onClick={handle_disconnect}
                        class="w-full px-3 py-2 text-xs text-error/60 hover:text-error hover:bg-base-200 transition-colors"
                    >
                        DISCONNECT
                    </button>
                )}
            </div>
        </div>
    );
}
```

---

## Step 6: Header Integration

### Update `src/components/layout/header.tsx`

Add state for managing which exchange panel is open:

```typescript
import { useState } from 'preact/hooks';
import { exchange_connection_status } from '@/stores/credentials_store';
import { ExchangePanel } from '@/components/exchange/exchange_panel';
import { ExchangeButton } from '@/components/common/exchange_button';
import { get_exchange_icon } from '@/components/common/exchanges';
import type { ExchangeId } from '@/types/credentials.types';

const EXCHANGE_ORDER: ExchangeId[] = ['blofin', 'binance', 'hyperliquid', 'bybit'];

export function Header() {
    const [open_exchange, set_open_exchange] = useState<ExchangeId | null>(null);
    const connection_status = exchange_connection_status.value;

    function handle_exchange_click(exchange_id: ExchangeId): void {
        set_open_exchange((prev) => (prev === exchange_id ? null : exchange_id));
    }

    function handle_panel_close(): void {
        set_open_exchange(null);
    }

    return (
        <header class="h-10 bg-theme-header flex items-center px-3 shrink-0 relative">
            <div class="flex-1 flex items-center gap-1">
                {EXCHANGE_ORDER.map((exchange_id) => (
                    <ExchangeButton
                        key={exchange_id}
                        connected={connection_status[exchange_id]}
                        on_click={() => handle_exchange_click(exchange_id)}
                    >
                        {get_exchange_icon(exchange_id)}
                    </ExchangeButton>
                ))}
            </div>

            {/* Center section */}
            <div class="flex items-center gap-3">
                {/* ConnectionStatus, CommandBar, etc. */}
            </div>

            {/* Right section */}
            <div class="flex-1 flex items-center justify-end gap-2">
                {/* LayoutLockToggle, ThemeToggle, BlocksMenu, RigSelector */}
            </div>

            {/* Exchange Panel - renders below header on left */}
            {open_exchange && (
                <ExchangePanel
                    exchange_id={open_exchange}
                    is_open={true}
                    on_close={handle_panel_close}
                />
            )}
        </header>
    );
}
```

### Existing `src/components/common/exchange_button.tsx`

Already implemented correctly:

```typescript
import type { ComponentChildren } from 'preact';

interface ExchangeButtonProps {
    connected: boolean;
    on_click?: () => void;
    children: ComponentChildren;
}

export function ExchangeButton({ connected, on_click, children }: ExchangeButtonProps) {
    return (
        <button
            onClick={on_click}
            class={`flex items-center justify-center px-1 py-0 rounded transition-colors ${
                connected
                    ? 'text-error hover:text-error/80'
                    : 'text-base-content/25 hover:text-base-content/40'
            }`}
        >
            {children}
        </button>
    );
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `src/types/credentials.types.ts`
- [ ] Create `src/stores/credentials_store.ts`
- [ ] Create `src/services/exchange/exchange.service.ts`

### Phase 2: Hooks
- [ ] Create `src/hooks/use_click_outside.ts`
- [ ] Create `src/hooks/use_escape_key.ts`
- [ ] Create `src/hooks/index.ts`

### Phase 3: UI Components
- [ ] Create `src/components/exchange/exchange_panel.tsx`
- [ ] Update `src/components/layout/header.tsx` with panel integration

### Phase 4: Testing
- [ ] Test panel opens/closes correctly
- [ ] Test click outside closes panel
- [ ] Test Escape key closes panel
- [ ] Test credential validation flow
- [ ] Test disconnect functionality
- [ ] Test icon color changes (red when connected)
- [ ] Test credentials persist in localStorage
- [ ] Verify credentials never sent to server

---

## Visual Reference

### Panel Design (matches blocks_menu.tsx style)

```
Header: [Blofin] [Binance] [HL] [Bybit]  ...
              ↓
        ┌──────────────────────────────┐
        │  BYBIT SETUP                 │
        ├──────────────────────────────┤
        │                              │
        │  API KEY                     │
        │  ┌────────────────────┐      │
        │  │ ●●●●●●●●●●●●●      │      │
        │  └────────────────────┘      │
        │                              │
        │  API SECRET                  │
        │  ┌────────────────────┐      │
        │  │ ●●●●●●●●●●●●●      │      │
        │  └────────────────────┘      │
        │                              │
        │  SHOW KEYS                   │
        │                              │
        │  ☐ HEDGE MODE                │
        │                              │
        ├──────────────────────────────┤
        │      TEST & CONNECT          │
        │      DISCONNECT              │
        └──────────────────────────────┘
```

### Icon States

| State | Class | Appearance |
|-------|-------|------------|
| Connected | `text-error` | Red, full opacity |
| Disconnected | `text-base-content/25` | Dimmed/grayed out |
| Hover (connected) | `text-error/80` | Slightly faded red |
| Hover (disconnected) | `text-base-content/40` | Less dimmed |
