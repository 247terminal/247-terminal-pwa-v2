import { get_auth_headers } from '@/services/auth/auth.service';
import type { ExchangeId } from '@/types/credentials.types';
import { config } from '@/config';

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
        const response = await fetch(`${config.api_base_url}/v1/app/exchange/validate`, {
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
            return { valid: false, error: error.message || 'validation failed' };
        }

        const result = await response.json();
        return { valid: true, error: null, balance: result.data?.balance };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'network error',
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
