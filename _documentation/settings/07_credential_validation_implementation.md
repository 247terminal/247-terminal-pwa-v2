# Exchange Credential Validation Implementation Guide

## Overview

This guide details the implementation of native API credential validation for each supported exchange (Binance, Bybit, BloFin, Hyperliquid). The approach uses each exchange's official API endpoints with proper HMAC-SHA256 signing, rather than relying on CCXT.

## Architecture Decision

**All validation happens on the frontend.** Since credentials are stored locally only and never synced to the server, there is no need for backend involvement. This keeps secrets secure in the browser and reduces latency.

## CORS Consideration

**Critical:** Exchange REST APIs do not set `Access-Control-Allow-Origin` headers, so direct browser fetch calls will be blocked by CORS policy.

### Solution

Use the **existing proxy** (`https://proxy2.247terminal.com/`) for exchanges that block CORS. The proxy forwards requests without storing credentials, and all traffic is HTTPS encrypted.

**CORS Status by Exchange:**
- **Binance Futures** - Blocks CORS (needs proxy)
- **Bybit** - Blocks CORS (needs proxy)
- **BloFin** - Blocks CORS (needs proxy)
- **Hyperliquid** - Allows CORS (direct calls work)

---

## Repository Changes Required

### Frontend (247-terminal-v2)

| File | Action |
|------|--------|
| `src/config/index.ts` | **ALREADY UPDATED** - Added proxy_url and proxy_auth |
| `src/services/exchange/crypto.ts` | **CREATE** - HMAC-SHA256 signing utilities |
| `src/services/exchange/validators/binance.ts` | **CREATE** - Binance validation |
| `src/services/exchange/validators/bybit.ts` | **CREATE** - Bybit validation |
| `src/services/exchange/validators/blofin.ts` | **CREATE** - BloFin validation |
| `src/services/exchange/validators/hyperliquid.ts` | **CREATE** - Hyperliquid validation |
| `src/services/exchange/validators/index.ts` | **CREATE** - Unified validator export |
| `src/services/exchange/exchange.service.ts` | **MODIFY** - Update validate_exchange_credentials |

### Backend (247-terminal-backend)

**No changes required.** Credentials are validated client-side only.

---

## Implementation Details

### 1. Crypto Utilities (`src/services/exchange/crypto.ts`)

```typescript
export async function hmac_sha256_hex(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key_data = encoder.encode(secret);
    const message_data = encoder.encode(message);

    const crypto_key = await crypto.subtle.importKey(
        'raw',
        key_data,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', crypto_key, message_data);
    const hash_array = Array.from(new Uint8Array(signature));

    return hash_array.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hmac_sha256_base64(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key_data = encoder.encode(secret);
    const message_data = encoder.encode(message);

    const crypto_key = await crypto.subtle.importKey(
        'raw',
        key_data,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', crypto_key, message_data);

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export function get_timestamp(): number {
    return Date.now();
}

export function generate_nonce(): string {
    return crypto.randomUUID();
}
```

---

### 2. Binance Validator (`src/services/exchange/validators/binance.ts`)

**Endpoint:** `GET https://fapi.binance.com/fapi/v3/account`

**Signature Format:** HMAC-SHA256 of query string parameters (hex encoded)

**CORS:** Requires proxy

```typescript
import { hmac_sha256_hex, get_timestamp } from '../crypto';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BinanceCredentials {
    api_key: string;
    api_secret: string;
}

const BASE_URL = 'https://fapi.binance.com';

export async function validate_binance(credentials: BinanceCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) {
        return { valid: false, error: 'api key and secret are required' };
    }

    const timestamp = get_timestamp();
    const recv_window = 5000;
    const query_string = `recvWindow=${recv_window}&timestamp=${timestamp}`;

    const signature = await hmac_sha256_hex(api_secret, query_string);
    const target_url = `${BASE_URL}/fapi/v3/account?${query_string}&signature=${signature}`;

    try {
        const response = await fetch(`${config.proxy_url}${target_url}`, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': api_key,
                'x-proxy-auth': config.proxy_auth,
            },
        });

        if (!response.ok) {
            const error_data = await response.json();
            return { valid: false, error: error_data.msg || 'validation failed' };
        }

        const data = await response.json();
        const usdt_balance = data.assets?.find((a: { asset: string }) => a.asset === 'USDT');
        const balance = parseFloat(usdt_balance?.walletBalance || '0');

        return { valid: true, error: null, balance };
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'network error' };
    }
}
```

