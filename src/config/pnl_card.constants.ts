export const PNL_CARD_CONSTANTS = {
    WIDTH: 800,
    HEIGHT: 450,
    LIVE_UPDATE_FRAME_INTERVAL_MS: 16,
} as const;

export const PNL_CARD_COLORS = {
    profit: '#22c55e',
    loss: '#ef4444',
    text: 'rgba(255, 255, 255, 1)',
    text_muted: 'rgba(255, 255, 255, 0.4)',
    text_dim: 'rgba(255, 255, 255, 0.2)',
} as const;

export const PNL_CARD_ASSETS = {
    positive_bg: '/images/pnl/pos_pnl.webp',
    negative_bg: '/images/pnl/neg_pnl.webp',
} as const;
