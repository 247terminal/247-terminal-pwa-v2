import * as ccxt from 'ccxt';
import type { ExchangeValidationResult } from './types';

interface BybitCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_bybit(
    credentials: BybitCredentials
): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) return { valid: false, error: 'api key and secret are required' };

    const exchange = new ccxt.bybit({
        apiKey: api_key,
        secret: api_secret,
    });

    try {
        const response = await exchange.privateGetV5AccountWalletBalance({ accountType: 'UNIFIED' });
        const coins = response?.result?.list?.[0]?.coin || [];
        const usdt = coins.find((c: { coin: string }) => c.coin === 'USDT');
        const usdt_balance = Number(usdt?.walletBalance ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
