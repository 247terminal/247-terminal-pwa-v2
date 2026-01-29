export interface BuilderApprovalState {
    approved: boolean;
    current_fee_rate?: string;
}

export interface BuilderFeeModalProps {
    wallet_address: string;
    on_success: () => void;
    on_close: () => void;
}

export interface BuilderFeeModalState {
    visible: boolean;
    wallet_address: string;
    on_success: (() => void) | null;
}

export type ApprovalStep = 'connect' | 'confirm' | 'signing' | 'success' | 'error';
