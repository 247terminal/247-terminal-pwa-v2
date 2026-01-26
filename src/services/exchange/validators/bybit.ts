import bybit from 'ccxt/js/src/bybit.js';
import type { ExchangeValidationResult } from './types';
import { get_auth_error_message } from './index';

interface BybitCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_bybit(
    credentials: BybitCredentials
): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) return { valid: false, error: 'api key and secret are required' };

    const exchange = new bybit({
        apiKey: api_key,
        secret: api_secret,
    });

    try {
        const response = await exchange.privateGetV5AccountWalletBalance({
            accountType: 'UNIFIED',
        });
        const coins = response?.result?.list?.[0]?.coin || [];
        const usdt = coins.find((c: { coin: string }) => c.coin === 'USDT');
        const usdt_balance = Number(usdt?.walletBalance ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = get_auth_error_message(err, 'api_key_secret');
        return { valid: false, error: message };
    }
}