---

### 3. Bybit Validator (`src/services/exchange/validators/bybit.ts`)

**Endpoint:** `GET https://api.bybit.com/v5/user/query-api`

**Signature Format:** HMAC-SHA256 of `timestamp + api_key + recv_window + query_string` (hex encoded)

**CORS:** Requires proxy

```typescript
import { hmac_sha256_hex, get_timestamp } from '../crypto';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BybitCredentials {
    api_key: string;
    api_secret: string;
}

const BASE_URL = 'https://api.bybit.com';

export async function validate_bybit(credentials: BybitCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) {
        return { valid: false, error: 'api key and secret are required' };
    }

    const timestamp = get_timestamp();
    const recv_window = 5000;
    const query_string = '';

    const sign_string = `${timestamp}${api_key}${recv_window}${query_string}`;
    const signature = await hmac_sha256_hex(api_secret, sign_string);

    try {
        const response = await fetch(`${config.proxy_url}${BASE_URL}/v5/user/query-api`, {
            method: 'GET',
            headers: {
                'X-BAPI-API-KEY': api_key,
                'X-BAPI-TIMESTAMP': timestamp.toString(),
                'X-BAPI-RECV-WINDOW': recv_window.toString(),
                'X-BAPI-SIGN': signature,
                'x-proxy-auth': config.proxy_auth,
            },
        });

        const data = await response.json();

        if (data.retCode !== 0) {
            return { valid: false, error: data.retMsg || 'validation failed' };
        }

        return { valid: true, error: null };
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'network error' };
    }
}
```

---

### 4. BloFin Validator (`src/services/exchange/validators/blofin.ts`)

**Endpoint:** `GET https://openapi.blofin.com/api/v1/user/query-apikey`

**Signature Format:** Base64 of raw HMAC-SHA256 bytes (NOT hex string) of `timestamp + method + path + body`

**CORS:** Requires proxy

```typescript
import { hmac_sha256_base64, get_timestamp, generate_nonce } from '../crypto';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BlofinCredentials {
    api_key: string;
    api_secret: string;
    passphrase: string;
}

const BASE_URL = 'https://openapi.blofin.com';

export async function validate_blofin(credentials: BlofinCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret, passphrase } = credentials;

    if (!api_key || !api_secret || !passphrase) {
        return { valid: false, error: 'api key, secret, and passphrase are required' };
    }

    const path = '/api/v1/user/query-apikey';
    const method = 'GET';
    const timestamp = get_timestamp().toString();
    const nonce = generate_nonce();
    const body = '';

    const prehash = `${timestamp}${method}${path}${body}`;
    const signature = await hmac_sha256_base64(api_secret, prehash);

    try {
        const response = await fetch(`${config.proxy_url}${BASE_URL}${path}`, {
            method: 'GET',
            headers: {
                'ACCESS-KEY': api_key,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp,
                'ACCESS-NONCE': nonce,
                'ACCESS-PASSPHRASE': passphrase,
                'x-proxy-auth': config.proxy_auth,
            },
        });

        const data = await response.json();

        if (data.code !== '0') {
            return { valid: false, error: data.msg || 'validation failed' };
        }

        return { valid: true, error: null };
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'network error' };
    }
}
```

---

### 5. Hyperliquid Validator (`src/services/exchange/validators/hyperliquid.ts`)

**Validation Method:** Two-step validation:
1. Derive address from private key and compare with provided wallet address (proves ownership)
2. Call the public info endpoint to verify account exists and get balance

**Info Endpoint:** `POST https://api.hyperliquid.xyz/info` (no authentication required, just wallet address)

**CORS:** Allows direct calls (no proxy needed)

