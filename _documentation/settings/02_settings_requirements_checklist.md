# Settings Requirements Checklist

This document contains a comprehensive list of all settings from the v1 PWA that need to be implemented in v2.

---

## Settings Categories

The v1 PWA organizes settings into the following sections:
1. **Exchange** - API credentials and trading configuration
2. **Terminal** - General terminal behavior
3. **Chart** - Chart display preferences
4. **News** - News feed configuration
5. **Monitored Accounts** - Social media accounts to monitor
6. **Botting** - Automated trading settings
7. **Shortcuts** - Keyboard shortcut configuration
8. **Backup & Restore** - Data management

Additionally, there's **Layout** management which is handled separately but stored with settings.

---

## 1. Exchange Settings

### Exchange Credentials (per exchange)
- [ ] `bybit` - API Key, API Secret, Hedge Mode
- [ ] `blofin` - API Key, API Secret, Passphrase, Hedge Mode
- [ ] `binance` - API Key, API Secret, Hedge Mode
- [ ] `hyperliquid` - Wallet Address, Private Key

### Exchange Configuration
- [ ] `preferred` - Preferred/default exchange
- [ ] `enabled` - Which exchanges are enabled (per exchange toggle)

### Trading Settings
- [ ] `size1` - Position size button 1 (USDT)
- [ ] `size2` - Position size button 2 (USDT)
- [ ] `size3` - Position size button 3 (USDT)
- [ ] `size4` - Position size button 4 (USDT)
- [ ] `sizeCount` - Number of size buttons to display (1-4)
- [ ] `slippage` - Slippage percentage or "MARKET"
- [ ] `autoTP` - Auto take-profit percentage value
- [ ] `autoTPCb` - Auto take-profit enabled toggle
- [ ] `autoTPlimit` - Use limit TP orders toggle
- [ ] `autoSL` - Auto stop-loss percentage value
- [ ] `autoSLCb` - Auto stop-loss enabled toggle
- [ ] `uniqueSh` - Unique coin shortcuts (hide duplicates)

---

## 2. Terminal Settings

- [ ] `autoLogin` - Automatic login on app launch
- [ ] `deskNotifs` - Push notifications enabled
- [ ] `notifFilter` - Notification filter (all, critical, special, both)
- [ ] `fullImages` - Full size media display
- [ ] `disablemedia` - Disable media completely
- [ ] `freeze` - Freeze feed on hover
- [ ] `shareTrades` - Share trades in chat
- [ ] `showprofit` - Dollar profit on PnL card

---

## 3. Chart Settings

- [ ] `defaultTf` - Default timeframe (1s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, D, W, M)
- [ ] `orderHistory` - Display order arrows on chart
- [ ] `upcandle` - Up candle color (hex/rgb)
- [ ] `dncandle` - Down candle color (hex/rgb)
- [ ] `chartTickers` - Saved chart tickers
- [ ] `favouriteTickers` - Favorite tickers list
- [ ] `tickerCount` - Number of tickers to display

---

## 4. News Settings

### Provider API Keys
- [ ] `phoenixKey` - Phoenix News API key
- [ ] `phoenixToggle` - Phoenix News enabled
- [ ] `treeKey` - Tree of Alpha API key
- [ ] `treeToggle` - Tree of Alpha enabled
- [ ] `synopticKey` - Synoptic API key
- [ ] `synopticToggle` - Synoptic enabled
- [ ] `groqKey` - Groq AI API key (for sentiment)
- [ ] `groqToggle` - Groq AI enabled

### Custom WebSockets
- [ ] `websocketDataList` - Custom WebSocket configurations
  - WS Name
  - URL
  - Login message
  - Title key
  - Body key
  - Icon key
  - Timestamp key
  - Link key

### News Display Settings
- [ ] `deduplicator` - Prevent duplicate news display
- [ ] `shortener` - Text shortening for long articles
- [ ] `directionalHl` - Directional word highlighting (long, short, bottom)
- [ ] `news` - Price movement highlighting enabled
- [ ] `newsThreshold` - Price movement percentage threshold
- [ ] `newsAlert` - Price movement notification enabled
- [ ] `tickerless` - Hide news without detected tickers
- [ ] `newsBool` - Translation enabled
- [ ] `newsLang` - Translation target language
- [ ] `delayThreshold` - Delay threshold in ms (mark as "old")
- [ ] `itemsThreshold` - News history limit (max items)
- [ ] `clearThreshold` - Auto-clear news after X seconds
- [ ] `fontinput` - News font size (px)

### Keyword Lists
- [ ] `blacklistedWords` - Words to hide in news
- [ ] `blacklistedCoins` - Coins to hide in news
- [ ] `criticalWords` - Critical/important keywords
- [ ] `specialWords` - Alert sound trigger keywords
- [ ] `customKw` - Custom keyword-to-coin mappings

### News Source Filtering
- [ ] `basicnews` - Basic news toggle / enabled accounts
- [ ] `blacklistedSrc` - Blacklisted news sources

---

## 5. Monitored Accounts

- [ ] `monitoredAccounts` - List of social media accounts to monitor
  - Account handle
  - Platform
  - Enabled status

---

## 6. Botting Settings

- [ ] `botSettings` - Bot configuration object
  - `enabled` - Bot enabled/disabled
