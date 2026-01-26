import blofin from 'ccxt/js/src/blofin.js';
import { PROXY_CONFIG } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BlofinCredentials {
    api_key: string;
    api_secret: string;
    passphrase: string;
}

export async function validate_blofin(
    credentials: BlofinCredentials
): Promise<ExchangeValidationResult> {
    const { api_key, api_secret, passphrase } = credentials;

    if (!api_key || !api_secret || !passphrase)
        return { valid: false, error: 'api key, secret, and passphrase are required' };

    const proxy = PROXY_CONFIG.blofin;
    const exchange = new blofin({
        apiKey: api_key,
        secret: api_secret,
        password: passphrase,
        proxy: proxy?.url,
        headers: proxy ? { 'x-proxy-auth': proxy.auth } : undefined,
    });

    try {
        const response = await exchange.privateGetAccountBalance();
        const details = response?.data?.details || [];
        const usdt = details.find((b: { ccy: string }) => b.ccy === 'USDT');
        const usdt_balance = Number(usdt?.equity ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
