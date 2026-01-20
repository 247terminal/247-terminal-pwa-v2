import * as ccxt from 'ccxt';
import { config } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BybitCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_bybit(credentials: BybitCredentials): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) return { valid: false, error: 'api key and secret are required' };

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