- [ ] `cdtime` - Cooldown period in hours
- [ ] `bottokencb` - Mobile notification enabled
- [ ] `bottoken` - NTFY topic name for mobile notifications
- [ ] `botProtectCb` - Auto-pause on threshold enabled
- [ ] `botProtectTf` - Bot protection timeframe
- [ ] `botProtectTre` - Bot protection threshold percentage

---

## 7. Shortcut Settings

- [ ] `disablesh` - Disable all shortcuts
- [ ] Keyboard shortcuts configuration (stored as nested object)
  - Modifier 1 (CTRL/SHIFT/NONE)
  - Modifier 2 (CTRL/SHIFT/NONE)
  - Key binding
- [ ] `nukeAll` shortcut configuration

---

## 8. Layout Settings

### Grid Layout
- [ ] `viewMode` - JSON containing:
  - `gridLayout` - Array of widget positions
    - `x` - X position
    - `y` - Y position
    - `w` - Width
    - `h` - Height
    - `id` - Widget ID
  - `isLocked` - Layout lock state
  - `lastUpdated` - Timestamp

### Layout Components Visibility
- [ ] `mirrorTerminal` - Comma-separated list of disabled components
  - News widget
  - Chart widget
  - Account widget
  - Chat widget

---

## 9. Authentication & Metadata

- [ ] `license` - License key
- [ ] `uid` - User ID
- [ ] `currentZoom` - UI zoom level

---

## 10. Server Sync Settings

### Storage Keys
- [ ] `STORAGE_KEY` = '247terminal_settings' (primary encrypted settings)
- [ ] `BACKUP_KEY` = '247terminal_settings_backup'

### API Endpoints
- [ ] `POST /app/settings/encrypt` - Encrypt settings data
- [ ] `POST /app/settings/decrypt` - Decrypt settings data
- [ ] `GET /app/settings/` - Fetch settings from server
- [ ] `PUT /app/settings/` - Save settings to server
- [ ] `POST /app/settings/legacy-decrypt` - Decrypt old backup format

### Sync Behavior
- [ ] Settings are encrypted before storage
- [ ] Debounced sync to server (1 second delay)
- [ ] Credentials stripped before server sync (API keys, secrets, passphrases)
- [ ] Background recovery if session lost
- [ ] IndexedDB backup for persistence

---

## Settings Data Types Summary

| Setting Key | Type | Storage Format |
|-------------|------|----------------|
| `exchange` | object | JSON string |
| `jsonStorage` | object | JSON string |
| `viewMode` | object | JSON string |
| `basicnews` | array/boolean | JSON string or boolean |
| `blacklistedWords` | array | JSON array |
| `blacklistedCoins` | array | JSON array |
| `criticalWords` | array | JSON array |
| `specialWords` | array | JSON array |
| `customKw` | array | JSON array |
| `websocketDataList` | array | JSON string |
| `botSettings` | object | JSON string |
| `chartTickers` | array | JSON string |
| All booleans | boolean | string "true"/"false" |
| Numeric values | number | string or number |
| Colors | string | hex "#XXXXXX" or rgb() |

---

## Default Values Reference

From `getDefaultSettings()`:

```javascript
{
    exchange: JSON.stringify({
        preferred: 'bybit',
        exchanges: {
            bybit: { enabled: true, apiKey: '', apiSecret: '' },
            binance: { enabled: false, apiKey: '', apiSecret: '' },
            blofin: { enabled: false, apiKey: '', apiSecret: '' },
            hyperliquid: { enabled: false, apiKey: '', apiSecret: '' },
        },
    }),
    jsonStorage: JSON.stringify({
        autoTPlimit: false,
    }),
    basicnews: JSON.stringify([]),
    viewMode: JSON.stringify({
        gridLayout: [],
        lastUpdated: Date.now(),
    }),
    blacklistedSrc: '',
    botSettings: JSON.stringify({
        enabled: false,
    }),
    currentZoom: '1',
    width: 1920,
    height: 1080,
    positionX: 0,
    positionY: 0,
    license: '',
    uid: '',
    autoLogin: 'false',
    bottoken: '',
    bottokencb: false,
    deskNotifs: true,
    botProtectTf: '1',
    showprofit: 'false',
}
```

---

## Priority Implementation Order

### Phase 1: Core (Required for Basic Operation)
1. Exchange settings (credentials, preferred exchange)
2. Trading settings (sizes, TP/SL)
3. Layout settings (grid positions, lock state)
4. Backup/Restore functionality
5. Server sync (encrypt/decrypt, save/fetch)

### Phase 2: Essential Features
1. Terminal settings (notifications, display options)
2. Chart settings (timeframe, colors)
3. News provider keys
4. Keyword lists

### Phase 3: Advanced Features
1. Botting settings
2. Shortcut configuration
3. Monitored accounts
4. Custom WebSocket configuration

---

## Source Files Reference

| File | Purpose |
|------|---------|
| `settings-manager.service.js` | Core load/save, encryption, sync |
| `settings-parser.service.js` | Parse settings into userConf |
| `settings-exchange.component.js` | Exchange credentials UI |
| `settings-keywords.component.js` | Keyword list management |
| `settings-ui.component.js` | UI helpers (toast, sidebar) |
| `settings.page.js` | Main settings page logic |
| `settings.templates.js` | HTML templates |
| `layout-manager.module.js` | Layout/grid management |
| `api.client.js` | API calls for encrypt/decrypt |
