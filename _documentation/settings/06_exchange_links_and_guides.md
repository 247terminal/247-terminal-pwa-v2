# Exchange Links & Setup Guides

Reference documentation extracted from v1 PWA (`247-terminal-pwa`) for exchange account links, API key pages, and setup instructions.

---

## Exchange Links Summary

| Exchange | Open Account (Referral) | Get API Key |
|----------|------------------------|-------------|
| Bybit | https://partner.bybit.com/b/140043 | https://www.bybit.com/app/user/api-management |
| BloFin | https://partner.blofin.com/d/247 | https://blofin.com/account/apis |
| Binance | https://www.binance.com/ | https://www.binance.com/en/my/settings/api-management |
| Hyperliquid | https://app.hyperliquid.xyz/join | https://app.hyperliquid.xyz/API |

---

## Bybit

### Links
- **Open Account:** https://partner.bybit.com/b/140043
- **API Management:** https://www.bybit.com/app/user/api-management

### Setup Guide

1. Log in to your [Bybit account](https://partner.bybit.com/b/140043)
2. Navigate to [API Management](https://www.bybit.com/app/user/api-management)
3. Click **Upgrade to UTA Pro** prompt when it appears
4. Click **Create New Key**
5. Select System-generated or Self-generated API Keys
6. Select **Connect to Third-Party Applications**, choose **247Terminal**, and name the API key
7. Enable **Read-Write** permission and set **Order** and **Position** permissions under **Unified Trading** section, plus **Exchange history** under **Assets**
8. Copy API key and secret, paste in fields above

### Important Notes
- Optional: Use your computer's IP address for IP restriction
- Check if your account has hedge-mode or one-way mode selected, tick that option accordingly
- Only Unified trading accounts are supported (Standard accounts not supported)

---

## BloFin

### Links
- **Open Account:** https://partner.blofin.com/d/247
- **API Management:** https://blofin.com/account/apis

### Setup Guide

1. Log in to your [BloFin account](https://partner.blofin.com/d/247)
2. Navigate to [API Management](https://blofin.com/account/apis)
3. Click **Create API Key**
4. Select System-generated or Self-generated API Keys
5. Select **Connect to Third-Party Applications**, choose **247 Terminal**, name the API key, and choose your **Passphrase**
6. Enable **Read** and **Trade** permissions
7. Copy API key, secret, and passphrase, paste in fields above

### Important Notes
- Check if your account has hedge-mode or one-way mode selected, tick that option accordingly

---

## Binance

### Links
- **Open Account:** https://www.binance.com/
- **API Management:** https://www.binance.com/en/my/settings/api-management

### Setup Guide

1. Log in to your [Binance account](https://www.binance.com/)
2. Navigate to [API Management](https://www.binance.com/en/my/settings/api-management)
3. Click **Create API key**
4. Select System-generated or Self-generated API Keys
5. Name it and complete verification steps
6. Tick **Enable Futures** permission
7. Copy API key and secret, paste in fields above

### IP Restriction (Optional)
Server IPs: `66.42.61.1 45.32.109.173 139.180.223.116 207.148.68.77 45.77.253.54`

### Important Notes
- Check if your account has hedge-mode or one-way mode selected, tick that option accordingly
- Only Classic trading accounts are supported (Portfolio margin accounts not supported)

---

## Hyperliquid

### Links
- **Open Account:** https://app.hyperliquid.xyz/join
- **API Management:** https://app.hyperliquid.xyz/API

### Setup Guide

1. Log in to your [Hyperliquid account](https://app.hyperliquid.xyz/join) by signing via your crypto wallet
2. Navigate to [API Management](https://app.hyperliquid.xyz/API)
3. Enter a name for your API wallet, click **Generate** to create the API wallet address, then click **Authorize API Wallet**
4. For **Valid Days**, select **Max**. Copy the **Private Key** displayed in the red box
5. Press **Authorize** and sign the request with your crypto wallet
6. Copy your **main account (crypto wallet) address** and the **Private Key**, paste into fields above

### Builder Fee Required
- After connecting to Hyperliquid, a popup will appear asking to approve a builder fee of **0.01%**
- If not approved, trading will not function properly
- You can manually manage the builder fee at [hyperdash.info/builder-fee](https://hyperdash.info/builder-fee)
- **Builder address:** `0xD128dD90Cd4eABFCf6EFC4D11dd9f46E53c893b8`

### Important Notes
- Vault and subaccount trading are not supported

---

## Implementation Constants

For use in `exchange.service.ts` or `exchange.constants.ts`:

```typescript
export const EXCHANGE_LINKS = {
    bybit: {
        open_account: 'https://partner.bybit.com/b/140043',
        api_management: 'https://www.bybit.com/app/user/api-management',
    },
    blofin: {
        open_account: 'https://partner.blofin.com/d/247',
        api_management: 'https://blofin.com/account/apis',
    },
    binance: {
        open_account: 'https://www.binance.com/',
        api_management: 'https://www.binance.com/en/my/settings/api-management',
    },
    hyperliquid: {
        open_account: 'https://app.hyperliquid.xyz/join',
        api_management: 'https://app.hyperliquid.xyz/API',
    },
} as const;
```

---

## UI Button Pattern (v1 Reference)

The v1 PWA has three buttons per exchange:

| Button | Label | Action |
|--------|-------|--------|
| Open Account | `OPEN ACCOUNT` | Opens referral/signup link in new tab |
| Get API Key | `GET API KEY` | Opens API management page in new tab |
| Help | `?` | Opens modal with setup instructions |
