import * as ccxt from 'ccxt';
import { privateKeyToAccount } from 'viem/accounts';
import type { ExchangeValidationResult } from './types';

interface HyperliquidCredentials {
    wallet_address: string;
    private_key: string;
}

export async function validate_hyperliquid(credentials: HyperliquidCredentials): Promise<ExchangeValidationResult> {
    const { wallet_address, private_key } = credentials;

    if (!wallet_address || !private_key) return { valid: false, error: 'wallet address and private key are required' };

    try {
        const formatted_key = private_key.startsWith('0x') ? private_key : `0x${private_key}`;
        const account = privateKeyToAccount(formatted_key as `0x${string}`);
        const derived_address = account.address;

        if (derived_address.toLowerCase() !== wallet_address.toLowerCase()) return { valid: false, error: 'private key does not match wallet address' };

        const exchange = new ccxt.hyperliquid({
            walletAddress: wallet_address,
            privateKey: formatted_key,
        });

        const balance = await exchange.fetchBalance();
        const usdt_balance = Number(balance['USDC']?.total ?? balance['USD']?.total ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'validation failed';
        return { valid: false, error: message };
    }
}