# Updated Settings Requirements Checklist

**Last Updated:** 2026-01-21
**Status:** Phase 1 Partially Complete

---

## Implementation Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Exchange Credentials UI | ✅ Complete | Panel, validation, connection |
| Credentials Store | ✅ Complete | Local-only with encryption |
| Credentials Types | ✅ Complete | Separate from settings types |
| Encryption Utility | ✅ Complete | AES-GCM with env key |
| Settings Store | ❌ Not Started | Server-synced preferences |
| Settings Service | ❌ Not Started | API sync operations |
| Settings UI (Drawer) | ❌ Not Started | Main settings interface |
| Layout Sync | ❌ Not Started | Server sync for rigs |

---

## Storage Architecture

### Confirmed Storage Keys

| Key | Purpose | Server Sync | Status |
|-----|---------|-------------|--------|
| `247terminal_credentials` | Sensitive API keys/secrets | **Never** | ✅ Implemented |
| `247terminal_settings_v2` | User preferences | Yes (2s debounce) | ❌ Not implemented |
| `247terminal_rigs` | Layouts/rigs | Yes (3s debounce) | ⚠️ Exists but no sync |

### Encryption Status

| Data | Encryption Method | Status |
|------|-------------------|--------|
| Exchange credentials | AES-GCM (local, `config.credentials_key`) | ✅ Implemented |
| News provider keys | AES-GCM (local, `config.credentials_key`) | ✅ Implemented |
| User settings | Server-side encryption | ❌ Not implemented |

---

## 1. Exchange Settings

### Exchange Credentials (LOCAL ONLY - credentials_store)

| Setting | Type | Status | Location |
|---------|------|--------|----------|
| `bybit.api_key` | string | ✅ | credentials_store |
| `bybit.api_secret` | string | ✅ | credentials_store |
| `bybit.connected` | boolean | ✅ | credentials_store |
| `bybit.last_validated` | number/null | ✅ | credentials_store |
| `binance.api_key` | string | ✅ | credentials_store |
| `binance.api_secret` | string | ✅ | credentials_store |
| `binance.connected` | boolean | ✅ | credentials_store |
| `binance.last_validated` | number/null | ✅ | credentials_store |
| `blofin.api_key` | string | ✅ | credentials_store |
| `blofin.api_secret` | string | ✅ | credentials_store |
| `blofin.passphrase` | string | ✅ | credentials_store |
| `blofin.connected` | boolean | ✅ | credentials_store |
| `blofin.last_validated` | number/null | ✅ | credentials_store |
| `hyperliquid.wallet_address` | string | ✅ | credentials_store |
| `hyperliquid.private_key` | string | ✅ | credentials_store |
| `hyperliquid.connected` | boolean | ✅ | credentials_store |
| `hyperliquid.last_validated` | number/null | ✅ | credentials_store |

### Exchange Preferences (SERVER SYNC - settings_store)

| Setting | Type | Status | Notes |
|---------|------|--------|-------|
| `preferred` | ExchangeId | ❌ | Default/preferred exchange |
| `enabled_exchanges` | ExchangeId[] | ❌ | Which exchanges are enabled |

---

## 2. Trading Settings (settings_store - SERVER SYNC)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `sizes` | [number, number, number, number] | [100, 500, 1000, 5000] | ❌ |
| `size_count` | 1-4 | 4 | ❌ |
| `slippage` | number \| 'MARKET' | 3 | ❌ |
| `auto_tp_enabled` | boolean | false | ❌ |
| `auto_tp_value` | number | 5 | ❌ |
| `auto_tp_limit` | boolean | false | ❌ |
| `auto_sl_enabled` | boolean | false | ❌ |
| `auto_sl_value` | number | 3 | ❌ |
| `unique_shortcuts` | boolean | false | ❌ |

---

## 3. Terminal Settings (settings_store - SERVER SYNC)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `auto_login` | boolean | false | ❌ |
| `push_notifications` | boolean | true | ❌ |
| `notification_filter` | 'all' \| 'critical' \| 'special' \| 'both' | 'all' | ❌ |
| `full_size_media` | boolean | false | ❌ |
| `disable_media` | boolean | false | ❌ |
| `freeze_on_hover` | boolean | true | ❌ |
| `share_trades` | boolean | false | ❌ |
| `show_profit` | boolean | false | ❌ |

---

## 4. Chart Settings (settings_store - SERVER SYNC)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `default_timeframe` | string | '5m' | ❌ |
| `order_history` | boolean | true | ❌ |
| `up_candle_color` | string | '#00C853' | ❌ |
| `down_candle_color` | string | '#FF1744' | ❌ |
| `chart_tickers` | string[] | [] | ❌ |
| `favorite_tickers` | string[] | [] | ❌ |

---

## 5. News Settings

### News Provider Keys (LOCAL ONLY - credentials_store)

| Setting | Type | Status | Location |
|---------|------|--------|----------|
| `phoenix_key` | string | ✅ | credentials_store |
| `tree_key` | string | ✅ | credentials_store |
| `synoptic_key` | string | ✅ | credentials_store |
| `groq_key` | string | ✅ | credentials_store |

### News Provider Toggles (SERVER SYNC - settings_store)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `phoenix_enabled` | boolean | false | ❌ |
| `tree_enabled` | boolean | false | ❌ |
| `synoptic_enabled` | boolean | false | ❌ |
| `groq_enabled` | boolean | false | ❌ |