```typescript
import { privateKeyToAccount } from 'viem/accounts';
import type { ExchangeValidationResult } from './types';

interface HyperliquidCredentials {
    wallet_address: string;
    private_key: string;
}

const INFO_URL = 'https://api.hyperliquid.xyz/info';

export async function validate_hyperliquid(credentials: HyperliquidCredentials): Promise<ExchangeValidationResult> {
    const { wallet_address, private_key } = credentials;

    if (!wallet_address || !private_key) {
        return { valid: false, error: 'wallet address and private key are required' };
    }

    try {
        const formatted_key = private_key.startsWith('0x') ? private_key : `0x${private_key}`;
        const account = privateKeyToAccount(formatted_key as `0x${string}`);
        const derived_address = account.address;

        if (derived_address.toLowerCase() !== wallet_address.toLowerCase()) {
            return { valid: false, error: 'private key does not match wallet address' };
        }

        const balance = await fetch_account_balance(wallet_address);

        return { valid: true, error: null, balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}

async function fetch_account_balance(wallet_address: string): Promise<number> {
    const response = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'clearinghouseState',
            user: wallet_address,
        }),
    });

    if (!response.ok) {
        throw new Error('failed to fetch account info');
    }

    const data = await response.json();
    const account_value = parseFloat(data.marginSummary?.accountValue || '0');

    return account_value;
}
```

