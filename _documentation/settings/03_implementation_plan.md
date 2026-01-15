# Settings Implementation Plan (Revised)

Based on 2025 best practices research, UI/UX patterns, and alignment with existing v2 codebase.

---

## Architecture Overview

### Key Design Decisions

1. **Separation of Concerns**: Settings split into distinct stores by domain
2. **Local-First Architecture**: All changes saved locally immediately, synced to server in background
3. **Service + Store Pattern**: Following auth pattern for API-dependent operations
4. **Server Sync for Everything**: Both settings AND layouts sync to server
5. **Modal for Exchanges**: Quick access from header icons
6. **Drawer for Settings**: Slide-out panel instead of separate page
7. **Type-Safe**: Full TypeScript with strict types

### Storage & Sync Strategy

| Data Type | Storage Key | Server Sync | Notes |
|-----------|-------------|-------------|-------|
| Layouts/Rigs | `247terminal_rigs` | Yes (3s debounce) | Full sync |
| User Settings | `247terminal_settings_v2` | Yes (2s debounce) | Non-sensitive preferences only |
| Exchange Credentials | `247terminal_credentials` | **Never** | Local device only, never transmitted |
| News Provider Keys | `247terminal_credentials` | **Never** | Stored with exchange credentials |

**Security Model:**
- Sensitive data (API keys, secrets, passphrases) never leaves the device
- User must re-enter credentials on new devices
- Backup export can optionally include credentials (user's explicit choice)

---

## UI Architecture

### Exchange Configuration: Dropdown Panel (Left Side)
```
User clicks exchange icon → Dropdown panel expands on left → Configure credentials → Test → Save
                                                                                        ↓
                                                                         Icon turns red (connected)
```
- Same UI style as `blocks_menu.tsx` and `rig_selector.tsx`
- Opens below header on left side (`fixed top-10 left-0`)
- Click outside or Escape to close

### General Settings: Right-Side Drawer
```
User clicks settings gear → Drawer slides from right → Accordion sections → Auto-save on change
```

### Quick Settings: Inline (Header)
- Theme toggle (exists)
- Layout lock (exists)
- Sound toggle (new)

---

## File Structure

```
src/
├── types/
│   ├── settings.types.ts           # User settings type definitions
│   ├── credentials.types.ts        # Exchange/API credentials types
│   └── layout.types.ts             # Already exists (add sync metadata)
├── services/
│   ├── settings/
│   │   ├── settings.service.ts     # Settings API (sync to server)
│   │   └── settings.constants.ts   # Default values, storage keys
│   ├── layout/
│   │   └── layout_sync.service.ts  # Layout server sync
│   └── exchange/
│       └── exchange.service.ts     # Exchange API validation
├── stores/
│   ├── settings_store.ts           # User settings (syncs to server)
│   ├── credentials_store.ts        # Sensitive credentials (LOCAL ONLY)
│   └── layout_store.ts             # Already exists (add sync integration)
└── components/
    ├── settings/
    │   ├── settings_drawer.tsx     # Main drawer container
    │   ├── trading_section.tsx     # Trading settings accordion
    │   ├── terminal_section.tsx    # Terminal settings accordion
    │   ├── chart_section.tsx       # Chart settings accordion
    │   ├── news_section.tsx        # News settings accordion
    │   ├── keyword_section.tsx     # Keyword lists accordion
    │   ├── shortcuts_section.tsx   # Shortcuts accordion
    │   ├── botting_section.tsx     # Botting accordion
    │   └── backup_section.tsx      # Backup/restore accordion
    └── exchange/
        └── exchange_panel.tsx      # Exchange dropdown panel (left side)
```

### Store Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                        THREE STORES                              │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   credentials_store │    settings_store   │    layout_store     │
│   (LOCAL ONLY)      │   (SYNCS TO SERVER) │  (SYNCS TO SERVER)  │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ • Exchange API keys │ • Trading prefs     │ • Rigs              │
│ • Exchange secrets  │ • Terminal prefs    │ • Block positions   │
│ • Passphrases       │ • Chart prefs       │ • Block sizes       │
│ • Private keys      │ • News display      │ • Active rig        │
│ • News provider keys│ • Keywords          │                     │
│                     │ • Shortcuts         │                     │
│                     │ • Botting config    │                     │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ 247terminal_        │ 247terminal_        │ 247terminal_rigs    │
│ credentials         │ settings_v2         │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## Phase 1: Core Infrastructure

### 1.1 Credentials Types (`src/types/credentials.types.ts`)

**LOCAL ONLY - Never synced to server**

```typescript
export type ExchangeId = 'bybit' | 'binance' | 'blofin' | 'hyperliquid';

// Exchange credentials - LOCAL ONLY
export interface ExchangeCredentials {
    api_key: string;
    api_secret: string;
    passphrase?: string;       // BloFin only
    wallet_address?: string;   // Hyperliquid only
    private_key?: string;      // Hyperliquid only
    hedge_mode: boolean;
    connected: boolean;
    last_validated: number | null;
}

// News provider API keys - LOCAL ONLY
export interface NewsProviderCredentials {
    phoenix_key: string;
    tree_key: string;
    synoptic_key: string;
    groq_key: string;
}

// Complete credentials object - LOCAL ONLY
export interface UserCredentials {
    exchanges: Record<ExchangeId, ExchangeCredentials>;
    news_providers: NewsProviderCredentials;
}

// Credentials state
export interface CredentialsState {
    credentials: UserCredentials | null;
    loaded: boolean;
}
```

### 1.2 Settings Types (`src/types/settings.types.ts`)

**Syncs to server - NO sensitive data**

```typescript
import type { ExchangeId } from './credentials.types';

// Exchange preferences (non-sensitive) - syncs to server
export interface ExchangePreferences {
    preferred: ExchangeId;
    enabled_exchanges: ExchangeId[];
}

// Trading settings
export interface TradingSettings {
    sizes: [number, number, number, number];
    size_count: 1 | 2 | 3 | 4;
    slippage: number | 'MARKET';
    auto_tp_enabled: boolean;
    auto_tp_value: number;
    auto_tp_limit: boolean;
    auto_sl_enabled: boolean;
    auto_sl_value: number;
    unique_shortcuts: boolean;
}

// Terminal settings
export interface TerminalSettings {
    auto_login: boolean;
    push_notifications: boolean;
    notification_filter: 'all' | 'critical' | 'special' | 'both';
    full_size_media: boolean;
    disable_media: boolean;
    freeze_on_hover: boolean;
    share_trades: boolean;
    show_profit: boolean;
}

// Chart settings
export interface ChartSettings {
    default_timeframe: string;
    order_history: boolean;
    up_candle_color: string;
    down_candle_color: string;
    chart_tickers: string[];
    favorite_tickers: string[];
}

// News provider toggles (keys stored separately in credentials_store)
export interface NewsProviderToggles {
    phoenix_enabled: boolean;
    tree_enabled: boolean;
    synoptic_enabled: boolean;
    groq_enabled: boolean;
}

// News display settings
export interface NewsDisplaySettings {
    deduplicator: boolean;
    text_shortener: boolean;
    directional_highlight: boolean;
    price_movement_highlight: boolean;
    price_movement_threshold: number;
    price_movement_notification: boolean;
    hide_tickerless: boolean;
    translation_enabled: boolean;
    translation_language: string;
    delay_threshold: number;
    history_limit: number;
    auto_clear_seconds: number;
    font_size: number;
}

// Keyword lists
export interface KeywordSettings {
    blacklisted_words: string[];
    blacklisted_coins: string[];
    critical_words: string[];
    special_words: string[];
    custom_mappings: string[];
    blacklisted_sources: string[];
}

// Custom WebSocket configuration
export interface CustomWebSocket {
    id: string;
    name: string;
    url: string;
    login_message: string;
    title_key: string;
    body_key: string;
    icon_key: string;
    timestamp_key: string;
    link_key: string;
}

// Botting settings
export interface BottingSettings {
    enabled: boolean;
    cooldown_hours: number;
    mobile_notification_enabled: boolean;
    ntfy_topic: string;
    auto_pause_enabled: boolean;
    auto_pause_timeframe: string;
    auto_pause_threshold: number;
}

// Shortcut configuration
export interface ShortcutBinding {
    modifier1: 'CTRL' | 'SHIFT' | 'NONE';
    modifier2: 'CTRL' | 'SHIFT' | 'NONE';
    key: string;
}

export interface ShortcutSettings {
    disabled: boolean;
    nuke_all: ShortcutBinding;
    bindings: Record<string, ShortcutBinding>;
}

// Complete settings object (syncs to server - NO sensitive data)
export interface UserSettings {
    exchange: ExchangePreferences;
    trading: TradingSettings;
    terminal: TerminalSettings;
    chart: ChartSettings;
    news_providers: NewsProviderToggles;
    news_display: NewsDisplaySettings;
    keywords: KeywordSettings;
    custom_websockets: CustomWebSocket[];
    botting: BottingSettings;
    shortcuts: ShortcutSettings;
    ui_zoom: number;
}

// Encrypted settings blob (for server sync)
export interface EncryptedSettings {
    iv: string;
    auth_tag: string;
    data: string;
}

// Settings state
export type SettingsStatus = 'loading' | 'ready' | 'saving' | 'error';

export interface SettingsState {
    status: SettingsStatus;
    settings: UserSettings | null;
    error: string | null;
    last_synced: number | null;
}

// UI state
export interface SettingsUIState {
    drawer_open: boolean;
    active_section: string | null;
    exchange_modal_open: boolean;
    exchange_modal_id: ExchangeId | null;
}
```

### 1.2 Layout Types Update (`src/types/layout.types.ts`)

Add sync metadata to existing types:

```typescript
// Add to existing Rig interface
export interface Rig {
    id: string;
    name: string;
    blocks: Block[];
    layouts: { lg: BlockLayout[] };
    created_at: number;
    updated_at?: number;  // NEW: for sync conflict resolution
}

// Add to existing RigsState interface
export interface RigsState {
    rigs: Record<string, Rig>;
    active_rig_id: string;
    last_synced?: number;  // NEW: for sync tracking
}
```

### 1.3 Exchange Service (`src/services/exchange/exchange.service.ts`)

```typescript
import { get_auth_headers } from '@/services/auth/auth.service';
import type { ExchangeId } from '@/types/settings.types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ExchangeValidationResult {
    valid: boolean;
    error: string | null;
    balance?: number;
}

export async function validate_exchange_credentials(
    exchange_id: ExchangeId,
    credentials: {
        api_key: string;
        api_secret: string;
        passphrase?: string;
        wallet_address?: string;
        private_key?: string;
    }
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

export function get_exchange_fields(exchange_id: ExchangeId): string[] {
    switch (exchange_id) {
        case 'bybit':
        case 'binance':
            return ['api_key', 'api_secret', 'hedge_mode'];
        case 'blofin':
            return ['api_key', 'api_secret', 'passphrase', 'hedge_mode'];
        case 'hyperliquid':
            return ['wallet_address', 'private_key'];
        default:
            return ['api_key', 'api_secret'];
    }
}
```

### 1.4 Layout Sync Service (`src/services/layout/layout_sync.service.ts`)

```typescript
import { get_auth_headers } from '@/services/auth/auth.service';
import type { RigsState } from '@/types/layout.types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function sync_layouts_to_server(layouts: RigsState): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/layouts/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ layouts }),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to sync layouts to server:', error);
        return false;
    }
}

export async function fetch_layouts_from_server(): Promise<RigsState | null> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/layouts/`, {
            method: 'GET',
            headers: get_auth_headers(),
        });

        if (!response.ok) return null;

        const result = await response.json();
        return result.data?.layouts || null;
    } catch (error) {
        console.error('Failed to fetch layouts from server:', error);
        return null;
    }
}

