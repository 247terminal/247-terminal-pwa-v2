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

### 1.2 Settings Constants (`src/services/settings/settings.constants.ts`)

```typescript
import type { UserSettings, ExchangeId } from '@/types/settings.types';

export const SETTINGS_STORAGE_KEY = '247terminal_settings_v2';
export const CREDENTIALS_STORAGE_KEY = '247terminal_credentials';
export const RIGS_STORAGE_KEY = '247terminal_rigs';

export const EXCHANGE_IDS: ExchangeId[] = ['bybit', 'binance', 'blofin', 'hyperliquid'];

export const TIMEFRAME_OPTIONS = [
    { value: '1s', label: '1s' },
    { value: '1m', label: '1m' },
    { value: '3m', label: '3m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1H' },
    { value: '2h', label: '2H' },
    { value: '4h', label: '4H' },
    { value: '6h', label: '6H' },
    { value: '12h', label: '12H' },
    { value: 'D', label: 'D' },
    { value: 'W', label: 'W' },
    { value: 'M', label: 'M' },
] as const;

export const NOTIFICATION_FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'critical', label: 'Critical Only' },
    { value: 'special', label: 'Special Only' },
    { value: 'both', label: 'Critical & Special' },
] as const;

export const SLIPPAGE_OPTIONS = [
    { value: 1, label: '1%' },
    { value: 2, label: '2%' },
    { value: 3, label: '3%' },
    { value: 5, label: '5%' },
    { value: 'MARKET', label: 'Market' },
] as const;

export const BOT_PROTECTION_TIMEFRAMES = [
    { value: '1', label: '1 Hour' },
    { value: '4', label: '4 Hours' },
    { value: '24', label: '24 Hours' },
] as const;

export const DEFAULT_SETTINGS: UserSettings = {
    exchange: {
        preferred: 'bybit',
        enabled_exchanges: ['bybit'],
    },
    trading: {
        sizes: [100, 500, 1000, 5000],
        size_count: 4,
        slippage: 3,
        auto_tp_enabled: false,
        auto_tp_value: 5,
        auto_tp_limit: false,
        auto_sl_enabled: false,
        auto_sl_value: 3,
        unique_shortcuts: false,
    },
    terminal: {
        auto_login: false,
        push_notifications: true,
        notification_filter: 'all',
        full_size_media: false,
        disable_media: false,
        freeze_on_hover: true,
        share_trades: false,
        show_profit: false,
    },
    chart: {
        default_timeframe: '5m',
        order_history: true,
        up_candle_color: '#00C853',
        down_candle_color: '#FF1744',
        chart_tickers: [],
        favorite_tickers: [],
    },
    news_providers: {
        phoenix_enabled: false,
        tree_enabled: false,
        synoptic_enabled: false,
        groq_enabled: false,
    },
    news_display: {
        deduplicator: true,
        text_shortener: false,
        directional_highlight: true,
        price_movement_highlight: true,
        price_movement_threshold: 5,
        price_movement_notification: false,
        hide_tickerless: false,
        translation_enabled: false,
        translation_language: 'en',
        delay_threshold: 5000,
        history_limit: 100,
        auto_clear_seconds: 0,
        font_size: 12,
    },
    keywords: {
        blacklisted_words: [],
        blacklisted_coins: [],
        critical_words: [],
        special_words: [],
        custom_mappings: [],
        blacklisted_sources: [],
    },
    custom_websockets: [],
    botting: {
        enabled: false,
        cooldown_hours: 1,
        mobile_notification_enabled: false,
        ntfy_topic: '',
        auto_pause_enabled: false,
        auto_pause_timeframe: '1',
        auto_pause_threshold: 10,
    },
    shortcuts: {
        disabled: false,
        nuke_all: { modifier1: 'CTRL', modifier2: 'SHIFT', key: 'N' },
        bindings: {},
    },
    ui_zoom: 1,
};
```

### 1.3 Layout Types Update (`src/types/layout.types.ts`)

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

### 3.3 Trading Section (`src/components/settings/trading_section.tsx`)

