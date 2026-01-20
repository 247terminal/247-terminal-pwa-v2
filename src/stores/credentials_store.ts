import { signal, computed } from '@preact/signals';
import { encrypt, decrypt, is_encrypted } from '@/utils/encryption';
import type {
    UserCredentials,
    CredentialsState,
    ExchangeId,
    ExchangeCredentials,
} from '@/types/credentials.types';

const CREDENTIALS_STORAGE_KEY = '247terminal_credentials';

const DEFAULT_EXCHANGE_CREDENTIALS: ExchangeCredentials = {
    api_key: '',
    api_secret: '',
    connected: false,
    last_validated: null,
};

const DEFAULT_CREDENTIALS: UserCredentials = {
    exchanges: {
        bybit: { ...DEFAULT_EXCHANGE_CREDENTIALS },
        binance: { ...DEFAULT_EXCHANGE_CREDENTIALS },
        blofin: { ...DEFAULT_EXCHANGE_CREDENTIALS, passphrase: '' },
        hyperliquid: { ...DEFAULT_EXCHANGE_CREDENTIALS, wallet_address: '', private_key: '' },
    },
    news_providers: {
        phoenix_key: '',
        tree_key: '',
        synoptic_key: '',
        groq_key: '',
    },
};

export const credentials_state = signal<CredentialsState>({
    credentials: DEFAULT_CREDENTIALS,
    loaded: false,
});

async function load_from_storage(): Promise<UserCredentials | null> {
    try {
        const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
        if (!stored) return null;

        if (is_encrypted(stored)) {
            const decrypted = await decrypt(stored);
            return JSON.parse(decrypted);
        }

        return JSON.parse(stored);
    } catch (error) {
        console.error('failed to load credentials:', error);
        return null;
    }
}

async function save_to_storage(credentials: UserCredentials): Promise<void> {
    try {
        const json = JSON.stringify(credentials);
        const encrypted = await encrypt(json);
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, encrypted);
    } catch (error) {
        console.error('failed to save credentials:', error);
    }
}

export async function init_credentials(): Promise<void> {
    const stored = await load_from_storage();
    credentials_state.value = {
        credentials: stored || DEFAULT_CREDENTIALS,
        loaded: true,
    };
}

export const credentials = computed(() => credentials_state.value.credentials);

export const exchange_credentials = computed(
    () => credentials.value?.exchanges ?? DEFAULT_CREDENTIALS.exchanges
);

export const exchange_connection_status = computed(() => {
    const exchanges = exchange_credentials.value;
    return {
        bybit: exchanges.bybit.connected,
        binance: exchanges.binance.connected,
        blofin: exchanges.blofin.connected,
        hyperliquid: exchanges.hyperliquid.connected,
    };
});

export function get_exchange_credentials(exchange_id: ExchangeId): ExchangeCredentials {
    return exchange_credentials.value[exchange_id];
}

export function update_exchange_credentials(
    exchange_id: ExchangeId,
    updates: Partial<ExchangeCredentials>
): void {
    const current = credentials.value;
    if (!current) return;

    const updated: UserCredentials = {
        ...current,
        exchanges: {
            ...current.exchanges,
            [exchange_id]: {
                ...current.exchanges[exchange_id],
                ...updates,
            },
        },
    };

    credentials_state.value = {
        credentials: updated,
        loaded: true,
    };

    save_to_storage(updated);
}

export function disconnect_exchange(exchange_id: ExchangeId): void {
    update_exchange_credentials(exchange_id, {
        api_key: '',
        api_secret: '',
        passphrase: '',
        wallet_address: '',
        private_key: '',
        connected: false,
        last_validated: null,
    });
}

export function clear_all_credentials(): void {
    credentials_state.value = {
        credentials: { ...DEFAULT_CREDENTIALS },
        loaded: true,
    };
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
}

export const has_connected_exchange = computed(() => {
    const status = exchange_connection_status.value;
    return status.bybit || status.binance || status.blofin || status.hyperliquid;
});
