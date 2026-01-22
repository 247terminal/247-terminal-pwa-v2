import type { UserSettings } from '@/types/settings.types';

export const SETTINGS_STORAGE_KEY = '247terminal_settings_v2';
export const SETTINGS_SYNC_DEBOUNCE = 2000;

export const DEFAULT_SETTINGS: UserSettings = {
    exchange: {
        preferred: 'bybit',
        enabled_exchanges: ['bybit'],
    },
    trading: {
        sizes: [100, 500, 1000, 5000],
        size_count: 4,
        button_style: 'standard',
        freeze_on_hover: true,
        full_size_media: false,
        disable_media: false,
        slippage: 'MARKET',
        auto_tp_enabled: false,
        auto_tp_value: 5,
        auto_tp_limit: false,
        auto_sl_enabled: false,
        auto_sl_value: 3,
        unique_shortcuts: false,
    },
    terminal: {
        auto_login: false,
        push_notifications: true,
        notification_filter: 'all',
        share_trades: false,
        show_profit: false,
    },
    chart: {
        default_timeframe: '5m',
        order_history: true,
        up_candle_color: '#00C853',
        down_candle_color: '#FF1744',
        chart_tickers: [],
        favorite_tickers: [],
    },
    news_providers: {
        phoenix_enabled: false,
        tree_enabled: false,
        synoptic_enabled: false,
        groq_enabled: false,
    },
    news_display: {
        deduplicator: true,
        text_shortener: false,
        directional_highlight: true,
        price_movement_highlight: true,
        price_movement_threshold: 5,
        price_movement_notification: false,
        hide_tickerless: false,
        translation_enabled: false,
        translation_language: 'en',
        delay_threshold: 5000,
        history_limit: 100,
        auto_clear_seconds: 0,
        font_size: 12,
    },
    keywords: {
        blacklisted_words: [],
        blacklisted_coins: [],
        critical_words: [],
        special_words: [],
        custom_mappings: [],
        blacklisted_sources: [],
    },
    custom_websockets: [],
    botting: {
        enabled: false,
        cooldown_hours: 1,
        mobile_notification_enabled: false,
        ntfy_topic: '',
        auto_pause_enabled: false,
        auto_pause_timeframe: '1',
        auto_pause_threshold: 10,
    },
    shortcuts: {
        disabled: false,
        nuke_all: { modifier_1: 'CTRL', modifier_2: 'SHIFT', key: 'N' },
        bindings: {},
    },
    ui_zoom: 1,
};

export const TIMEFRAME_OPTIONS = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: 'D', label: 'D' },
    { value: 'W', label: 'W' },
] as const;

export const NOTIFICATION_FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'critical', label: 'Critical Only' },
    { value: 'special', label: 'Special Only' },
    { value: 'both', label: 'Critical & Special' },
] as const;