```typescript
import { trading_settings, update_settings } from '@/stores/settings_store';
import { SLIPPAGE_OPTIONS } from '@/services/settings/settings.constants';
import type { TradingSettings } from '@/types/settings.types';

export function TradingSection() {
    const settings = trading_settings.value;

    function handle_size_change(index: number, value: string): void {
        const num_value = parseInt(value, 10);
        if (isNaN(num_value) || num_value < 0) return;

        const new_sizes = [...settings.sizes] as [number, number, number, number];
        new_sizes[index] = num_value;
        update_settings('trading', { sizes: new_sizes });
    }

    function handle_toggle(key: keyof TradingSettings, value: boolean): void {
        update_settings('trading', { [key]: value });
    }

    function handle_number_change(key: keyof TradingSettings, value: string): void {
        const num_value = parseFloat(value);
        if (isNaN(num_value)) return;
        update_settings('trading', { [key]: num_value });
    }

    return (
        <div class="space-y-4 pt-2">
            <div>
                <label class="text-xs text-base-content/60 mb-2 block">POSITION SIZES (USDT)</label>
                <div class="grid grid-cols-4 gap-2">
                    {settings.sizes.map((size, index) => (
                        <input
                            key={index}
                            type="number"
                            class="input input-sm input-bordered w-full text-xs"
                            value={size}
                            onInput={(e) => handle_size_change(index, (e.target as HTMLInputElement).value)}
                        />
                    ))}
                </div>
            </div>

            <div>
                <label class="text-xs text-base-content/60 mb-1 block">SLIPPAGE</label>
                <select
                    class="select select-sm select-bordered w-full text-xs"
                    value={settings.slippage}
                    onChange={(e) => {
                        const value = (e.target as HTMLSelectElement).value;
                        update_settings('trading', {
                            slippage: value === 'MARKET' ? 'MARKET' : parseInt(value, 10),
                        });
                    }}
                >
                    {SLIPPAGE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            <div class="divider text-xs">AUTO TAKE PROFIT</div>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Enable Auto TP</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={settings.auto_tp_enabled}
                    onChange={(e) => handle_toggle('auto_tp_enabled', (e.target as HTMLInputElement).checked)}
                />
            </label>

            {settings.auto_tp_enabled && (
                <>
                    <div class="flex items-center gap-2">
                        <input
                            type="number"
                            class="input input-sm input-bordered flex-1 text-xs"
                            value={settings.auto_tp_value}
                            onInput={(e) => handle_number_change('auto_tp_value', (e.target as HTMLInputElement).value)}
                        />
                        <span class="text-xs text-base-content/60">%</span>
                    </div>

                    <label class="flex items-center justify-between cursor-pointer">
                        <span class="text-xs">Use Limit Orders</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm"
                            checked={settings.auto_tp_limit}
                            onChange={(e) => handle_toggle('auto_tp_limit', (e.target as HTMLInputElement).checked)}
                        />
                    </label>
                </>
            )}

            <div class="divider text-xs">AUTO STOP LOSS</div>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Enable Auto SL</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={settings.auto_sl_enabled}
                    onChange={(e) => handle_toggle('auto_sl_enabled', (e.target as HTMLInputElement).checked)}
                />
            </label>

            {settings.auto_sl_enabled && (
                <div class="flex items-center gap-2">
                    <input
                        type="number"
                        class="input input-sm input-bordered flex-1 text-xs"
                        value={settings.auto_sl_value}
                        onInput={(e) => handle_number_change('auto_sl_value', (e.target as HTMLInputElement).value)}
                    />
                    <span class="text-xs text-base-content/60">%</span>
                </div>
            )}

            <div class="divider" />

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Unique Coin Shortcuts</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={settings.unique_shortcuts}
                    onChange={(e) => handle_toggle('unique_shortcuts', (e.target as HTMLInputElement).checked)}
                />
            </label>
        </div>
    );
}
```

### 3.4 Terminal Section (`src/components/settings/terminal_section.tsx`)

```typescript
import { terminal_settings, update_settings } from '@/stores/settings_store';
import { NOTIFICATION_FILTER_OPTIONS } from '@/services/settings/settings.constants';
import type { TerminalSettings } from '@/types/settings.types';

export function TerminalSection() {
    const settings = terminal_settings.value;

    function handle_toggle(key: keyof TerminalSettings, value: boolean): void {
        update_settings('terminal', { [key]: value });
    }

    return (
        <div class="space-y-4 pt-2">
            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Auto Login</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={settings.auto_login}
                    onChange={(e) => handle_toggle('auto_login', (e.target as HTMLInputElement).checked)}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Push Notifications</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={settings.push_notifications}
                    onChange={(e) => handle_toggle('push_notifications', (e.target as HTMLInputElement).checked)}
                />
            </label>

            {settings.push_notifications && (
                <div>
                    <label class="text-xs text-base-content/60 mb-1 block">NOTIFICATION FILTER</label>
                    <select
                        class="select select-sm select-bordered w-full text-xs"
                        value={settings.notification_filter}
                        onChange={(e) => update_settings('terminal', {
                            notification_filter: (e.target as HTMLSelectElement).value as TerminalSettings['notification_filter'],
                        })}
                    >
                        {NOTIFICATION_FILTER_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
            )}

            <div class="divider text-xs">MEDIA</div>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Full Size Media</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={settings.full_size_media}
                    onChange={(e) => handle_toggle('full_size_media', (e.target as HTMLInputElement).checked)}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Disable Media</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={settings.disable_media}
                    onChange={(e) => handle_toggle('disable_media', (e.target as HTMLInputElement).checked)}
                />
            </label>

            <div class="divider text-xs">BEHAVIOR</div>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Freeze Feed on Hover</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={settings.freeze_on_hover}
                    onChange={(e) => handle_toggle('freeze_on_hover', (e.target as HTMLInputElement).checked)}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Share Trades in Chat</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={settings.share_trades}
                    onChange={(e) => handle_toggle('share_trades', (e.target as HTMLInputElement).checked)}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Show Dollar Profit on PnL</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={settings.show_profit}
                    onChange={(e) => handle_toggle('show_profit', (e.target as HTMLInputElement).checked)}
                />
            </label>
        </div>
    );
}
```

