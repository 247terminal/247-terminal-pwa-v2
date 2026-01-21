import { signal } from '@preact/signals';
import type { PnlCardData } from '@/types/pnl_card.types';

export const pnl_card_data = signal<PnlCardData | null>(null);
export const pnl_card_visible = signal(false);

export function show_pnl_card(data: PnlCardData): void {
    pnl_card_data.value = data;
    pnl_card_visible.value = true;
}

export function hide_pnl_card(): void {
    pnl_card_visible.value = false;
    pnl_card_data.value = null;
}