export function merge_layouts(local: RigsState, server: RigsState): RigsState {
    // Use last_synced/updated_at to determine which is newer
    // If server has rigs that local doesn't, add them
    // If both have same rig, use the one with newer updated_at

    const merged_rigs: Record<string, Rig> = { ...local.rigs };

    for (const [id, server_rig] of Object.entries(server.rigs)) {
        const local_rig = local.rigs[id];

        if (!local_rig) {
            // Server has rig that local doesn't
            merged_rigs[id] = server_rig;
        } else if ((server_rig.updated_at || 0) > (local_rig.updated_at || 0)) {
            // Server rig is newer
            merged_rigs[id] = server_rig;
        }
        // Otherwise keep local (it's newer or same)
    }

    return {
        rigs: merged_rigs,
        active_rig_id: local.active_rig_id,
        last_synced: Date.now(),
    };
}
```

---

## Phase 2: Settings Store with Server Sync

### 2.1 Settings Service (`src/services/settings/settings.service.ts`)

```typescript
import { get_auth_headers } from '@/services/auth/auth.service';
import type { UserSettings, EncryptedSettings } from '@/types/settings.types';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from './settings.constants';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Encrypt settings via server
export async function encrypt_settings(settings: UserSettings): Promise<EncryptedSettings | null> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/settings/encrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ settings: JSON.stringify(settings) }),
        });

        if (!response.ok) return null;

        const result = await response.json();
        const encrypted = result.data.encrypted;

        return {
            iv: encrypted.iv,
            auth_tag: encrypted.auth_tag || encrypted.authTag,
            data: encrypted.data,
        };
    } catch (error) {
        console.error('Failed to encrypt settings:', error);
        return null;
    }
}