### 3.5 Chart Section (`src/components/settings/chart_section.tsx`)

```typescript
import { chart_settings, update_settings } from '@/stores/settings_store';
import { TIMEFRAME_OPTIONS } from '@/services/settings/settings.constants';

export function ChartSection() {
    const settings = chart_settings.value;

    return (
        <div class="space-y-4 pt-2">
            <div>
                <label class="text-xs text-base-content/60 mb-1 block">DEFAULT TIMEFRAME</label>
                <select
                    class="select select-sm select-bordered w-full text-xs"
                    value={settings.default_timeframe}
                    onChange={(e) => update_settings('chart', {
                        default_timeframe: (e.target as HTMLSelectElement).value,
                    })}
                >
                    {TIMEFRAME_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Show Order History</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={settings.order_history}
                    onChange={(e) => update_settings('chart', {
                        order_history: (e.target as HTMLInputElement).checked,
                    })}
                />
            </label>

            <div class="divider text-xs">CANDLE COLORS</div>

            <div class="flex gap-4">
                <div class="flex-1">
                    <label class="text-xs text-base-content/60 mb-1 block">UP CANDLE</label>
                    <input
                        type="color"
                        class="w-full h-8 rounded cursor-pointer"
                        value={settings.up_candle_color}
                        onInput={(e) => update_settings('chart', {
                            up_candle_color: (e.target as HTMLInputElement).value,
                        })}
                    />
                </div>
                <div class="flex-1">
                    <label class="text-xs text-base-content/60 mb-1 block">DOWN CANDLE</label>
                    <input
                        type="color"
                        class="w-full h-8 rounded cursor-pointer"
                        value={settings.down_candle_color}
                        onInput={(e) => update_settings('chart', {
                            down_candle_color: (e.target as HTMLInputElement).value,
                        })}
                    />
                </div>
            </div>

            <div class="divider text-xs">FAVORITE TICKERS</div>

            <div class="text-xs text-base-content/60">
                {settings.favorite_tickers.length === 0 ? (
                    <span>No favorite tickers. Add tickers from the chart header.</span>
                ) : (
                    <div class="flex flex-wrap gap-1">
                        {settings.favorite_tickers.map((ticker) => (
                            <span key={ticker} class="badge badge-sm">{ticker}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
```

### 3.6 News Section (`src/components/settings/news_section.tsx`)

