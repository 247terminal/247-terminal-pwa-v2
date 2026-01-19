interface AppConfig {
    api_base_url: string;
    ws_url: string;
    proxy_url: string;
    proxy_auth: string;
    environment: 'development' | 'production';
    is_dev: boolean;
    is_prod: boolean;
}

function get_config(): AppConfig {
    const env = import.meta.env;
    const environment = env.MODE === 'production' ? 'production' : 'development';

    return {
        api_base_url: env.VITE_API_URL || '',
        ws_url: env.VITE_WS_URL || '',
        proxy_url: env.VITE_PROXY_URL || 'https://proxy2.247terminal.com/',
        proxy_auth: env.VITE_PROXY_AUTH || '5cbb9da977ea3740b4dcdfeea9b020c8f6de45c2d0314f549723e8a4207c288a',
        environment,
        is_dev: environment === 'development',
        is_prod: environment === 'production',
    };
}

export const config = get_config();