// Decrypt settings via server
export async function decrypt_settings(encrypted: EncryptedSettings): Promise<UserSettings | null> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/settings/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({
                encrypted: {
                    iv: encrypted.iv,
                    auth_tag: encrypted.auth_tag,
                    data: encrypted.data,
                },
            }),
        });

        if (!response.ok) return null;

        const result = await response.json();
        return JSON.parse(result.data.decrypted);
    } catch (error) {
        console.error('Failed to decrypt settings:', error);
        return null;
    }
}

// Strip credentials before syncing to server
function strip_credentials(settings: UserSettings): UserSettings {
    const cleaned = JSON.parse(JSON.stringify(settings)) as UserSettings;

    for (const exchange_id of Object.keys(cleaned.exchange.exchanges)) {
        const exchange = cleaned.exchange.exchanges[exchange_id as keyof typeof cleaned.exchange.exchanges];
        exchange.api_key = '';
        exchange.api_secret = '';
        if ('passphrase' in exchange) exchange.passphrase = '';
        if ('wallet_address' in exchange) exchange.wallet_address = '';
        if ('private_key' in exchange) exchange.private_key = '';
    }

    cleaned.news_providers.phoenix_key = '';
    cleaned.news_providers.tree_key = '';
    cleaned.news_providers.synoptic_key = '';
    cleaned.news_providers.groq_key = '';

    return cleaned;
}