```typescript
import { news_display_settings, news_provider_settings, update_settings } from '@/stores/settings_store';
import { news_provider_credentials, update_news_provider_key } from '@/stores/credentials_store';

export function NewsSection() {
    const display = news_display_settings.value;
    const providers = news_provider_settings.value;
    const credentials = news_provider_credentials.value;

    return (
        <div class="space-y-4 pt-2">
            <div class="divider text-xs m-0">PROVIDERS</div>

            <div class="space-y-3">
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs">Phoenix News</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm toggle-primary"
                            checked={providers.phoenix_enabled}
                            onChange={(e) => update_settings('news_providers', {
                                phoenix_enabled: (e.target as HTMLInputElement).checked,
                            })}
                        />
                    </div>
                    {providers.phoenix_enabled && (
                        <input
                            type="password"
                            class="input input-sm input-bordered w-full text-xs"
                            placeholder="API Key"
                            value={credentials.phoenix_key}
                            onInput={(e) => update_news_provider_key('phoenix_key', (e.target as HTMLInputElement).value)}
                        />
                    )}
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs">Tree of Alpha</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm toggle-primary"
                            checked={providers.tree_enabled}
                            onChange={(e) => update_settings('news_providers', {
                                tree_enabled: (e.target as HTMLInputElement).checked,
                            })}
                        />
                    </div>
                    {providers.tree_enabled && (
                        <input
                            type="password"
                            class="input input-sm input-bordered w-full text-xs"
                            placeholder="API Key"
                            value={credentials.tree_key}
                            onInput={(e) => update_news_provider_key('tree_key', (e.target as HTMLInputElement).value)}
                        />
                    )}
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs">Synoptic</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm toggle-primary"
                            checked={providers.synoptic_enabled}
                            onChange={(e) => update_settings('news_providers', {
                                synoptic_enabled: (e.target as HTMLInputElement).checked,
                            })}
                        />
                    </div>
                    {providers.synoptic_enabled && (
                        <input
                            type="password"
                            class="input input-sm input-bordered w-full text-xs"
                            placeholder="API Key"
                            value={credentials.synoptic_key}
                            onInput={(e) => update_news_provider_key('synoptic_key', (e.target as HTMLInputElement).value)}
                        />
                    )}
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs">Groq AI (Sentiment)</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm toggle-primary"
                            checked={providers.groq_enabled}
                            onChange={(e) => update_settings('news_providers', {
                                groq_enabled: (e.target as HTMLInputElement).checked,
                            })}
                        />
                    </div>
                    {providers.groq_enabled && (
                        <input
                            type="password"
                            class="input input-sm input-bordered w-full text-xs"
                            placeholder="API Key"
                            value={credentials.groq_key}
                            onInput={(e) => update_news_provider_key('groq_key', (e.target as HTMLInputElement).value)}
                        />
                    )}
                </div>
            </div>

            <div class="divider text-xs">DISPLAY</div>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Deduplicator</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={display.deduplicator}
                    onChange={(e) => update_settings('news_display', {
                        deduplicator: (e.target as HTMLInputElement).checked,
                    })}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Text Shortener</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={display.text_shortener}
                    onChange={(e) => update_settings('news_display', {
                        text_shortener: (e.target as HTMLInputElement).checked,
                    })}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Directional Highlighting</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={display.directional_highlight}
                    onChange={(e) => update_settings('news_display', {
                        directional_highlight: (e.target as HTMLInputElement).checked,
                    })}
                />
            </label>

            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Hide Tickerless News</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm"
                    checked={display.hide_tickerless}
                    onChange={(e) => update_settings('news_display', {
                        hide_tickerless: (e.target as HTMLInputElement).checked,
                    })}
                />
            </label>

            <div>
                <label class="text-xs text-base-content/60 mb-1 block">FONT SIZE (px)</label>
                <input
                    type="number"
                    class="input input-sm input-bordered w-full text-xs"
                    value={display.font_size}
                    min={8}
                    max={24}
                    onInput={(e) => update_settings('news_display', {
                        font_size: parseInt((e.target as HTMLInputElement).value, 10) || 12,
                    })}
                />
            </div>

            <div>
                <label class="text-xs text-base-content/60 mb-1 block">HISTORY LIMIT</label>
                <input
                    type="number"
                    class="input input-sm input-bordered w-full text-xs"
                    value={display.history_limit}
                    min={10}
                    max={500}
                    onInput={(e) => update_settings('news_display', {
                        history_limit: parseInt((e.target as HTMLInputElement).value, 10) || 100,
                    })}
                />
            </div>
        </div>
    );
}
```

### 3.7 Keyword Section (`src/components/settings/keyword_section.tsx`)

