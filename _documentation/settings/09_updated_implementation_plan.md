# Updated Settings Implementation Plan

**Last Updated:** 2026-01-21
**Starting Point:** Phase 1 Exchange Settings Complete

---

## Current State Summary

### What's Complete (Phase 1)

| Component | File | Description |
|-----------|------|-------------|
| Credentials Types | `src/types/credentials.types.ts` | ExchangeId, ExchangeCredentials, NewsProviderCredentials |
| Exchange Types | `src/types/exchange.types.ts` | ExchangeId, ConnectionStatus, SymbolData |
| Credentials Store | `src/stores/credentials_store.ts` | Local-only encrypted store |
| Encryption Utility | `src/utils/encryption.ts` | AES-GCM encryption |
| Exchange Validators | `src/services/exchange/validators/*.ts` | CCXT-based validation |
| Exchange Service | `src/services/exchange/exchange.service.ts` | Field config, names, links, guides |
| Exchange Panel | `src/components/exchange/exchange_panel.tsx` | Dropdown config UI |
| Header Integration | `src/components/layout/header.tsx` | Exchange icons with panel |
| Hooks | `src/hooks/*.ts` | use_click_outside, use_escape_key |

### Encryption Confirmation

The encryption is properly implemented in `src/utils/encryption.ts`:

```typescript
// Uses AES-GCM algorithm
// Key derived from config.credentials_key (env: VITE_CREDENTIALS_KEY)
// IV is randomly generated per encryption
// Output is base64 encoded (IV + encrypted data)
```

The `credentials_store.ts` uses this encryption:
- `save_to_storage()` encrypts before saving to localStorage
- `load_from_storage()` decrypts when reading
- `is_encrypted()` detects if data needs decryption (migration support)

---

## Architecture Clarification

### Three-Store Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        THREE STORES                              │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   credentials_store │    settings_store   │    layout_store     │
│   (LOCAL ONLY) ✅   │  (SYNCS TO SERVER)  │  (SYNCS TO SERVER)  │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ • Exchange API keys │ • Trading prefs     │ • Rigs              │
│ • Exchange secrets  │ • Terminal prefs    │ • Block positions   │
│ • Passphrases       │ • Chart prefs       │ • Block sizes       │
│ • Private keys      │ • News display      │ • Active rig        │
│ • News provider keys│ • Keywords          │                     │
│ • Connection status │ • Shortcuts         │                     │
│                     │ • Botting config    │                     │
│                     │ • Exchange prefs    │                     │
│                     │   (preferred, etc)  │                     │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ 247terminal_        │ 247terminal_        │ 247terminal_rigs    │
│ credentials ✅      │ settings_v2         │                     │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Encrypted locally   │ Encrypted via       │ Plain JSON          │
│ (AES-GCM) ✅        │ server API          │ (no sensitive data) │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### Key Principle: Separation of Sensitive Data

| Data | Storage | Sync | Reason |
|------|---------|------|--------|
| API keys, secrets, passphrases | credentials_store | Never | Security |
| Connection status (`connected`) | credentials_store | Never | Tied to credentials |
| News provider API keys | credentials_store | Never | Security |
| Preferred exchange | settings_store | Server | User preference |
| Trading sizes, TP/SL | settings_store | Server | User preference |
| UI preferences | settings_store | Server | User preference |
| Layouts/rigs | layout_store | Server | User data |

---

## Phase 2: Settings Infrastructure

### 2.1 Update Settings Types

**File:** `src/types/settings.types.ts`

The current file mixes credentials with settings. Update to match architecture:

