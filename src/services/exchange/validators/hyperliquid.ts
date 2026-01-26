import hyperliquid from 'ccxt/js/src/hyperliquid.js';
import type { ExchangeValidationResult } from './types';
import { get_auth_error_message } from './index';

interface HyperliquidCredentials {
    wallet_address: string;
    private_key: string;
}

function is_valid_private_key(key: string): boolean {
    const hex = key.startsWith('0x') ? key.slice(2) : key;
    return /^[a-fA-F0-9]{64}$/.test(hex);
}

export async function validate_hyperliquid(
    credentials: HyperliquidCredentials
): Promise<ExchangeValidationResult> {
    const { wallet_address, private_key } = credentials;

    if (!wallet_address || !private_key)
        return { valid: false, error: 'wallet address and private key are required' };

    try {
        const formatted_key = private_key.startsWith('0x') ? private_key : `0x${private_key}`;

        if (!is_valid_private_key(formatted_key)) {
            return { valid: false, error: 'invalid private key format' };
        }

        const exchange = new hyperliquid({
            walletAddress: wallet_address,
            privateKey: formatted_key,
        });

        const response = await exchange.publicPostInfo({
            type: 'clearinghouseState',
            user: wallet_address,
        });
        const usdt_balance = Number(response?.marginSummary?.accountValue ?? 0);

        return { valid: true, error: null, balance: usdt_balance };
    } catch (err) {
        const message = get_auth_error_message(err, 'wallet_private_key');
        return { valid: false, error: message };
    }
}
