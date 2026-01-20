import * as ccxt from 'ccxt';
import { PROXY_CONFIG } from '@/config';
import type { ExchangeValidationResult } from './types';

interface BinanceCredentials {
    api_key: string;
    api_secret: string;
}

export async function validate_binance(
    credentials: BinanceCredentials
): Promise<ExchangeValidationResult> {
    const { api_key, api_secret } = credentials;

    if (!api_key || !api_secret) return { valid: false, error: 'api key and secret are required' };

    const proxy = PROXY_CONFIG.binance;
    const exchange = new ccxt.binanceusdm({
        apiKey: api_key,
        secret: api_secret,
        proxy: proxy?.url,
        headers: proxy ? { 'x-proxy-auth': proxy.auth } : undefined,
    });

    try {
        const response = await exchange.fapiPrivateV2GetBalance();
        const usdt = response?.find((b: { asset: string }) => b.asset === 'USDT');
        const usdt_balance = Number(usdt?.balance ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}