```typescript
import { useState } from 'preact/hooks';
import { keyword_settings, update_settings } from '@/stores/settings_store';
import type { KeywordSettings } from '@/types/settings.types';

type KeywordListType = 'blacklisted_words' | 'blacklisted_coins' | 'critical_words' | 'special_words' | 'blacklisted_sources';

const KEYWORD_LISTS: { key: KeywordListType; label: string; placeholder: string }[] = [
    { key: 'blacklisted_words', label: 'Blacklisted Words', placeholder: 'Add word to hide...' },
    { key: 'blacklisted_coins', label: 'Blacklisted Coins', placeholder: 'Add coin to hide...' },
    { key: 'critical_words', label: 'Critical Words', placeholder: 'Add critical keyword...' },
    { key: 'special_words', label: 'Special Alert Words', placeholder: 'Add special keyword...' },
    { key: 'blacklisted_sources', label: 'Blacklisted Sources', placeholder: 'Add source to hide...' },
];

export function KeywordSection() {
    const settings = keyword_settings.value;
    const [active_list, set_active_list] = useState<KeywordListType>('blacklisted_words');
    const [input_value, set_input_value] = useState('');

    function handle_add(): void {
        const trimmed = input_value.trim();
        if (!trimmed) return;

        const current_list = settings[active_list];
        if (current_list.includes(trimmed)) {
            set_input_value('');
            return;
        }

        update_settings('keywords', {
            [active_list]: [...current_list, trimmed],
        });
        set_input_value('');
    }

    function handle_remove(list_key: KeywordListType, item: string): void {
        update_settings('keywords', {
            [list_key]: settings[list_key].filter((i) => i !== item),
        });
    }

    function handle_keydown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            handle_add();
        }
    }

    const current_config = KEYWORD_LISTS.find((l) => l.key === active_list);
    const current_items = settings[active_list];

    return (
        <div class="space-y-4 pt-2">
            <div class="tabs tabs-boxed bg-base-300">
                {KEYWORD_LISTS.map(({ key, label }) => (
                    <button
                        key={key}
                        class={`tab tab-xs flex-1 ${active_list === key ? 'tab-active' : ''}`}
                        onClick={() => set_active_list(key)}
                    >
                        {label.split(' ')[0]}
                    </button>
                ))}
            </div>

            <div class="flex gap-2">
                <input
                    type="text"
                    class="input input-sm input-bordered flex-1 text-xs"
                    placeholder={current_config?.placeholder}
                    value={input_value}
                    onInput={(e) => set_input_value((e.target as HTMLInputElement).value)}
                    onKeyDown={handle_keydown}
                />
                <button class="btn btn-sm btn-primary" onClick={handle_add}>
                    Add
                </button>
            </div>

            <div class="max-h-40 overflow-y-auto">
                {current_items.length === 0 ? (
                    <div class="text-xs text-base-content/40 text-center py-4">
                        No items in this list
                    </div>
                ) : (
                    <div class="flex flex-wrap gap-1">
                        {current_items.map((item) => (
                            <span key={item} class="badge badge-sm gap-1">
                                {item}
                                <button
                                    class="text-base-content/40 hover:text-error"
                                    onClick={() => handle_remove(active_list, item)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
```

### 3.8 Shortcuts Section (`src/components/settings/shortcuts_section.tsx`)

```typescript
import { shortcut_settings, update_settings } from '@/stores/settings_store';
import type { ShortcutBinding } from '@/types/settings.types';

const MODIFIER_OPTIONS = ['NONE', 'CTRL', 'SHIFT'] as const;

export function ShortcutsSection() {
    const settings = shortcut_settings.value;

    function update_nuke_all(updates: Partial<ShortcutBinding>): void {
        update_settings('shortcuts', {
            nuke_all: { ...settings.nuke_all, ...updates },
        });
    }

    return (
        <div class="space-y-4 pt-2">
            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs">Disable All Shortcuts</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-error"
                    checked={settings.disabled}
                    onChange={(e) => update_settings('shortcuts', {
                        disabled: (e.target as HTMLInputElement).checked,
                    })}
                />
            </label>

            {!settings.disabled && (
                <>
                    <div class="divider text-xs">NUKE ALL SHORTCUT</div>

                    <div class="space-y-2">
                        <div class="flex gap-2">
                            <select
                                class="select select-sm select-bordered flex-1 text-xs"
                                value={settings.nuke_all.modifier1}
                                onChange={(e) => update_nuke_all({
                                    modifier1: (e.target as HTMLSelectElement).value as ShortcutBinding['modifier1'],
                                })}
                            >
                                {MODIFIER_OPTIONS.map((mod) => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>

                            <span class="text-xs self-center">+</span>

                            <select
                                class="select select-sm select-bordered flex-1 text-xs"
                                value={settings.nuke_all.modifier2}
                                onChange={(e) => update_nuke_all({
                                    modifier2: (e.target as HTMLSelectElement).value as ShortcutBinding['modifier2'],
                                })}
                            >
                                {MODIFIER_OPTIONS.map((mod) => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>

                            <span class="text-xs self-center">+</span>

                            <input
                                type="text"
                                class="input input-sm input-bordered w-16 text-xs text-center uppercase"
                                maxLength={1}
                                value={settings.nuke_all.key}
                                onInput={(e) => update_nuke_all({
                                    key: (e.target as HTMLInputElement).value.toUpperCase(),
                                })}
                            />
                        </div>

                        <div class="text-xs text-base-content/40 text-center">
                            Current: {settings.nuke_all.modifier1 !== 'NONE' ? settings.nuke_all.modifier1 + ' + ' : ''}
                            {settings.nuke_all.modifier2 !== 'NONE' ? settings.nuke_all.modifier2 + ' + ' : ''}
                            {settings.nuke_all.key}
                        </div>
                    </div>

                    <div class="divider text-xs">CUSTOM SHORTCUTS</div>

                    <div class="text-xs text-base-content/40 text-center py-2">
                        Custom shortcuts can be configured per-coin from the trading interface.
                    </div>
                </>
            )}
        </div>
    );
}
```