// Sync settings to server (without credentials)
export async function sync_to_server(settings: UserSettings): Promise<boolean> {
    try {
        const cleaned = strip_credentials(settings);
        const encrypted = await encrypt_settings(cleaned);
        if (!encrypted) return false;

        const response = await fetch(`${API_BASE}/v1/app/settings/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ settings: encrypted }),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to sync settings to server:', error);
        return false;
    }
}

// Fetch settings from server
export async function fetch_from_server(): Promise<UserSettings | null> {
    try {
        const response = await fetch(`${API_BASE}/v1/app/settings/`, {
            method: 'GET',
            headers: get_auth_headers(),
        });

        if (!response.ok) return null;

        const result = await response.json();
        if (!result.data?.settings) return null;

        const encrypted = result.data.settings as EncryptedSettings;
        return await decrypt_settings(encrypted);
    } catch (error) {
        console.error('Failed to fetch settings from server:', error);
        return null;
    }
}

// Load settings from localStorage
export function load_from_storage(): UserSettings | null {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Failed to load settings from storage:', error);
        return null;
    }
}

// Save settings to localStorage
export function save_to_storage(settings: UserSettings): boolean {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Failed to save settings to storage:', error);
        return false;
    }
}

// Merge server settings with local (local credentials take precedence)
export function merge_settings(local: UserSettings, server: UserSettings): UserSettings {
    const merged = { ...server };

    // Preserve local credentials (server has them stripped)
    merged.exchange.exchanges = local.exchange.exchanges;
    merged.news_providers = local.news_providers;

    return merged;
}

// Export settings as backup file
export function export_backup(settings: UserSettings): void {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `247terminal_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import settings from backup file
export async function import_backup(file: File): Promise<UserSettings | null> {
    try {
        const text = await file.text();
        const settings = JSON.parse(text) as UserSettings;
        return { ...DEFAULT_SETTINGS, ...settings };
    } catch (error) {
        console.error('Failed to import backup:', error);
        return null;
    }
}
```

### 2.2 Settings Store (`src/stores/settings_store.ts`)

```typescript
import { signal, computed } from '@preact/signals';
import type { UserSettings, SettingsState, SettingsUIState, ExchangeId } from '@/types/settings.types';
import { DEFAULT_SETTINGS } from '@/services/settings/settings.constants';
import * as settings_service from '@/services/settings/settings.service';

// State
export const settings_state = signal<SettingsState>({
    status: 'loading',
    settings: null,
    error: null,
    last_synced: null,
});

// UI State (drawer, modals)
export const settings_ui = signal<SettingsUIState>({
    drawer_open: false,
    active_section: null,
    exchange_modal_open: false,
    exchange_modal_id: null,
});

// Computed
export const settings = computed(() => settings_state.value.settings);
export const is_loading = computed(() => settings_state.value.status === 'loading');
export const is_ready = computed(() => settings_state.value.status === 'ready');

// Section-specific computed
export const exchange_settings = computed(() => settings.value?.exchange ?? DEFAULT_SETTINGS.exchange);
export const trading_settings = computed(() => settings.value?.trading ?? DEFAULT_SETTINGS.trading);
export const terminal_settings = computed(() => settings.value?.terminal ?? DEFAULT_SETTINGS.terminal);
export const chart_settings = computed(() => settings.value?.chart ?? DEFAULT_SETTINGS.chart);
export const news_provider_settings = computed(() => settings.value?.news_providers ?? DEFAULT_SETTINGS.news_providers);
export const news_display_settings = computed(() => settings.value?.news_display ?? DEFAULT_SETTINGS.news_display);
export const keyword_settings = computed(() => settings.value?.keywords ?? DEFAULT_SETTINGS.keywords);
export const botting_settings = computed(() => settings.value?.botting ?? DEFAULT_SETTINGS.botting);
export const shortcut_settings = computed(() => settings.value?.shortcuts ?? DEFAULT_SETTINGS.shortcuts);

// Exchange connection status (for header icons)
export const exchange_connection_status = computed(() => {
    const exchanges = exchange_settings.value.exchanges;
    return {
        bybit: exchanges.bybit.connected,
        binance: exchanges.binance.connected,
        blofin: exchanges.blofin.connected,
        hyperliquid: exchanges.hyperliquid.connected,
    };
});

// Debounced sync
let sync_timeout: ReturnType<typeof setTimeout> | null = null;

function schedule_sync(): void {
    if (sync_timeout) clearTimeout(sync_timeout);
    sync_timeout = setTimeout(async () => {
        const current = settings.value;
        if (!current) return;
        await settings_service.sync_to_server(current);
        settings_state.value = {
            ...settings_state.value,
            last_synced: Date.now(),
        };
    }, 2000);
}

// UI Actions
export function open_settings_drawer(section?: string): void {
    settings_ui.value = {
        ...settings_ui.value,
        drawer_open: true,
        active_section: section || settings_ui.value.active_section,
    };
}

export function close_settings_drawer(): void {
    settings_ui.value = {
        ...settings_ui.value,
        drawer_open: false,
    };
}

export function set_active_section(section: string): void {
    settings_ui.value = {
        ...settings_ui.value,
        active_section: section,
    };
}

export function open_exchange_modal(exchange_id: ExchangeId): void {
    settings_ui.value = {
        ...settings_ui.value,
        exchange_modal_open: true,
        exchange_modal_id: exchange_id,
    };
}

export function close_exchange_modal(): void {
    settings_ui.value = {
        ...settings_ui.value,
        exchange_modal_open: false,
        exchange_modal_id: null,
    };
}

// Initialize settings
export async function initialize_settings(): Promise<void> {
    settings_state.value = { status: 'loading', settings: null, error: null, last_synced: null };

    const local = settings_service.load_from_storage();

    if (local) {
        settings_state.value = {
            status: 'ready',
            settings: local,
            error: null,
            last_synced: null,
        };
    }

    const server = await settings_service.fetch_from_server();

    if (server) {
        const merged = local
            ? settings_service.merge_settings(local, server)
            : server;

        settings_service.save_to_storage(merged);
        settings_state.value = {
            status: 'ready',
            settings: merged,
            error: null,
            last_synced: Date.now(),
        };
    } else if (!local) {
        settings_service.save_to_storage(DEFAULT_SETTINGS);
        settings_state.value = {
            status: 'ready',
            settings: DEFAULT_SETTINGS,
            error: null,
            last_synced: null,
        };
    }
}

// Update settings (partial update)
export function update_settings<K extends keyof UserSettings>(
    section: K,
    updates: Partial<UserSettings[K]>
): void {
    const current = settings.value;
    if (!current) return;

    const updated: UserSettings = {
        ...current,
        [section]: {
            ...current[section],
            ...updates,
        },
    };

    settings_state.value = {
        ...settings_state.value,
        settings: updated,
    };

    settings_service.save_to_storage(updated);
    schedule_sync();
}

// Update exchange credentials and connection status
export function update_exchange(
    exchange_id: ExchangeId,
    updates: Partial<ExchangeCredentials>
): void {
    const current = settings.value;
    if (!current) return;

    const updated: UserSettings = {
        ...current,
        exchange: {
            ...current.exchange,
            exchanges: {
                ...current.exchange.exchanges,
                [exchange_id]: {
                    ...current.exchange.exchanges[exchange_id],
                    ...updates,
                },
            },
        },
    };

    settings_state.value = {
        ...settings_state.value,
        settings: updated,
    };

    settings_service.save_to_storage(updated);
    schedule_sync();
}

// Set preferred exchange
export function set_preferred_exchange(exchange_id: ExchangeId): void {
    const current = settings.value;
    if (!current) return;

    const updated: UserSettings = {
        ...current,
        exchange: {
            ...current.exchange,
            preferred: exchange_id,
        },
    };

    settings_state.value = {
        ...settings_state.value,
        settings: updated,
    };

    settings_service.save_to_storage(updated);
    schedule_sync();
}

// Reset to defaults
export function reset_settings(): void {
    settings_state.value = {
        status: 'ready',
        settings: { ...DEFAULT_SETTINGS },
        error: null,
        last_synced: null,
    };

    settings_service.save_to_storage(DEFAULT_SETTINGS);
    schedule_sync();
}

// Export/Import
export function export_settings_backup(): void {
    const current = settings.value;
    if (!current) return;
    settings_service.export_backup(current);
}

export async function import_settings_backup(file: File): Promise<boolean> {
    const imported = await settings_service.import_backup(file);
    if (!imported) return false;

    settings_state.value = {
        status: 'ready',
        settings: imported,
        error: null,
        last_synced: null,
    };

    settings_service.save_to_storage(imported);
    schedule_sync();
    return true;
}

// Wipe
export function wipe_settings(): void {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    settings_state.value = {
        status: 'ready',
        settings: { ...DEFAULT_SETTINGS },
        error: null,
        last_synced: null,
    };
}
```

---

## Phase 2.5: Credentials Store (LOCAL ONLY)

### Credentials Store (`src/stores/credentials_store.ts`)

**This store NEVER syncs to server - credentials stay on device only**

```typescript
import { signal, computed } from '@preact/signals';
import type {
    UserCredentials,
    CredentialsState,
    ExchangeId,
    ExchangeCredentials
} from '@/types/credentials.types';

const CREDENTIALS_STORAGE_KEY = '247terminal_credentials';

// Default empty credentials
const DEFAULT_CREDENTIALS: UserCredentials = {
    exchanges: {
        bybit: { api_key: '', api_secret: '', hedge_mode: false, connected: false, last_validated: null },
        binance: { api_key: '', api_secret: '', hedge_mode: false, connected: false, last_validated: null },
        blofin: { api_key: '', api_secret: '', passphrase: '', hedge_mode: false, connected: false, last_validated: null },
        hyperliquid: { api_key: '', api_secret: '', wallet_address: '', private_key: '', hedge_mode: false, connected: false, last_validated: null },
    },
    news_providers: {
        phoenix_key: '',
        tree_key: '',
        synoptic_key: '',
        groq_key: '',
    },
};

// Load from localStorage (sync - credentials are small)
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

// Save to localStorage
function save_to_storage(credentials: UserCredentials): void {
    try {
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
        console.error('Failed to save credentials:', error);
    }
}

// Initialize from storage
const initial_credentials = load_from_storage() || DEFAULT_CREDENTIALS;

// State
export const credentials_state = signal<CredentialsState>({
    credentials: initial_credentials,
    loaded: true,
});

// Computed
export const credentials = computed(() => credentials_state.value.credentials);

// Exchange-specific computed
export const exchange_credentials = computed(() =>
    credentials.value?.exchanges ?? DEFAULT_CREDENTIALS.exchanges
);

export const news_provider_credentials = computed(() =>
    credentials.value?.news_providers ?? DEFAULT_CREDENTIALS.news_providers
);

// Connection status for header icons
export const exchange_connection_status = computed(() => {
    const exchanges = exchange_credentials.value;
    return {
        bybit: exchanges.bybit.connected,
        binance: exchanges.binance.connected,
        blofin: exchanges.blofin.connected,
        hyperliquid: exchanges.hyperliquid.connected,
    };
});

// Get credentials for specific exchange
export function get_exchange_credentials(exchange_id: ExchangeId): ExchangeCredentials {
    return exchange_credentials.value[exchange_id];
}

// Update exchange credentials
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

// Update news provider key
export function update_news_provider_key(
    provider: keyof UserCredentials['news_providers'],
    value: string
): void {
    const current = credentials.value;
    if (!current) return;

    const updated: UserCredentials = {
        ...current,
        news_providers: {
            ...current.news_providers,
            [provider]: value,
        },
    };

    credentials_state.value = {
        credentials: updated,
        loaded: true,
    };

    save_to_storage(updated);
}

// Clear all credentials (for logout or wipe)
export function clear_credentials(): void {
    credentials_state.value = {
        credentials: { ...DEFAULT_CREDENTIALS },
        loaded: true,
    };
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
}

// Check if any exchange is connected
export const has_connected_exchange = computed(() => {
    const status = exchange_connection_status.value;
    return status.bybit || status.binance || status.blofin || status.hyperliquid;
});
```

---

## Phase 3: UI Components

### 3.1 Exchange Dropdown Panel (`src/components/exchange/exchange_panel.tsx`)

**Matches the style of `blocks_menu.tsx` and `rig_selector.tsx`**

```typescript
import { useState, useRef, useEffect } from 'preact/hooks';
import { exchange_credentials, update_exchange_credentials } from '@/stores/credentials_store';
import { validate_exchange_credentials, get_exchange_fields } from '@/services/exchange/exchange.service';
import type { ExchangeId } from '@/types/credentials.types';

const EXCHANGE_NAMES: Record<ExchangeId, string> = {
    bybit: 'BYBIT',
    binance: 'BINANCE',
    blofin: 'BLOFIN',
    hyperliquid: 'HYPERLIQUID',
};

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

    // Close on Escape
    useEffect(() => {
        const handle_keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') on_close();
        };
        window.addEventListener('keydown', handle_keydown);
        return () => window.removeEventListener('keydown', handle_keydown);
    }, [on_close]);

    // Close on click outside
    useEffect(() => {
        const handle_click_outside = (e: MouseEvent) => {
            if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
                on_close();
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, [on_close]);

    if (!is_open) return null;

    async function handle_test(): Promise<void> {
        set_testing(true);
        set_error(null);

        const result = await validate_exchange_credentials(exchange_id, {
            api_key: form_data.api_key,
            api_secret: form_data.api_secret,
            passphrase: form_data.passphrase,
            wallet_address: form_data.wallet_address,
            private_key: form_data.private_key,
        });

        set_testing(false);

        if (!result.valid) {
            set_error(result.error || 'Validation failed');
            return;
        }

        update_exchange_credentials(exchange_id, {
            ...form_data,
            connected: true,
            last_validated: Date.now(),
        });

        on_close();
    }

    function handle_disconnect(): void {
        update_exchange_credentials(exchange_id, {
            api_key: '',
            api_secret: '',
            passphrase: '',
            wallet_address: '',
            private_key: '',
            connected: false,
            last_validated: null,
        });
        set_form_data({
            api_key: '',
            api_secret: '',
            passphrase: '',
            wallet_address: '',
            private_key: '',
            hedge_mode: false,
        });
    }

    return (
        <div
            ref={container_ref}
            class="fixed top-10 left-0 mt-1 w-64 bg-base-100 rounded-r shadow-lg z-50"
        >
            {/* Header */}
            <div class="px-3 py-2 border-b border-base-300">
                <span class="text-xs font-medium tracking-wide text-base-content">
                    {EXCHANGE_NAMES[exchange_id]} SETUP
                </span>
            </div>

            {/* Form */}
            <div class="p-3 space-y-3">
                {fields.includes('api_key') && (
                    <div>
                        <label class="text-xs text-base-content/60 tracking-wide">API KEY</label>
                        <input
                            type={show_keys ? 'text' : 'password'}
                            class="w-full mt-1 bg-base-300 px-2 py-1.5 rounded text-xs text-base-content outline-none"
                            value={form_data.api_key}
                            onInput={(e) => set_form_data(prev => ({ ...prev, api_key: (e.target as HTMLInputElement).value }))}
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
                            onInput={(e) => set_form_data(prev => ({ ...prev, api_secret: (e.target as HTMLInputElement).value }))}
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
                            onInput={(e) => set_form_data(prev => ({ ...prev, passphrase: (e.target as HTMLInputElement).value }))}
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
                            onInput={(e) => set_form_data(prev => ({ ...prev, wallet_address: (e.target as HTMLInputElement).value }))}
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
                            onInput={(e) => set_form_data(prev => ({ ...prev, private_key: (e.target as HTMLInputElement).value }))}
                            placeholder="Enter private key..."
                        />
                    </div>
                )}

                {/* Show/Hide toggle */}
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
                            onChange={(e) => set_form_data(prev => ({ ...prev, hedge_mode: (e.target as HTMLInputElement).checked }))}
                        />
                        <span class="text-xs text-base-content tracking-wide">HEDGE MODE</span>
                    </label>
                )}

                {error && (
                    <div class="text-xs text-error">{error}</div>
                )}
            </div>

            {/* Actions */}
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

### 3.2 Settings Drawer (`src/components/settings/settings_drawer.tsx`)

```typescript
import { settings_ui, close_settings_drawer, set_active_section } from '@/stores/settings_store';
import { TradingSection } from './trading_section';
import { TerminalSection } from './terminal_section';
import { ChartSection } from './chart_section';
import { NewsSection } from './news_section';
import { KeywordSection } from './keyword_section';
import { ShortcutsSection } from './shortcuts_section';
import { BottingSection } from './botting_section';
import { BackupSection } from './backup_section';

const SECTIONS = [
    { id: 'trading', label: 'Trading', component: TradingSection },
    { id: 'terminal', label: 'Terminal', component: TerminalSection },
    { id: 'chart', label: 'Chart', component: ChartSection },
    { id: 'news', label: 'News', component: NewsSection },
    { id: 'keywords', label: 'Keywords', component: KeywordSection },
    { id: 'shortcuts', label: 'Shortcuts', component: ShortcutsSection },
    { id: 'botting', label: 'Botting', component: BottingSection },
    { id: 'backup', label: 'Backup', component: BackupSection },
];

export function SettingsDrawer() {
    const { drawer_open, active_section } = settings_ui.value;

    if (!drawer_open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                class="fixed inset-0 bg-black/50 z-40"
                onClick={close_settings_drawer}
            />

            {/* Drawer */}
            <div class="fixed right-0 top-0 h-full w-80 bg-base-200 z-50 shadow-xl overflow-y-auto">
                <div class="p-4 border-b border-base-300 flex justify-between items-center sticky top-0 bg-base-200">
                    <h2 class="text-lg font-semibold">Settings</h2>
                    <button
                        class="btn btn-sm btn-circle btn-ghost"
                        onClick={close_settings_drawer}
                    >
                        ✕
                    </button>
                </div>

                <div class="p-2">
                    {SECTIONS.map(({ id, label, component: Component }) => (
                        <div key={id} class="collapse collapse-arrow bg-base-100 mb-1">
                            <input
                                type="radio"
                                name="settings-accordion"
                                checked={active_section === id}
                                onChange={() => set_active_section(id)}
                            />
                            <div class="collapse-title font-medium">
                                {label}
                            </div>
                            <div class="collapse-content">
                                <Component />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
```

### 3.3 Header Integration Update

Update `header.tsx` to use the settings store:

```typescript
import { exchange_connection_status, open_exchange_modal, open_settings_drawer } from '@/stores/settings_store';
import { ExchangeModal } from '@/components/exchange/exchange_modal';
import { SettingsDrawer } from '@/components/settings/settings_drawer';

export function Header() {
    const connection_status = exchange_connection_status.value;

    const exchanges = [
        { id: 'blofin', name: 'Blofin', connected: connection_status.blofin, icon: get_exchange_icon('blofin') },
        { id: 'binance', name: 'Binance', connected: connection_status.binance, icon: get_exchange_icon('binance') },
        { id: 'hyperliquid', name: 'Hyperliquid', connected: connection_status.hyperliquid, icon: get_exchange_icon('hyperliquid') },
        { id: 'bybit', name: 'Bybit', connected: connection_status.bybit, icon: get_exchange_icon('bybit') },
    ];

    return (
        <>
            <header class="h-10 bg-theme-header flex items-center px-3 shrink-0">
                <div class="flex-1 flex items-center">
                    <Exchanges
                        exchanges={exchanges}
                        on_exchange_click={(id) => open_exchange_modal(id as ExchangeId)}
                    />
                </div>
                <div class="flex items-center gap-3">
                    <ConnectionStatus />
                    <CommandBar on_submit={handle_command} />
                    <SettingsButton on_click={() => open_settings_drawer()} />
                </div>
                <div class="flex-1 flex items-center justify-end gap-2">
                    <LayoutLockToggle />
                    <ThemeToggle />
                    <BlocksMenu />
                    <RigSelector />
                </div>
            </header>

            {/* Modals and Drawers rendered at root level */}
            <ExchangeModal />
            <SettingsDrawer />
        </>
    );
}
```

---

## Phase 4: Layout Store Server Sync Integration

Update `layout_store.ts` to add server sync:

```typescript
// Add to existing layout_store.ts

import * as layout_sync from '@/services/layout/layout_sync.service';

// Debounced sync
let layout_sync_timeout: ReturnType<typeof setTimeout> | null = null;

function schedule_layout_sync(): void {
    if (layout_sync_timeout) clearTimeout(layout_sync_timeout);
    layout_sync_timeout = setTimeout(async () => {
        const current = rigs_state.value;
        await layout_sync.sync_layouts_to_server(current);
    }, 3000);
}

// Modify save_to_storage to also trigger sync
function save_to_storage(state: RigsState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        schedule_layout_sync(); // Add server sync
    } catch (e) {
        console.error('Failed to save rigs to storage:', e);
    }
}

// Add initialization function that merges with server
export async function initialize_layouts(): Promise<void> {
    const local = load_from_storage();
    const server = await layout_sync.fetch_layouts_from_server();

    if (server && local) {
        const merged = layout_sync.merge_layouts(local, server);
        rigs_state.value = merged;
        save_to_storage(merged);
    } else if (server) {
        rigs_state.value = server;
        save_to_storage(server);
    }
    // If only local exists, keep it (already loaded)
}
```

---

## Implementation Order

### Week 1: Foundation
1. Create `settings.types.ts`
2. Create `settings.constants.ts`
3. Create `settings.service.ts`
4. Create `settings_store.ts`

### Week 2: Exchange Modal
1. Create `exchange.service.ts`
2. Create `exchange_modal.tsx`
3. Update `header.tsx` integration
4. Test exchange validation flow

### Week 3: Settings Drawer
1. Create `settings_drawer.tsx`
2. Create section components (trading, terminal, chart, etc.)
3. Implement auto-save on change
4. Test drawer functionality

### Week 4: Layout Sync & Polish
1. Create `layout_sync.service.ts`
2. Update `layout_store.ts` with sync
3. Implement v1 migration
4. Testing and polish

---

## Key Differences from Original Plan

| Aspect | Original | Revised |
|--------|----------|---------|
| Exchange Settings | Part of settings page | Modal from header icons |
| Settings UI | Separate page | Right-side drawer |
| Layout Sync | No server sync | Server sync with merge |
| Visual Feedback | None | Icon turns red when connected |
| API Validation | None | Test connection before saving |
