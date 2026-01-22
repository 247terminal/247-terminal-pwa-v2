import type { ExchangeId } from './exchange.types';
import type { UserCredentials } from './credentials.types';

export interface ExchangePreferences {
    preferred: ExchangeId;
    enabled_exchanges: ExchangeId[];
}

export interface TradingSettings {
    sizes: [number, number, number, number];
    size_count: 1 | 2 | 4;
    button_style: 'swipe' | 'standard';
    freeze_on_hover: boolean;
    full_size_media: boolean;
    disable_media: boolean;
    slippage: number | 'MARKET';
    auto_tp_enabled: boolean;
    auto_tp_value: number;
    auto_tp_limit: boolean;
    auto_sl_enabled: boolean;
    auto_sl_value: number;
    unique_shortcuts: boolean;
}

export interface TerminalSettings {
    auto_login: boolean;
    push_notifications: boolean;
    notification_filter: 'all' | 'critical' | 'special' | 'both';
    share_trades: boolean;
    show_profit: boolean;
}

export interface ChartSettings {
    default_timeframe: string;
    up_candle_color: string;
    down_candle_color: string;
    chart_tickers: string[];
    favorite_tickers: string[];
}

export interface NewsProviderToggles {
    phoenix_enabled: boolean;
    tree_enabled: boolean;
    synoptic_enabled: boolean;
    groq_enabled: boolean;
}

export interface NewsDisplaySettings {
    deduplicator: boolean;
    text_shortener: boolean;
    directional_highlight: boolean;
    price_movement_highlight: boolean;
    price_movement_threshold: number;
    price_movement_notification: boolean;
    hide_tickerless: boolean;
    translation_enabled: boolean;
    translation_language: string;
    delay_threshold: number;
    history_limit: number;
    auto_clear_seconds: number;
}

export interface KeywordSettings {
    blacklisted_words: string[];
    blacklisted_coins: string[];
    critical_words: string[];
    special_words: string[];
    custom_mappings: string[];
    blacklisted_sources: string[];
}

export interface CustomWebSocket {
    id: string;
    name: string;
    url: string;
    login_message: string;
    title_key: string;
    body_key: string;
    icon_key: string;
    timestamp_key: string;
    link_key: string;
}

export interface BottingSettings {
    enabled: boolean;
    cooldown_hours: number;
    mobile_notification_enabled: boolean;
    ntfy_topic: string;
    auto_pause_enabled: boolean;
    auto_pause_timeframe: string;
    auto_pause_threshold: number;
}

export interface ShortcutBinding {
    modifier_1: 'CTRL' | 'SHIFT' | 'NONE';
    modifier_2: 'CTRL' | 'SHIFT' | 'NONE';
    key: string;
}

export interface ShortcutSettings {
    disabled: boolean;
    nuke_all: ShortcutBinding;
    bindings: Record<string, ShortcutBinding>;
}

export interface UserSettings {
    exchange: ExchangePreferences;
    trading: TradingSettings;
    terminal: TerminalSettings;
    chart: ChartSettings;
    news_providers: NewsProviderToggles;
    news_display: NewsDisplaySettings;
    keywords: KeywordSettings;
    custom_websockets: CustomWebSocket[];
    botting: BottingSettings;
    shortcuts: ShortcutSettings;
    ui_zoom: number;
}

export interface EncryptedSettings {
    iv: string;
    auth_tag: string;
    data: string;
}

export type SettingsStatus = 'loading' | 'ready' | 'saving' | 'error';

export interface SettingsState {
    status: SettingsStatus;
    settings: UserSettings | null;
    error: string | null;
    last_synced: number | null;
}

export interface ToggleProps {
    label: string;
    checked: boolean;
    on_change: (checked: boolean) => void;
}

export interface NumberInputProps {
    label: string;
    value: number;
    on_change: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}

export interface ToggleWithSliderProps {
    label: string;
    checked: boolean;
    on_toggle: (checked: boolean) => void;
    value: number;
    on_value_change: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
}

export interface ColorInputProps {
    label: string;
    value: string;
    on_change: (value: string) => void;
}

export interface ShortcutEditorProps {
    label: string;
    binding: ShortcutBinding;
    on_change: (binding: ShortcutBinding) => void;
}

export interface ShortcutRowProps {
    label: string;
    binding_key: string;
    binding: ShortcutBinding | undefined;
    on_change: (key: string, binding: ShortcutBinding) => void;
}

export interface KeywordListProps {
    label: string;
    items: string[];
    on_add: (item: string) => void;
    on_remove: (index: number) => void;
    placeholder?: string;
}

export interface ExportData {
    version: number;
    exported_at: number;
    settings: UserSettings;
    credentials?: UserCredentials;
}

export type SettingsSectionId =
    | 'news_feed'
    | 'trading'
    | 'terminal'
    | 'chart'
    | 'news'
    | 'keywords'
    | 'shortcuts'
    | 'botting'
    | 'backup';

export interface SettingsDrawerProps {
    is_open: boolean;
    on_close: () => void;
}

export interface AccordionSectionProps {
    id: SettingsSectionId;
    title: string;
    icon?: preact.ComponentChildren;
    expanded_section: SettingsSectionId | null;
    on_toggle: (id: SettingsSectionId) => void;
    children: preact.ComponentChildren;
}