### 3.9 Botting Section (`src/components/settings/botting_section.tsx`)

```typescript
import { botting_settings, update_settings } from '@/stores/settings_store';
import { BOT_PROTECTION_TIMEFRAMES } from '@/services/settings/settings.constants';
import type { BottingSettings } from '@/types/settings.types';

export function BottingSection() {
    const settings = botting_settings.value;

    function handle_toggle(key: keyof BottingSettings, value: boolean): void {
        update_settings('botting', { [key]: value });
    }

    function handle_number_change(key: keyof BottingSettings, value: string): void {
        const num_value = parseFloat(value);
        if (isNaN(num_value)) return;
        update_settings('botting', { [key]: num_value });
    }

    return (
        <div class="space-y-4 pt-2">
            <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs font-medium">Enable Bot Mode</span>
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-primary"
                    checked={settings.enabled}
                    onChange={(e) => handle_toggle('enabled', (e.target as HTMLInputElement).checked)}
                />
            </label>

            {settings.enabled && (
                <>
                    <div>
                        <label class="text-xs text-base-content/60 mb-1 block">COOLDOWN (hours)</label>
                        <input
                            type="number"
                            class="input input-sm input-bordered w-full text-xs"
                            value={settings.cooldown_hours}
                            min={0}
                            max={24}
                            onInput={(e) => handle_number_change('cooldown_hours', (e.target as HTMLInputElement).value)}
                        />
                    </div>

                    <div class="divider text-xs">NOTIFICATIONS</div>

                    <label class="flex items-center justify-between cursor-pointer">
                        <span class="text-xs">Mobile Notifications (NTFY)</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm"
                            checked={settings.mobile_notification_enabled}
                            onChange={(e) => handle_toggle('mobile_notification_enabled', (e.target as HTMLInputElement).checked)}
                        />
                    </label>

                    {settings.mobile_notification_enabled && (
                        <input
                            type="text"
                            class="input input-sm input-bordered w-full text-xs"
                            placeholder="NTFY Topic Name"
                            value={settings.ntfy_topic}
                            onInput={(e) => update_settings('botting', {
                                ntfy_topic: (e.target as HTMLInputElement).value,
                            })}
                        />
                    )}

                    <div class="divider text-xs">AUTO-PAUSE PROTECTION</div>

                    <label class="flex items-center justify-between cursor-pointer">
                        <span class="text-xs">Enable Auto-Pause</span>
                        <input
                            type="checkbox"
                            class="toggle toggle-sm"
                            checked={settings.auto_pause_enabled}
                            onChange={(e) => handle_toggle('auto_pause_enabled', (e.target as HTMLInputElement).checked)}
                        />
                    </label>

                    {settings.auto_pause_enabled && (
                        <>
                            <div>
                                <label class="text-xs text-base-content/60 mb-1 block">TIMEFRAME</label>
                                <select
                                    class="select select-sm select-bordered w-full text-xs"
                                    value={settings.auto_pause_timeframe}
                                    onChange={(e) => update_settings('botting', {
                                        auto_pause_timeframe: (e.target as HTMLSelectElement).value,
                                    })}
                                >
                                    {BOT_PROTECTION_TIMEFRAMES.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label class="text-xs text-base-content/60 mb-1 block">LOSS THRESHOLD (%)</label>
                                <input
                                    type="number"
                                    class="input input-sm input-bordered w-full text-xs"
                                    value={settings.auto_pause_threshold}
                                    min={1}
                                    max={100}
                                    onInput={(e) => handle_number_change('auto_pause_threshold', (e.target as HTMLInputElement).value)}
                                />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
```

### 3.10 Backup Section (`src/components/settings/backup_section.tsx`)

