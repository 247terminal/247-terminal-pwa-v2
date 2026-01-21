export const CHART_CONSTANTS = {
    VISIBLE_CANDLES: 100,
    RIGHT_OFFSET: 20,
    COMPACT_HEIGHT_THRESHOLD: 300,
    RESIZE_DEBOUNCE_MS: 16,
    DEFAULT_TICK_SIZE: 0.01,
} as const;

export const STORAGE_CONSTANTS = {
    CHART_SETTINGS_KEY: '247terminal_chart_settings',
    DEBOUNCE_MS: 300,
} as const;

export const GRID_CONSTANTS = {
    ROWS: 16,
    COLS: 16,
    MARGIN: 8,
    HEADER_HEIGHT: 40,
} as const;

export const TICKER_CONSTANTS = {
    PRICE_FLASH_DURATION_MS: 3000,
} as const;

export const MARKET_CAP_CONSTANTS = {
    CACHE_TTL_MS: 4 * 60 * 60 * 1000,
} as const;