```typescript
import type { ExchangeId } from './exchange.types';

export interface ExchangePreferences {
    preferred: ExchangeId;
    enabled_exchanges: ExchangeId[];
}

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

export interface ChartSettings {
    default_timeframe: string;
    order_history: boolean;
    up_candle_color: string;
    down_candle_color: string;
    chart_tickers: string[];
    favorite_tickers: string[];
}

export interface NewsProviderToggles {
    phoenix_enabled: boolean;
    tree_enabled: boolean;
    synoptic_enabled: boolean;
    groq_enabled: boolean;
}

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

export interface KeywordSettings {
    blacklisted_words: string[];
    blacklisted_coins: string[];
    critical_words: string[];
    special_words: string[];
    custom_mappings: string[];
    blacklisted_sources: string[];
}

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

export interface BottingSettings {
    enabled: boolean;
    cooldown_hours: number;
    mobile_notification_enabled: boolean;
    ntfy_topic: string;
    auto_pause_enabled: boolean;
    auto_pause_timeframe: string;
    auto_pause_threshold: number;
}

export interface ShortcutBinding {
    modifier_1: 'CTRL' | 'SHIFT' | 'NONE';
    modifier_2: 'CTRL' | 'SHIFT' | 'NONE';
    key: string;
}

export interface ShortcutSettings {
    disabled: boolean;
    nuke_all: ShortcutBinding;
    bindings: Record<string, ShortcutBinding>;
}

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

export interface EncryptedSettings {
    iv: string;
    auth_tag: string;
    data: string;
}

export type SettingsStatus = 'loading' | 'ready' | 'saving' | 'error';

export interface SettingsState {
    status: SettingsStatus;
    settings: UserSettings | null;
    error: string | null;
    last_synced: number | null;
}
```

### 2.2 Settings Constants

**File:** `src/services/settings/settings.constants.ts`

```typescript
import type { UserSettings } from '@/types/settings.types';

export const SETTINGS_STORAGE_KEY = '247terminal_settings_v2';
export const SETTINGS_SYNC_DEBOUNCE = 2000;

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
        nuke_all: { modifier_1: 'CTRL', modifier_2: 'SHIFT', key: 'N' },
        bindings: {},
    },
    ui_zoom: 1,
};

export const TIMEFRAME_OPTIONS = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: 'D', label: 'D' },
    { value: 'W', label: 'W' },
] as const;

export const NOTIFICATION_FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'critical', label: 'Critical Only' },
    { value: 'special', label: 'Special Only' },
    { value: 'both', label: 'Critical & Special' },
] as const;
```

### 2.3 Settings Service

**File:** `src/services/settings/settings.service.ts`

```typescript
import { config } from '@/config';
import { get_auth_headers } from '@/services/auth/auth.service';
import type { UserSettings, EncryptedSettings } from '@/types/settings.types';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from './settings.constants';

export async function encrypt_settings(settings: UserSettings): Promise<EncryptedSettings | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/settings/encrypt`, {
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
    } catch {
        return null;
    }
}

export async function decrypt_settings(encrypted: EncryptedSettings): Promise<UserSettings | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/settings/decrypt`, {
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
    } catch {
        return null;
    }
}

export async function sync_to_server(settings: UserSettings): Promise<boolean> {
    try {
        const encrypted = await encrypt_settings(settings);
        if (!encrypted) return false;

        const response = await fetch(`${config.api_base_url}/v1/app/settings/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ settings: encrypted }),
        });

        return response.ok;
    } catch {
        return false;
    }
}

export async function fetch_from_server(): Promise<UserSettings | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/settings/`, {
            method: 'GET',
            headers: get_auth_headers(),
        });

        if (!response.ok) return null;

        const result = await response.json();
        if (!result.data?.settings) return null;

        return await decrypt_settings(result.data.settings as EncryptedSettings);
    } catch {
        return null;
    }
}

export function load_from_storage(): UserSettings | null {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

export function save_to_storage(settings: UserSettings): boolean {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch {
        return false;
    }
}

export function merge_settings(local: UserSettings, server: UserSettings): UserSettings {
    return { ...DEFAULT_SETTINGS, ...server, ...local };
}
```

### 2.4 Settings Store

**File:** `src/stores/settings_store.ts`