```typescript
import { useRef, useState } from 'preact/hooks';
import { export_settings_backup, import_settings_backup, wipe_settings, reset_settings } from '@/stores/settings_store';
import { clear_credentials } from '@/stores/credentials_store';

export function BackupSection() {
    const file_input_ref = useRef<HTMLInputElement>(null);
    const [importing, set_importing] = useState(false);
    const [confirm_wipe, set_confirm_wipe] = useState(false);

    async function handle_import(e: Event): Promise<void> {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        set_importing(true);
        const success = await import_settings_backup(file);
        set_importing(false);

        if (success) {
            alert('Settings imported successfully');
        } else {
            alert('Failed to import settings. Invalid file format.');
        }

        if (file_input_ref.current) {
            file_input_ref.current.value = '';
        }
    }

    function handle_wipe(): void {
        if (!confirm_wipe) {
            set_confirm_wipe(true);
            return;
        }

        wipe_settings();
        clear_credentials();
        set_confirm_wipe(false);
        alert('All settings and credentials have been wiped.');
    }

    return (
        <div class="space-y-4 pt-2">
            <div class="divider text-xs m-0">BACKUP</div>

            <button
                class="btn btn-sm btn-outline w-full text-xs"
                onClick={export_settings_backup}
            >
                Export Settings Backup
            </button>

            <div>
                <input
                    ref={file_input_ref}
                    type="file"
                    accept=".json"
                    class="hidden"
                    onChange={handle_import}
                />
                <button
                    class="btn btn-sm btn-outline w-full text-xs"
                    onClick={() => file_input_ref.current?.click()}
                    disabled={importing}
                >
                    {importing ? 'Importing...' : 'Import Settings Backup'}
                </button>
            </div>

            <div class="divider text-xs">RESET</div>

            <button
                class="btn btn-sm btn-outline btn-warning w-full text-xs"
                onClick={reset_settings}
            >
                Reset to Defaults
            </button>

            <div class="divider text-xs">DANGER ZONE</div>

            <button
                class={`btn btn-sm w-full text-xs ${confirm_wipe ? 'btn-error' : 'btn-outline btn-error'}`}
                onClick={handle_wipe}
            >
                {confirm_wipe ? 'Click Again to Confirm Wipe' : 'Wipe All Data'}
            </button>

            {confirm_wipe && (
                <div class="text-xs text-error text-center">
                    This will delete all settings AND credentials. This cannot be undone.
                    <button
                        class="block mx-auto mt-1 text-base-content/40 hover:text-base-content"
                        onClick={() => set_confirm_wipe(false)}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
```

### 3.11 Header Integration Update

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

---

## Appendix: Component Best Practices Review

Based on analysis of current v2 components (`blocks_menu.tsx`, `rig_selector.tsx`, `chart_block.tsx`, `chart_toolbar.tsx`, `trading.tsx`), the following best practices should be applied throughout the codebase.

### Current Issues Identified

1. **Duplicated Logic** - Click outside and Escape key handlers are repeated in multiple components
2. **Large Components** - `chart_toolbar.tsx` (467 lines) handles too many concerns: filtering, sorting, virtual scrolling, localStorage
3. **Inline SVG Icons** - SVG icons defined inline in component constants
4. **Mixed Concerns** - Some components mix UI rendering with business logic and data transformation

### Recommended Patterns

#### 1. Extract Reusable Custom Hooks

Create `src/hooks/` directory for shared hooks:

```typescript
// src/hooks/use_click_outside.ts
import { useEffect, RefObject } from 'preact/hooks';

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

```typescript
// src/hooks/use_escape_key.ts
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

```typescript
// src/hooks/use_local_storage.ts
import { useState, useCallback } from 'preact/hooks';

export function use_local_storage<T>(
    key: string,
    initial_value: T
): [T, (value: T) => void] {
    const [stored_value, set_stored_value] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initial_value;
        } catch {
            return initial_value;
        }
    });

    const set_value = useCallback((value: T) => {
        set_stored_value(value);
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {}
    }, [key]);

    return [stored_value, set_value];
}
```

#### 2. Extract Dropdown/Popup Pattern

Create a reusable dropdown component:

```typescript
// src/components/common/dropdown.tsx
import { useRef, ComponentChildren } from 'preact';
import { use_click_outside } from '@/hooks/use_click_outside';
import { use_escape_key } from '@/hooks/use_escape_key';

interface DropdownProps {
    is_open: boolean;
    on_close: () => void;
    position?: 'left' | 'right';
    children: ComponentChildren;
}

export function Dropdown({ is_open, on_close, position = 'right', children }: DropdownProps) {
    const ref = useRef<HTMLDivElement>(null);

    use_click_outside(ref, on_close);
    use_escape_key(on_close);

    if (!is_open) return null;

    return (
        <div
            ref={ref}
            class={`absolute top-full ${position === 'left' ? 'left-0' : 'right-0'} mt-1 bg-base-100 rounded shadow-lg z-50`}
        >
            {children}
        </div>
    );
}
```

#### 3. Move Non-UI Logic to Services/Utils

For `chart_toolbar.tsx`, extract filtering and sorting:

