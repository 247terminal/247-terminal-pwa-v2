import { validate_binance } from './binance';
import { validate_bybit } from './bybit';
import { validate_blofin } from './blofin';
import { validate_hyperliquid } from './hyperliquid';
import type { ExchangeId } from '@/types/credentials.types';
import type { ExchangeValidationResult, ExchangeValidationCredentials } from './types';

export type { ExchangeValidationResult, ExchangeValidationCredentials };

const NETWORK_ERROR_PATTERNS = [/timeout/i, /econnrefused/i, /enotfound/i, /network/i, /fetch failed/i];

export function get_auth_error_message(
    error: unknown,
    credential_type: 'api_key_secret' | 'wallet_private_key' | 'api_key_secret_passphrase'
): string {
    const raw_message = error instanceof Error ? error.message : String(error);
    const is_network_error = NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(raw_message));

    if (is_network_error) {
        return raw_message;
    }

    switch (credential_type) {
        case 'api_key_secret':
            return 'Invalid API key or secret.';
        case 'api_key_secret_passphrase':
            return 'Invalid API key, secret, or passphrase.';
        case 'wallet_private_key':
            return 'Invalid wallet address or private key.';
    }
}

type ValidatorFn = (creds: ExchangeValidationCredentials) => Promise<ExchangeValidationResult>;

const validators: Record<ExchangeId, ValidatorFn> = {
    binance: (creds) =>
        validate_binance({
            api_key: creds.api_key || '',
            api_secret: creds.api_secret || '',
        }),
    bybit: (creds) =>
        validate_bybit({
            api_key: creds.api_key || '',
            api_secret: creds.api_secret || '',
        }),
    blofin: (creds) =>
        validate_blofin({
            api_key: creds.api_key || '',
            api_secret: creds.api_secret || '',
            passphrase: creds.passphrase || '',
        }),
    hyperliquid: (creds) =>
        validate_hyperliquid({
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