```typescript
import { signal, computed } from '@preact/signals';
import type { UserSettings, SettingsState, SettingsStatus } from '@/types/settings.types';
import {
    load_from_storage,
    save_to_storage,
    sync_to_server,
    fetch_from_server,
    merge_settings,
} from '@/services/settings/settings.service';
import { DEFAULT_SETTINGS, SETTINGS_SYNC_DEBOUNCE } from '@/services/settings/settings.constants';

export const settings_state = signal<SettingsState>({
    status: 'loading',
    settings: null,
    error: null,
    last_synced: null,
});

export const settings = computed(() => settings_state.value.settings ?? DEFAULT_SETTINGS);
export const settings_status = computed(() => settings_state.value.status);

let sync_timeout: ReturnType<typeof setTimeout> | null = null;

function debounced_sync(new_settings: UserSettings): void {
    if (sync_timeout) clearTimeout(sync_timeout);

    sync_timeout = setTimeout(async () => {
        settings_state.value = { ...settings_state.value, status: 'saving' };

        const success = await sync_to_server(new_settings);

        settings_state.value = {
            ...settings_state.value,
            status: success ? 'ready' : 'error',
            error: success ? null : 'failed to sync settings',
            last_synced: success ? Date.now() : settings_state.value.last_synced,
        };
    }, SETTINGS_SYNC_DEBOUNCE);
}

export async function init_settings(): Promise<void> {
    const local = load_from_storage();
    const server = await fetch_from_server();

    let final_settings: UserSettings;

    if (local && server) {
        final_settings = merge_settings(local, server);
    } else if (server) {
        final_settings = server;
    } else if (local) {
        final_settings = local;
    } else {
        final_settings = DEFAULT_SETTINGS;
    }

    save_to_storage(final_settings);

    settings_state.value = {
        status: 'ready',
        settings: final_settings,
        error: null,
        last_synced: server ? Date.now() : null,
    };
}

export function update_settings<K extends keyof UserSettings>(
    section: K,
    updates: Partial<UserSettings[K]>
): void {
    const current = settings_state.value.settings;
    if (!current) return;

    const new_settings: UserSettings = {
        ...current,
        [section]: { ...current[section], ...updates },
    };

    settings_state.value = {
        ...settings_state.value,
        settings: new_settings,
    };

    save_to_storage(new_settings);
    debounced_sync(new_settings);
}

export function set_setting<K extends keyof UserSettings, S extends keyof UserSettings[K]>(
    section: K,
    key: S,
    value: UserSettings[K][S]
): void {
    update_settings(section, { [key]: value } as Partial<UserSettings[K]>);
}

export function reset_settings(): void {
    settings_state.value = {
        status: 'ready',
        settings: DEFAULT_SETTINGS,
        error: null,
        last_synced: null,
    };

    save_to_storage(DEFAULT_SETTINGS);
    debounced_sync(DEFAULT_SETTINGS);
}
```

---

## Phase 3: Settings UI

### 3.1 Settings Drawer Container

**File:** `src/components/settings/settings_drawer.tsx`

The drawer should:
- Slide in from the right side
- Have accordion sections for each settings category
- Auto-save changes (no explicit save button)
- Show sync status indicator

### 3.2 Section Components

Create one component per section:
- `trading_section.tsx` - Position sizes, TP/SL, slippage
- `terminal_section.tsx` - Notifications, display options
- `chart_section.tsx` - Timeframe, colors
- `news_section.tsx` - Provider toggles, display settings
- `keyword_section.tsx` - Keyword lists management
- `shortcuts_section.tsx` - Keyboard shortcuts
- `botting_section.tsx` - Bot configuration
- `backup_section.tsx` - Export/import settings

---

## Phase 4: Layout Sync

### 4.1 Layout Sync Service

**File:** `src/services/layout/layout_sync.service.ts`

```typescript
import { config } from '@/config';
import { get_auth_headers } from '@/services/auth/auth.service';
import type { RigsState } from '@/types/layout.types';

export async function sync_layouts_to_server(layouts: RigsState): Promise<boolean> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/layouts/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...get_auth_headers(),
            },
            body: JSON.stringify({ layouts }),
        });

        return response.ok;
    } catch {
        return false;
    }
}

export async function fetch_layouts_from_server(): Promise<RigsState | null> {
    try {
        const response = await fetch(`${config.api_base_url}/v1/app/layouts/`, {
            method: 'GET',
            headers: get_auth_headers(),
        });

        if (!response.ok) return null;

        const result = await response.json();
        return result.data?.layouts || null;
    } catch {
        return null;
    }
}
```

