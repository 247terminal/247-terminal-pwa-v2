export const CHART_CONSTANTS = {
    VISIBLE_CANDLES: 100,
    RIGHT_OFFSET: 20,
    COMPACT_HEIGHT_THRESHOLD: 450,
    RESIZE_DEBOUNCE_MS: 16,
    DEFAULT_TICK_SIZE: 0.01,
} as const;

export const DRAWING_TOOLBAR_CONSTANTS = {
    COLLAPSE_HEIGHT_THRESHOLD: 350,
} as const;

export const STORAGE_CONSTANTS = {
    CHART_SETTINGS_KEY: '247terminal_chart_settings',
    ACCOUNT_PRIVACY_KEY: '247terminal_account_privacy',
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

export const EMA_CONSTANTS = {
    DEFAULT_PERIOD: 50,
    COLOR: '#2962ff',
    LINE_WIDTH: 2,
    LINE_WIDTH_OPTIONS: [1, 2, 3, 4] as readonly number[],
    MAX_PERIOD: 500,
    PERIOD_PRESETS: [20, 50, 100, 200] as readonly number[],
} as const;

export const COLOR_PALETTE_CONSTANTS = {
    GRAYSCALE_ROW: [
        '#ffffff',
        '#e6e6e6',
        '#cccccc',
        '#b3b3b3',
        '#999999',
        '#808080',
        '#666666',
        '#4d4d4d',
        '#333333',
        '#000000',
    ] as readonly string[],
    COLOR_HUES: [0, 30, 60, 90, 120, 165, 195, 225, 270, 330] as readonly number[],
} as const;

export const PRICE_LINE_CONSTANTS = {
    LINE_WIDTH: 1,
    LIQUIDATION_OPACITY: 0.5,
} as const;

export const ACCOUNT_CONSTANTS = {
    HISTORY_LIMIT: 100,
} as const;

export const HISTORY_FETCH_CONSTANTS = {
    SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
    BYBIT_HISTORY_WEEKS: 5,
} as const;

export const POSITION_CONSTANTS = {
    SIZE_THRESHOLD: 0.00001,
} as const;

export const CONTEXT_MENU_CONSTANTS = {
    WIDTH: 180,
    HEIGHT: 140,
    PADDING: 8,
    Z_INDEX: 9999,
} as const;

export const NUKE_MENU_CONSTANTS = {
    DOUBLE_CLICK_DELAY_MS: 250,
} as const;
