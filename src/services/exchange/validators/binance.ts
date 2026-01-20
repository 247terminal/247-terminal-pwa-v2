import { hmac_sha256_hex, get_timestamp } from '../crypto';
import { config, EXCHANGE_CONFIG } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BinanceCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_binance(credentials: BinanceCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;
    const { restUrl } = EXCHANGE_CONFIG.binance;

    if (!api_key || !api_secret) return { valid: false, error: 'api key and secret are required' };
}