### 4.2 Update Layout Store

Add sync integration to existing `layout_store.ts`:
- Add `last_synced` to state
- Add debounced sync on layout changes
- Add init function that merges local and server

---

## Implementation Checklist

### Phase 2: Settings Infrastructure
- [ ] Update `src/types/settings.types.ts`
- [ ] Create `src/services/settings/settings.constants.ts`
- [ ] Create `src/services/settings/settings.service.ts`
- [ ] Create `src/stores/settings_store.ts`
- [ ] Add settings initialization to app startup

### Phase 3: Settings UI
- [ ] Create `src/components/settings/settings_drawer.tsx`
- [ ] Create `src/components/settings/trading_section.tsx`
- [ ] Create `src/components/settings/terminal_section.tsx`
- [ ] Create `src/components/settings/chart_section.tsx`
- [ ] Create `src/components/settings/news_section.tsx`
- [ ] Create `src/components/settings/keyword_section.tsx`
- [ ] Create `src/components/settings/shortcuts_section.tsx`
- [ ] Create `src/components/settings/botting_section.tsx`
- [ ] Create `src/components/settings/backup_section.tsx`
- [ ] Integrate settings button in header

### Phase 4: Layout Sync
- [ ] Create `src/services/layout/layout_sync.service.ts`
- [ ] Update `src/stores/layout_store.ts` with sync
- [ ] Add `updated_at` to Rig interface
- [ ] Add `last_synced` to RigsState

### Phase 5: Advanced Features
- [ ] Custom WebSocket configuration UI
- [ ] Monitored accounts UI
- [ ] Full keyboard shortcuts configuration

---

## File Structure After Implementation

```
src/
├── types/
│   ├── credentials.types.ts     ✅ Complete
│   ├── exchange.types.ts        ✅ Complete
│   ├── settings.types.ts        📝 Update needed
│   └── layout.types.ts          📝 Add sync metadata
├── services/
│   ├── settings/
│   │   ├── settings.service.ts  📝 Create
│   │   └── settings.constants.ts 📝 Create
│   ├── layout/
│   │   └── layout_sync.service.ts 📝 Create
│   └── exchange/
│       ├── exchange.service.ts  ✅ Complete
│       └── validators/          ✅ Complete
├── stores/
│   ├── credentials_store.ts     ✅ Complete
│   ├── settings_store.ts        📝 Create
│   └── layout_store.ts          📝 Add sync
├── utils/
│   └── encryption.ts            ✅ Complete
├── hooks/
│   ├── use_click_outside.ts     ✅ Complete
│   ├── use_escape_key.ts        ✅ Complete
│   └── index.ts                 ✅ Complete
└── components/
    ├── exchange/
    │   └── exchange_panel.tsx   ✅ Complete
    ├── settings/
    │   ├── settings_drawer.tsx  📝 Create
    │   ├── trading_section.tsx  📝 Create
    │   ├── terminal_section.tsx 📝 Create
    │   ├── chart_section.tsx    📝 Create
    │   ├── news_section.tsx     📝 Create
    │   ├── keyword_section.tsx  📝 Create
    │   ├── shortcuts_section.tsx 📝 Create
    │   ├── botting_section.tsx  📝 Create
    │   └── backup_section.tsx   📝 Create
    ├── common/
    │   └── exchange_button.tsx  ✅ Complete
    └── layout/
        └── header.tsx           ✅ Complete
```

---

## Notes

### Credentials Store - No Changes Needed

The current `credentials_store.ts` implementation is correct:
- Uses `247terminal_credentials` storage key
- Encrypts data with AES-GCM locally
- Never syncs to server
- Has proper structure for exchanges and news_providers

### Type Consolidation

`ExchangeId` is currently defined in both:
- `src/types/credentials.types.ts`
- `src/types/exchange.types.ts`

Consider removing from `credentials.types.ts` and importing from `exchange.types.ts` for consistency.
