import { BROKER_CONFIG, EXCHANGE_CONFIG } from '@/config';
import type { WalletClient } from 'viem';
import type { Hex } from 'viem';
import type { BuilderApprovalState } from '@/types/builder_fee.types';

const HYPERLIQUID_INFO_URL = `${EXCHANGE_CONFIG.hyperliquid.restUrl}/info`;
const HYPERLIQUID_EXCHANGE_URL = `${EXCHANGE_CONFIG.hyperliquid.restUrl}/exchange`;

const HYPERLIQUID_CHAIN_ID = 42161;
const HYPERLIQUID_SIGNATURE_CHAIN_ID = '0xa4b1';

export async function check_builder_approval(
    wallet_address: string
): Promise<BuilderApprovalState> {
    try {
        const builder = BROKER_CONFIG.hyperliquid.builder.toLowerCase();
        const required_fee_tenths_bps = BROKER_CONFIG.hyperliquid.feeInt;

        const response = await fetch(HYPERLIQUID_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'maxBuilderFee',
                user: wallet_address.toLowerCase(),
                builder,
            }),
        });

        if (!response.ok) {
            console.error('failed to check builder approval:', response.status);
            return { approved: false };
        }

        const max_fee_tenths_bps: number = await response.json();

        if (max_fee_tenths_bps === 0) {
            return { approved: false };
        }

        const fee_percent = (max_fee_tenths_bps / 1000).toFixed(3) + '%';

        if (max_fee_tenths_bps < required_fee_tenths_bps) {
            return { approved: false, current_fee_rate: fee_percent };
        }

        return { approved: true, current_fee_rate: fee_percent };
    } catch (error) {
        console.error('error checking builder approval:', error);
        return { approved: false };
    }
}

function split_signature(signature: Hex): { r: Hex; s: Hex; v: number } {
    const r = `0x${signature.slice(2, 66)}` as Hex;
    const s = `0x${signature.slice(66, 130)}` as Hex;
    const v_raw = parseInt(signature.slice(130, 132), 16);
    const v = v_raw < 27 ? v_raw + 27 : v_raw;
    return { r, s, v };
}

export async function approve_builder_fee(wallet_client: WalletClient): Promise<boolean> {
    const builder = BROKER_CONFIG.hyperliquid.builder.toLowerCase();
    const fee_rate_str = `${(BROKER_CONFIG.hyperliquid.feeInt / 100).toFixed(2)}%`;
    const nonce = Date.now();

    const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: HYPERLIQUID_CHAIN_ID,
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    };

    const types = {
        'HyperliquidTransaction:ApproveBuilderFee': [
            { name: 'hyperliquidChain', type: 'string' },
            { name: 'maxFeeRate', type: 'string' },
            { name: 'builder', type: 'address' },
            { name: 'nonce', type: 'uint64' },
        ],
    };

    const message = {
        hyperliquidChain: 'Mainnet',
        maxFeeRate: fee_rate_str,
        builder: builder as `0x${string}`,
        nonce: BigInt(nonce),
    };

    try {
        const [account] = await wallet_client.getAddresses();
        if (!account) throw new Error('No wallet account found');

        const signature = await wallet_client.signTypedData({
            account,
            domain,
            types,
            primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
            message,
        });

        const { r, s, v } = split_signature(signature);

        const action = {
            type: 'approveBuilderFee',
            hyperliquidChain: 'Mainnet',
            signatureChainId: HYPERLIQUID_SIGNATURE_CHAIN_ID,
            maxFeeRate: fee_rate_str,
            builder,
            nonce,
        };

        const payload = {
            action,
            nonce,
            signature: { r, s, v },
        };

        const response = await fetch(HYPERLIQUID_EXCHANGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error_text = await response.text();
            console.error('builder fee approval failed:', error_text);
            throw new Error(`Approval failed: ${error_text}`);
        }

        const result = await response.json();
        if (result.status === 'err') {
            throw new Error(result.response || 'Unknown error');
        }

        return true;
    } catch (error) {
        console.error('error approving builder fee:', error);
        throw error;
    }
}

export function get_builder_info() {
    return {
        address: BROKER_CONFIG.hyperliquid.builder,
        fee_percent: `${(BROKER_CONFIG.hyperliquid.feeInt / 100).toFixed(2)}%`,
        fee_bps: BROKER_CONFIG.hyperliquid.feeInt,
    };
}
