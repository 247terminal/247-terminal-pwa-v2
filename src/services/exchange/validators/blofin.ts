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

    if (!api_key || !api_secret || !passphrase) return { valid: false, error: 'api key, secret, and passphrase are required' };

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