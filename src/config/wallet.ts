import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum } from 'wagmi/chains';
import { WALLET_CONFIG } from '@/config';

export const wagmi_config = getDefaultConfig({
    appName: WALLET_CONFIG.appName,
    projectId: WALLET_CONFIG.walletConnectProjectId,
    chains: [arbitrum],
    ssr: false,
});
