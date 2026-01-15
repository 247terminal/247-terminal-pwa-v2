interface AppConfig {
    api_base_url: string;
    ws_url: string;
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
        environment,
        is_dev: environment === 'development',
        is_prod: environment === 'production',
    };
}

export const config = get_config();
