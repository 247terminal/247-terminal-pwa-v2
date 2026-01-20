import type { ExchangeId } from '@/types/credentials.types';

export interface ExchangeValidationRequest {
    api_key: string;
    api_secret: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
}

export { validate_exchange_credentials } from './validators';
export type { ExchangeValidationResult, ExchangeValidationCredentials } from './validators';

export const EXCHANGE_FIELD_CONFIG: Record<ExchangeId, string[]> = {
    bybit: ['api_key', 'api_secret'],
    binance: ['api_key', 'api_secret'],
    blofin: ['api_key', 'api_secret', 'passphrase'],
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

export const EXCHANGE_LINKS: Record<ExchangeId, { open_account: string; api_management: string }> =
    {
        bybit: {
            open_account: 'https://partner.bybit.com/b/140043',
            api_management: 'https://www.bybit.com/app/user/api-management',
        },
        blofin: {
            open_account: 'https://partner.blofin.com/d/247',
            api_management: 'https://blofin.com/account/apis',
        },
        binance: {
            open_account: 'https://www.binance.com/',
            api_management: 'https://www.binance.com/en/my/settings/api-management',
        },
        hyperliquid: {
            open_account: 'https://app.hyperliquid.xyz/join',
            api_management: 'https://app.hyperliquid.xyz/API',
        },
    };

export const EXCHANGE_SETUP_GUIDES: Record<ExchangeId, { steps: string[]; notes: string[] }> = {
    bybit: {
        steps: [
            'Log in to your Bybit account',
            'Navigate to API Management',
            'Click "Upgrade to UTA Pro" if prompted',
            'Click "Create New Key"',
            'Select System-generated or Self-generated API Keys',
            'Select "Connect to Third-Party Applications", choose "247Terminal"',
            'Enable Read-Write permission, set Order and Position permissions under Unified Trading',
            'Copy API key and secret, paste in fields above',
        ],
        notes: [
            'Only Unified trading accounts are supported',
            'Optional: Use your IP address for IP restriction',
        ],
    },
    blofin: {
        steps: [
            'Log in to your BloFin account',
            'Navigate to API Management',
            'Click "Create API Key"',
            'Select "Connect to Third-Party Applications", choose "247 Terminal"',
            'Choose your Passphrase',
            'Enable Read and Trade permissions',
            'Copy API key, secret, and passphrase',
        ],
        notes: ['Check if your account has hedge-mode or one-way mode selected'],
    },
    binance: {
        steps: [
            'Log in to your Binance account',
            'Navigate to API Management',
            'Click "Create API key"',
            'Name it and complete verification steps',
            'Tick "Enable Futures" permission',
            'Copy API key and secret, paste in fields above',
        ],
        notes: [
            'Only Classic trading accounts are supported',
            'Server IPs for restriction: 66.42.61.1 45.32.109.173 139.180.223.116 207.148.68.77 45.77.253.54',
        ],
    },
    hyperliquid: {
        steps: [
            'Log in to Hyperliquid by signing via your crypto wallet',
            'Navigate to API Management',
            'Enter a name for your API wallet, click Generate',
            'Click "Authorize API Wallet"',
            'For Valid Days, select Max',
            'Copy the Private Key displayed',
            'Press Authorize and sign with your wallet',
            'Copy your main wallet address and private key',
        ],
        notes: [
            'Builder fee of 0.01% required for trading',
            'Vault and subaccount trading are not supported',
        ],
    },
};