### News Display Settings (SERVER SYNC - settings_store)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `deduplicator` | boolean | true | ❌ |
| `text_shortener` | boolean | false | ❌ |
| `directional_highlight` | boolean | true | ❌ |
| `price_movement_highlight` | boolean | true | ❌ |
| `price_movement_threshold` | number | 5 | ❌ |
| `price_movement_notification` | boolean | false | ❌ |
| `hide_tickerless` | boolean | false | ❌ |
| `translation_enabled` | boolean | false | ❌ |
| `translation_language` | string | 'en' | ❌ |
| `delay_threshold` | number | 5000 | ❌ |
| `history_limit` | number | 100 | ❌ |
| `auto_clear_seconds` | number | 0 | ❌ |
| `font_size` | number | 12 | ❌ |

### Keyword Lists (SERVER SYNC - settings_store)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `blacklisted_words` | string[] | [] | ❌ |
| `blacklisted_coins` | string[] | [] | ❌ |
| `critical_words` | string[] | [] | ❌ |
| `special_words` | string[] | [] | ❌ |
| `custom_mappings` | string[] | [] | ❌ |
| `blacklisted_sources` | string[] | [] | ❌ |

### Custom WebSockets (SERVER SYNC - settings_store)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `custom_websockets` | CustomWebSocket[] | [] | ❌ |

---

## 6. Botting Settings (settings_store - SERVER SYNC)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `enabled` | boolean | false | ❌ |
| `cooldown_hours` | number | 1 | ❌ |
| `mobile_notification_enabled` | boolean | false | ❌ |
| `ntfy_topic` | string | '' | ❌ |
| `auto_pause_enabled` | boolean | false | ❌ |
| `auto_pause_timeframe` | string | '1' | ❌ |
| `auto_pause_threshold` | number | 10 | ❌ |

---

## 7. Shortcut Settings (settings_store - SERVER SYNC)

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `disabled` | boolean | false | ❌ |
| `nuke_all` | ShortcutBinding | CTRL+SHIFT+N | ❌ |
| `bindings` | Record<string, ShortcutBinding> | {} | ❌ |

---

## 8. Layout Settings (layout_store - SERVER SYNC)

| Setting | Type | Status | Notes |
|---------|------|--------|-------|
| `rigs` | Record<string, Rig> | ⚠️ Partial | Exists locally, no sync |
| `active_rig_id` | string | ⚠️ Partial | Exists locally, no sync |
| `last_synced` | number | ❌ | Not implemented |

---

## 9. UI State

| Setting | Type | Default | Status |
|---------|------|---------|--------|
| `ui_zoom` | number | 1 | ❌ |

---

## Files Implemented

### Types
- [x] `src/types/credentials.types.ts` - Exchange and news provider credentials
- [x] `src/types/exchange.types.ts` - Exchange IDs and connection status
- [ ] `src/types/settings.types.ts` - **Needs update** to match new architecture

### Stores
- [x] `src/stores/credentials_store.ts` - Local-only encrypted credentials
- [ ] `src/stores/settings_store.ts` - Server-synced preferences

### Services
- [x] `src/services/exchange/exchange.service.ts` - Exchange config and validation
- [x] `src/services/exchange/validators/*.ts` - CCXT-based validation
- [ ] `src/services/settings/settings.service.ts` - Settings API sync
- [ ] `src/services/settings/settings.constants.ts` - Default values
- [ ] `src/services/layout/layout_sync.service.ts` - Layout sync

### Utils
- [x] `src/utils/encryption.ts` - AES-GCM encryption for credentials

### Hooks
- [x] `src/hooks/use_click_outside.ts`
- [x] `src/hooks/use_escape_key.ts`
- [x] `src/hooks/index.ts`

### Components
- [x] `src/components/exchange/exchange_panel.tsx` - Exchange config dropdown
- [x] `src/components/common/exchange_button.tsx` - Header exchange icons
- [x] `src/components/layout/header.tsx` - Header with exchange integration
- [ ] `src/components/settings/settings_drawer.tsx` - Main settings UI
- [ ] `src/components/settings/*_section.tsx` - Settings accordion sections

---

## API Endpoints Required

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/app/settings/encrypt` | POST | Encrypt settings blob | ❌ Not used yet |
| `/v1/app/settings/decrypt` | POST | Decrypt settings blob | ❌ Not used yet |
| `/v1/app/settings/` | GET | Fetch user settings | ❌ Not used yet |
| `/v1/app/settings/` | PUT | Save user settings | ❌ Not used yet |
| `/v1/app/layouts/` | GET | Fetch user layouts | ❌ Not implemented |
| `/v1/app/layouts/` | PUT | Save user layouts | ❌ Not implemented |

---

## Priority Order for Remaining Work

### Phase 2: Settings Infrastructure (Next)
1. Update `src/types/settings.types.ts` to match architecture
2. Create `src/services/settings/settings.constants.ts`
3. Create `src/services/settings/settings.service.ts`
4. Create `src/stores/settings_store.ts`

### Phase 3: Settings UI
1. Create `src/components/settings/settings_drawer.tsx`
2. Create trading section component
3. Create terminal section component
4. Create chart section component
5. Create news section component
6. Create keyboard/shortcuts section component
7. Create backup section component

### Phase 4: Layout Sync
1. Create `src/services/layout/layout_sync.service.ts`
2. Update `src/stores/layout_store.ts` with sync integration

### Phase 5: Advanced Features
1. Botting settings section
2. Custom WebSocket configuration
3. Monitored accounts
