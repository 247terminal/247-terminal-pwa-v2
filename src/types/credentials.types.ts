export type ExchangeId = 'bybit' | 'binance' | 'blofin' | 'hyperliquid';

export interface ExchangeCredentials {
    api_key: string;
    api_secret: string;
    passphrase?: string;
    wallet_address?: string;
    private_key?: string;
    hedge_mode: boolean;
    connected: boolean;
    last_validated: number | null;
}

export interface NewsProviderCredentials {
    phoenix_key: string;
    tree_key: string;
    synoptic_key: string;
    groq_key: string;
}

export interface UserCredentials {
    exchanges: Record<ExchangeId, ExchangeCredentials>;
    news_providers: NewsProviderCredentials;
}

export interface CredentialsState {
    credentials: UserCredentials | null;
    loaded: boolean;
}
