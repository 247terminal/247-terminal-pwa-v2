import { validate_binance } from './binance';
import { validate_bybit } from './bybit';
import { validate_blofin } from './blofin';
import { validate_hyperliquid } from './hyperliquid';
import type { ExchangeId } from '@/types/credentials.types';
import type { ExchangeValidationResult, ExchangeValidationCredentials } from './types';

export type { ExchangeValidationResult, ExchangeValidationCredentials };

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