```typescript
// src/services/symbol/symbol_filter.ts
import type { ExchangeId } from '@/types/credentials.types';

export interface SymbolWithExchange {
    exchange: ExchangeId;
    symbol: string;
}

export type FilterType = 'all' | 'favourites' | ExchangeId;
export type SortField = 'symbol' | 'price' | 'change' | 'volume';
export type SortDirection = 'asc' | 'desc';

export function filter_symbols(
    symbols: SymbolWithExchange[],
    filter: FilterType,
    favourites: SymbolWithExchange[],
    search: string
): SymbolWithExchange[] {
    let result = symbols;

    if (filter === 'favourites') {
        result = result.filter((s) =>
            favourites.some((f) => f.exchange === s.exchange && f.symbol === s.symbol)
        );
    } else if (filter !== 'all') {
        result = result.filter((s) => s.exchange === filter);
    }

    if (search) {
        const lower = search.toLowerCase();
        result = result.filter((s) => s.symbol.toLowerCase().includes(lower));
    }

    return result;
}

export function sort_symbols(
    symbols: SymbolWithExchange[],
    field: SortField,
    direction: SortDirection,
    get_ticker: (ex: ExchangeId, symbol: string) => { last_price?: number; price_24h?: number; volume_24h?: number } | null
): SymbolWithExchange[] {
    return [...symbols].sort((a, b) => {
        let cmp = 0;
        if (field === 'symbol') {
            cmp = a.symbol.localeCompare(b.symbol);
        } else {
            const ta = get_ticker(a.exchange, a.symbol);
            const tb = get_ticker(b.exchange, b.symbol);
            if (field === 'price') {
                cmp = (ta?.last_price ?? 0) - (tb?.last_price ?? 0);
            } else if (field === 'change') {
                const ca = ta?.price_24h ? ((ta.last_price! - ta.price_24h) / ta.price_24h) * 100 : 0;
                const cb = tb?.price_24h ? ((tb.last_price! - tb.price_24h) / tb.price_24h) * 100 : 0;
                cmp = ca - cb;
            } else if (field === 'volume') {
                cmp = (ta?.volume_24h ?? 0) - (tb?.volume_24h ?? 0);
            }
        }
        return direction === 'asc' ? cmp : -cmp;
    });
}
```

#### 4. Extract Virtual List Component

```typescript
// src/components/common/virtual_list.tsx
import { useRef, useMemo, useCallback, ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

interface VirtualListProps<T> {
    items: T[];
    item_height: number;
    container_height: number;
    overscan?: number;
    render_item: (item: T, index: number) => ComponentChildren;
}

export function VirtualList<T>({
    items,
    item_height,
    container_height,
    overscan = 5,
    render_item,
}: VirtualListProps<T>) {
    const [scroll_top, set_scroll_top] = useState(0);
    const scroll_ref = useRef<HTMLDivElement>(null);

    const total_height = items.length * item_height;

    const { visible_items, top_offset } = useMemo(() => {
        const start_index = Math.max(0, Math.floor(scroll_top / item_height) - overscan);
        const end_index = Math.min(
            items.length,
            Math.ceil((scroll_top + container_height) / item_height) + overscan
        );
        return {
            visible_items: items.slice(start_index, end_index).map((item, i) => ({
                item,
                index: start_index + i,
            })),
            top_offset: start_index * item_height,
        };
    }, [items, item_height, container_height, scroll_top, overscan]);

    const handle_scroll = useCallback((e: Event) => {
        set_scroll_top((e.target as HTMLDivElement).scrollTop);
    }, []);

    return (
        <div
            ref={scroll_ref}
            class="overflow-y-auto"
            style={{ height: `${container_height}px` }}
            onScroll={handle_scroll}
        >
            <div style={{ height: `${total_height}px`, position: 'relative' }}>
                <div style={{ transform: `translateY(${top_offset}px)` }}>
                    {visible_items.map(({ item, index }) => render_item(item, index))}
                </div>
            </div>
        </div>
    );
}
```

### Component Size Guidelines

| Component Type | Max Lines | If Exceeded |
|----------------|-----------|-------------|
| Simple UI component | ~100 | Fine as is |
| Complex component | ~200 | Consider extraction |
| Feature component | ~300 | Must extract hooks/utils |
| Page component | ~200 | Keep rendering only |

### Folder Structure for Larger Features

For complex features like the symbol selector:

```
src/components/chart/
├── symbol_selector/
│   ├── index.ts              # Re-exports
│   ├── symbol_selector.tsx   # Main component (~150 lines)
│   ├── symbol_list.tsx       # Virtual list rendering
│   ├── symbol_filters.tsx    # Filter tabs/buttons
│   └── use_symbol_filter.ts  # Filter/sort hook
├── chart_toolbar.tsx         # Now ~150 lines
└── trading_chart.tsx
```

### Applying to Settings Components

The settings section components in this plan follow best practices:
- Each section is ~100-130 lines
- They use store functions directly (no inline business logic)
- Event handlers are simple one-liners or extracted functions
- No duplicated patterns (hooks will be shared)

When implementing, ensure:
1. Use `use_click_outside` and `use_escape_key` hooks for exchange panel
2. Extract settings drawer accordion as reusable component if needed elsewhere
3. Keep section components focused on form rendering only
