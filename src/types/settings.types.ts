import type { ExchangeId } from '@/types/exchange.types';

export interface ExchangeCredentials {
    api_key: string;
    api_secret: string;
    passphrase: string;
    walletaddress: string;
    private_key: string;
    enabled: boolean;
}

export interface ExchangeConfig {
    preferred: ExchangeId;
    exchanges: Record<ExchangeId, ExchangeCredentials>;
}

export interface TradingSizes {
    size_1: number;
    size_2: number;
    size_3: number;
    size_4: number;
    active_count: number;
}

export interface KeyboardShortcut {
    modifier_1: 'CTRL' | 'SHIFT' | 'NONE';
    modifier_2: 'CTRL' | 'SHIFT' | 'NONE';
    key: string;
}

export interface KeyboardShortcuts {
    buy_1: KeyboardShortcut;
    sell_1: KeyboardShortcut;
    buy_2: KeyboardShortcut;
    sell_2: KeyboardShortcut;
    buy_3: KeyboardShortcut;
    sell_3: KeyboardShortcut;
    buy_4: KeyboardShortcut;
    sell_4: KeyboardShortcut;
    nuke: KeyboardShortcut;
}

export interface NewsFilters {
    blacklisted_sources: string[];
    blacklisted_coins: string[];
    critical_keywords: string[];
    custom_keywords: string[];
}

export interface NewsSources {
    tree_enabled: boolean;
    tree_key: string;
    phoenix_enabled: boolean;
    phoenix_key: string;
    synoptic_enabled: boolean;
    synoptic_key: string;
}

export interface NewsDisplay {
    font_size: number;
    items_threshold: number;
    deduplicator: boolean;
    directional_highlight: boolean;
    full_images: boolean;
    disable_media: boolean;
}

export interface ChartPreferences {
    default_timeframe: string;
    up_candle_color: string;
    down_candle_color: string;
}

export interface UIPreferences {
    desktop_notifications: boolean;
    auto_login: boolean;
    privacy_mode: boolean;
}

export interface AppSettings {
    exchange: ExchangeConfig;
    trading_sizes: TradingSizes;
    slippage: string;
    auto_tp_enabled: boolean;
    auto_tp_percent: number;
    auto_sl_enabled: boolean;
    auto_sl_percent: number;
    keyboard: KeyboardShortcuts;
    news_sources: NewsSources;
    news_filters: NewsFilters;
    news_display: NewsDisplay;
    chart: ChartPreferences;
    ui: UIPreferences;
    license: string;
    uid: string;
}

export interface EncryptedSettings {
    iv: string;
    auth_tag: string;
    data: string;
}

export type SettingsSection =
    | 'exchange'
    | 'trading'
    | 'keyboard'
    | 'news'
    | 'chart'
    | 'ui'
    | 'backup';
