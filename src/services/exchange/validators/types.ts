export interface ExchangeValidationResult {
    valid: boolean;
    error: string | null;
    balance?: number;
}

export interface ExchangeValidationCredentials {
    api_key?: string;
    api_secret?: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
}
