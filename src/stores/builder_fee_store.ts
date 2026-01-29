import { signal } from '@preact/signals';
import type { BuilderFeeModalState } from '@/types/builder_fee.types';

export const builder_fee_modal = signal<BuilderFeeModalState>({
    visible: false,
    wallet_address: '',
    on_success: null,
});

export function show_builder_fee_modal(wallet_address: string, on_success?: () => void) {
    builder_fee_modal.value = {
        visible: true,
        wallet_address,
        on_success: on_success || null,
    };
}

export function hide_builder_fee_modal() {
    builder_fee_modal.value = {
        visible: false,
        wallet_address: '',
        on_success: null,
    };
}
