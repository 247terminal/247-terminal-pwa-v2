# Exchange Credential Validation Implementation Guide

## Overview

This guide details the implementation of credential validation for each supported exchange (Binance, Bybit, BloFin, Hyperliquid). The approach uses **CCXT's unified API** to handle authentication, signing, and API calls consistently across all exchanges.

## Architecture Decision

**All validation happens on the frontend.** Since credentials are stored locally only and never synced to the server, there is no need for backend involvement. This keeps secrets secure in the browser and reduces latency.

## CORS Consideration

**Critical:** Exchange REST APIs do not set `Access-Control-Allow-Origin` headers, so direct browser fetch calls will be blocked by CORS policy.

### Solution

Use the **existing proxy** (`https://proxy2.247terminal.com/`) for exchanges that block CORS. CCXT can be configured with a proxy URL. The proxy forwards requests without storing credentials, and all traffic is HTTPS encrypted.

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
| `src/services/exchange/validators/types.ts` | **CREATE** - Shared validation types |
| `src/services/exchange/validators/binance.ts` | **CREATE** - Binance validation |
| `src/services/exchange/validators/bybit.ts` | **CREATE** - Bybit validation |
| `src/services/exchange/validators/blofin.ts` | **CREATE** - BloFin validation |
| `src/services/exchange/validators/hyperliquid.ts` | **CREATE** - Hyperliquid validation |
| `src/services/exchange/validators/index.ts` | **CREATE** - Unified validator export |
| `src/services/exchange/exchange.service.ts` | **MODIFY** - Update validate_exchange_credentials |

### Backend (247-terminal-backend)

**No changes required.** Credentials are validated client-side only.

---

## Dependencies

### CCXT - ALREADY INSTALLED

**Status:** `ccxt@4.5.32` is already installed in package.json. No action required.

CCXT handles:
- API authentication and signing for all exchanges
- Request/response formatting
- Error handling and retries
- Rate limiting

### viem - ALREADY INSTALLED

**Status:** `viem@2.44.4` is already installed in package.json. No action required.

Used for Hyperliquid wallet address derivation from private key.

---

## Implementation Details

### 1. Shared Types (`src/services/exchange/validators/types.ts`)

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

### 2. Binance Validator (`src/services/exchange/validators/binance.ts`)

Uses CCXT's `binanceusdm` class for USDT-M Futures.

```typescript
import * as ccxt from 'ccxt';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BinanceCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_binance(credentials: BinanceCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) {
        return { valid: false, error: 'api key and secret are required' };
    }

    const exchange = new ccxt.binanceusdm({
        apiKey: api_key,
        secret: api_secret,
        proxy: config.proxy_url,
        headers: {
            'x-proxy-auth': config.proxy_auth,
        },
    });

    try {
        const balance = await exchange.fetchBalance();
        const usdt_balance = Number(balance['USDT']?.total ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
```

---

### 3. Bybit Validator (`src/services/exchange/validators/bybit.ts`)

Uses CCXT's `bybit` class.

```typescript
import * as ccxt from 'ccxt';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BybitCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_bybit(credentials: BybitCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) {
        return { valid: false, error: 'api key and secret are required' };
    }

    const exchange = new ccxt.bybit({
        apiKey: api_key,
        secret: api_secret,
        proxy: config.proxy_url,
        headers: {
            'x-proxy-auth': config.proxy_auth,
        },
    });

    try {
        const balance = await exchange.fetchBalance({ type: 'swap' });
        const usdt_balance = Number(balance['USDT']?.total ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
```

---

### 4. BloFin Validator (`src/services/exchange/validators/blofin.ts`)

Uses CCXT's `blofin` class. Requires passphrase.

```typescript
import * as ccxt from 'ccxt';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BlofinCredentials {
    api_key: string;
    api_secret: string;
    passphrase: string;
}

export async function validate_blofin(credentials: BlofinCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret, passphrase } = credentials;

    if (!api_key || !api_secret || !passphrase) {
        return { valid: false, error: 'api key, secret, and passphrase are required' };
    }

    const exchange = new ccxt.blofin({
        apiKey: api_key,
        secret: api_secret,
        password: passphrase,
        proxy: config.proxy_url,
        headers: {
            'x-proxy-auth': config.proxy_auth,
        },
    });

    try {
        const balance = await exchange.fetchBalance();
        const usdt_balance = Number(balance['USDT']?.total ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
```

---

### 5. Hyperliquid Validator (`src/services/exchange/validators/hyperliquid.ts`)

Hyperliquid uses wallet-based authentication. Validation is two-step:
1. Derive address from private key using viem and compare with provided wallet address
2. Use CCXT to fetch balance (proves account exists)

```typescript
import * as ccxt from 'ccxt';
import { privateKeyToAccount } from 'viem/accounts';
import type { ExchangeValidationResult } from './types';

interface HyperliquidCredentials {
    wallet_address: string;
    private_key: string;
}

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

        const exchange = new ccxt.hyperliquid({
            walletAddress: wallet_address,
            privateKey: formatted_key,
        });

        const balance = await exchange.fetchBalance();
        const usdt_balance = Number(balance['USDC']?.total ?? balance['USD']?.total ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
```

**Note:** Hyperliquid allows CORS, so no proxy is needed.

---

### 6. Unified Validator Export (`src/services/exchange/validators/index.ts`)

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

### 7. Update Exchange Service (`src/services/exchange/exchange.service.ts`)

Replace the existing `validate_exchange_credentials` function:

```typescript
// Remove the existing validate_exchange_credentials function
// Add this import at the top:
export { validate_exchange_credentials } from './validators';
export type { ExchangeValidationResult, ExchangeValidationCredentials } from './validators';

// Keep all other exports (EXCHANGE_FIELD_CONFIG, EXCHANGE_NAMES, etc.)
```

---

## Security Considerations

1. **Secrets never leave the browser** - All signing happens client-side via CCXT
2. **No backend storage** - Credentials stored in localStorage only
3. **HTTPS required** - All API calls use HTTPS
4. **Proxy is stateless** - Proxy forwards requests without logging credentials

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
└── services/exchange/
    ├── crypto.ts                # ✓ EXISTS (unchanged, used elsewhere)
    ├── exchange.service.ts      # MODIFY - re-export from validators
    ├── chart_data.ts            # ✓ EXISTS (unchanged)
    ├── init.ts                  # ✓ EXISTS (unchanged)
    └── validators/              # CREATE - new directory
        ├── types.ts             # CREATE - shared types
        ├── index.ts             # CREATE - unified export
        ├── binance.ts           # CREATE - Binance validation
        ├── bybit.ts             # CREATE - Bybit validation
        ├── blofin.ts            # CREATE - BloFin validation
        └── hyperliquid.ts       # CREATE - Hyperliquid validation
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
| TypeScript interfaces | ✅ | All props and results typed |
| Naming conventions | ✅ | PascalCase for types, snake_case for functions |
| Config centralization | ✅ | Proxy config from `src/config/index.ts` |
| DRY principle | ✅ | CCXT handles all signing logic |
| Modularity | ✅ | Feature-based organization |
| Explicit return types | ✅ | All functions have return types |

---

## Sources

- [CCXT Documentation](https://docs.ccxt.com/)
- [CCXT GitHub](https://github.com/ccxt/ccxt)
- [viem Documentation](https://viem.sh/)
- [Hyperliquid Community TypeScript SDK](https://github.com/nktkas/hyperliquid)