**Note:** Uses viem for secp256k1 key derivation. This is the library recommended by the [Hyperliquid community TypeScript SDK](https://github.com/nktkas/hyperliquid).

---

### 6. Shared Types (`src/services/exchange/validators/types.ts`)

```typescript
export interface ExchangeValidationResult {
    valid: boolean;
    error: string | null;
    balance?: number;
}

export interface ExchangeValidationCredentials {
    api_key?: string;
    api_secret?: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
}
```

---

### 7. Unified Validator Export (`src/services/exchange/validators/index.ts`)

```typescript
import { validate_binance } from './binance';
import { validate_bybit } from './bybit';
import { validate_blofin } from './blofin';
import { validate_hyperliquid } from './hyperliquid';
import type { ExchangeId } from '@/types/credentials.types';
import type { ExchangeValidationResult, ExchangeValidationCredentials } from './types';

export type { ExchangeValidationResult, ExchangeValidationCredentials };

type ValidatorFn = (creds: ExchangeValidationCredentials) => Promise<ExchangeValidationResult>;

const validators: Record<ExchangeId, ValidatorFn> = {
    binance: (creds) => validate_binance({
        api_key: creds.api_key || '',
        api_secret: creds.api_secret || '',
    }),
    bybit: (creds) => validate_bybit({
        api_key: creds.api_key || '',
        api_secret: creds.api_secret || '',
    }),
    blofin: (creds) => validate_blofin({
        api_key: creds.api_key || '',
        api_secret: creds.api_secret || '',
        passphrase: creds.passphrase || '',
    }),
    hyperliquid: (creds) => validate_hyperliquid({
        wallet_address: creds.wallet_address || '',
        private_key: creds.private_key || '',
    }),
};

export async function validate_exchange_credentials(
    exchange_id: ExchangeId,
    credentials: ExchangeValidationCredentials
): Promise<ExchangeValidationResult> {
    const validator = validators[exchange_id];

    if (!validator) {
        return { valid: false, error: `unknown exchange: ${exchange_id}` };
    }

    return validator(credentials);
}
```

---

### 8. Update Exchange Service (`src/services/exchange/exchange.service.ts`)

Replace the existing `validate_exchange_credentials` function import:

```typescript
// Remove the existing validate_exchange_credentials function
// Add this import at the top:
export { validate_exchange_credentials } from './validators';
export type { ExchangeValidationResult, ExchangeValidationCredentials } from './validators';

// Keep all other exports (EXCHANGE_FIELD_CONFIG, EXCHANGE_NAMES, etc.)
```

---

## Dependencies

### Required Package (for Hyperliquid)

```bash
pnpm add viem
```

**Why viem?** Recommended by [Hyperliquid community TypeScript SDK](https://github.com/nktkas/hyperliquid). Modern, tree-shakeable (~40KB vs ethers ~120KB).

---

## Error Codes Reference

### Binance
| Code | Message |
|------|---------|
| -1021 | Timestamp outside recvWindow |
| -1022 | Signature invalid |
| -2015 | Invalid API key, IP, or permissions |

### Bybit
| retCode | Meaning |
|---------|---------|
| 10003 | Invalid API key |
| 10004 | Invalid sign |
| 10005 | Permission denied |

### BloFin
| Code | Meaning |
|------|---------|
| 50111 | Invalid API key |
| 50113 | Invalid signature |
| 50114 | Invalid passphrase |

---

## Security Considerations

1. **Secrets never leave the browser** - All signing happens client-side
2. **No backend storage** - Credentials stored in localStorage only
3. **HTTPS required** - All API calls use HTTPS
4. **Timestamp validation** - Prevents replay attacks
5. **Nonce usage** - BloFin requires unique nonces per request

---

## Testing

### Manual Testing Checklist

- [ ] Valid Binance credentials connect successfully
- [ ] Invalid Binance credentials show appropriate error
- [ ] Valid Bybit credentials connect successfully
- [ ] Invalid Bybit credentials show appropriate error
- [ ] Valid BloFin credentials (with passphrase) connect successfully
- [ ] Invalid BloFin credentials show appropriate error
- [ ] Valid Hyperliquid wallet/key pair validates
- [ ] Mismatched Hyperliquid wallet/key shows error
- [ ] Network errors are handled gracefully
- [ ] Loading states display correctly

---

## File Structure After Implementation

```
src/
├── config/
│   └── index.ts                 # Updated with proxy_url and proxy_auth
└── services/exchange/
    ├── crypto.ts                # HMAC-SHA256 utilities
    ├── exchange.service.ts      # Updated to re-export from validators
    ├── chart_data.ts            # Existing (unchanged)
    ├── init.ts                  # Existing (unchanged)
    └── validators/
        ├── types.ts             # Shared types
        ├── index.ts             # Unified export
        ├── binance.ts           # Binance validation
        ├── bybit.ts             # Bybit validation
        ├── blofin.ts            # BloFin validation
        └── hyperliquid.ts       # Hyperliquid validation
```

---

## Compliance with Guidelines

### CLAUDE.md Compliance

| Guideline | Status | Notes |
|-----------|--------|-------|
| Snake case for variables/functions | ✅ | All functions use snake_case |
| Destructuring | ✅ | Used throughout |
| Early returns | ✅ | Validation checks return early |
| Use null in state | ✅ | `error: string | null` pattern |
| No comments | ✅ | Code is self-documenting |
| Proper error handling | ✅ | Try/catch with typed errors |
| Self-documenting code | ✅ | Clear function and variable names |
| Lowercase error messages | ✅ | Matches existing codebase pattern |

### React Best Practices 2025 Compliance

| Practice | Status | Notes |
|----------|--------|-------|
| File structure | ✅ | Services in `src/services/exchange/validators/` |
| Separation of concerns | ✅ | Each validator is a separate module |
| TypeScript interfaces | ✅ | All props and results typed with `Exchange` prefix |
| Naming conventions | ✅ | PascalCase for types, snake_case for functions |
| Config centralization | ✅ | All config in `src/config/index.ts` |
| DRY principle | ✅ | Shared crypto utilities, unified export |
| Modularity | ✅ | Feature-based organization |
| Explicit return types | ✅ | All functions have return types |

---

## Sources

- [Binance Futures API - Account Endpoints](https://developers.binance.com/docs/derivatives/usds-margined-futures/account/rest-api/Account-Information-V3)
- [Bybit API - Get API Key Info](https://bybit-exchange.github.io/docs/v5/user/apikey-info)
- [BloFin API Documentation](https://docs.blofin.com/index.html)
- [BloFin Python SDK - Signature Implementation](https://github.com/blofin/blofin-sdk-python)
- [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Hyperliquid Official Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)
- [Hyperliquid Community TypeScript SDK](https://github.com/nktkas/hyperliquid)
- [Hyperliquid clearinghouseState](https://docs.chainstack.com/reference/hyperliquid-info-clearinghousestate)
- [viem Documentation](https://viem.sh/)
