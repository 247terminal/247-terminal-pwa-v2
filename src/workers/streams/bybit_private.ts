import { PRIVATE_WS_CONFIG } from '@/config';
import {
    PrivateStreamStateEnum,
    createPrivateStreamState,
    calculateBackoff,
    createWebSocket,
    safeClose,
    safeSend,
    cleanupState,
    hmacSha256,
} from '../private_stream_utils';
import { bybit as sym } from '../symbol_utils';
import type {
    ExchangeAuthParams,
    PrivateStreamState,
    PrivateStreamCallback,
    RawPosition,
    RawOrder,
    RawBalance,
    BybitWsPosition,
    BybitWsOrder,
    BybitWsWallet,
} from '@/types/worker.types';

const state: PrivateStreamState = createPrivateStreamState();

let authData: ExchangeAuthParams | null = null;
let onEventCallback: PrivateStreamCallback | null = null;

export function startBybitPrivateStream(
    auth: ExchangeAuthParams,
    onEvent: PrivateStreamCallback
): void {
    if (state.state !== 'disconnected') return;
    authData = auth;
    onEventCallback = onEvent;
    connect();
}

export function stopBybitPrivateStream(): void {
    cleanupState(state);
    authData = null;
    onEventCallback = null;
}

export function isBybitPrivateActive(): boolean {
    return state.state !== 'disconnected';
}

function connect(): void {
    state.state = PrivateStreamStateEnum.CONNECTING;

    const ws = createWebSocket(PRIVATE_WS_CONFIG.bybit.wsUrl);
    if (!ws) {
        scheduleReconnect();
        return;
    }

    state.ws = ws;

    ws.onopen = () => {
        authenticate();
        state.reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
        if (state.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.ret_msg === 'pong' || msg.op === 'pong') return;

            if (msg.op === 'auth') {
                if (msg.success) {
                    state.state = PrivateStreamStateEnum.CONNECTED;
                    subscribe();
                    startPing();
                    onEventCallback?.({ type: 'connected' });
                } else {
                    console.error('bybit private auth failed:', msg.ret_msg);
                    scheduleReconnect();
                }
                return;
            }

            if (msg.topic === 'position.linear') {
                handlePositionUpdate(msg.data);
            } else if (msg.topic === 'order.linear') {
                handleOrderUpdate(msg.data);
            } else if (msg.topic === 'wallet') {
                handleWalletUpdate(msg.data);
            }
        } catch (e) {
            console.error('bybit private message parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (state.state === 'disconnected') return;
        stopPing();
        console.error('bybit private connection closed:', event.code, event.reason);
        onEventCallback?.({ type: 'disconnected' });
        scheduleReconnect();
    };

    ws.onerror = () => {
        console.error('bybit private connection error');
    };
}

async function authenticate(): Promise<void> {
    if (!authData?.api_key || !authData?.api_secret) {
        console.error('bybit private missing auth credentials');
        return;
    }

    const expires = Date.now() + 10000;
    const signStr = `GET/realtime${expires}`;
    const signature = await hmacSha256(signStr, authData.api_secret);

    safeSend(state.ws, {
        op: 'auth',
        args: [authData.api_key, expires.toString(), signature],
    });
}

function subscribe(): void {
    safeSend(state.ws, {
        op: 'subscribe',
        args: ['position.linear', 'order.linear', 'wallet'],
    });
}

function startPing(): void {
    stopPing();
    state.pingInterval = setInterval(() => {
        safeSend(state.ws, { op: 'ping' });
    }, PRIVATE_WS_CONFIG.bybit.pingInterval);
}

function stopPing(): void {
    if (state.pingInterval) {
        clearInterval(state.pingInterval);
        state.pingInterval = null;
    }
}

function scheduleReconnect(): void {
    if (state.reconnectTimeout) return;

    const delay = calculateBackoff(state.reconnectAttempts);
    state.reconnectAttempts++;
    state.state = PrivateStreamStateEnum.RECONNECTING;

    state.reconnectTimeout = setTimeout(() => {
        state.reconnectTimeout = null;
        if (authData && onEventCallback) {
            safeClose(state.ws);
            state.ws = null;
            connect();
        }
    }, delay);
}

function handlePositionUpdate(data: BybitWsPosition[]): void {
    if (!data || !Array.isArray(data)) return;

    const positions: RawPosition[] = data.map((p) => {
        const size = parseFloat(p.size);
        let side: 'long' | 'short';

        if (p.side === 'Buy') {
            side = 'long';
        } else if (p.side === 'Sell') {
            side = 'short';
        } else {
            if (p.positionIdx === 1) {
                side = 'long';
            } else if (p.positionIdx === 2) {
                side = 'short';
            } else {
                side = 'long';
            }
        }

        return {
            symbol: sym.toUnified(p.symbol),
            contracts: Math.abs(size),
            side,
            entry_price: p.entryPrice,
            mark_price: p.markPrice,
            liquidation_price: p.liqPrice || null,
            unrealized_pnl: p.unrealisedPnl,
            leverage: p.leverage,
            margin_mode: p.tradeMode === 0 ? 'cross' : 'isolated',
            initial_margin: p.positionIM,
        };
    });

    onEventCallback?.({ type: 'position', data: positions });
}

function handleOrderUpdate(data: BybitWsOrder[]): void {
    if (!data || !Array.isArray(data)) return;

    for (const o of data) {
        if (['Filled', 'Cancelled', 'Rejected', 'Deactivated'].includes(o.orderStatus)) {
            onEventCallback?.({
                type: 'order_removed',
                data: { id: o.orderId, symbol: sym.toUnified(o.symbol) },
            });
            continue;
        }

        if (!['New', 'PartiallyFilled', 'Untriggered'].includes(o.orderStatus)) continue;

        const is_buy = o.side === 'Buy';
        const trigger_above = o.triggerDirection === '1';

        let type: string;
        if (
            o.stopOrderType === 'Stop' ||
            o.stopOrderType === 'TakeProfit' ||
            o.stopOrderType === 'StopLoss'
        ) {
            if (is_buy) {
                type = trigger_above ? 'stop_loss' : 'take_profit';
            } else {
                type = trigger_above ? 'take_profit' : 'stop_loss';
            }
        } else {
            type = o.orderType.toLowerCase();
        }

        const price_val = parseFloat(o.price) || 0;
        const trigger_val = parseFloat(o.triggerPrice) || 0;

        const order: RawOrder = {
            symbol: sym.toUnified(o.symbol),
            id: o.orderId,
            side: is_buy ? 'buy' : 'sell',
            type,
            amount: parseFloat(o.qty),
            price: price_val > 0 ? price_val : trigger_val,
            filled: parseFloat(o.cumExecQty),
            timestamp: parseInt(o.createdTime, 10),
            category: o.stopOrderType ? 'tpsl' : 'regular',
        };

        onEventCallback?.({ type: 'order', data: order });
    }
}

function handleWalletUpdate(data: BybitWsWallet[]): void {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    const wallet = data[0];
    const total = parseFloat(wallet.totalEquity) || 0;
    let available = parseFloat(wallet.totalAvailableBalance) || 0;

    if (!available && wallet.coin && wallet.coin.length > 0) {
        const usdtCoin = wallet.coin.find((c) => c.coin === 'USDT');
        if (usdtCoin) {
            available =
                parseFloat(usdtCoin.availableToWithdraw) || parseFloat(usdtCoin.walletBalance) || 0;
        }
    }

    const balance: RawBalance = {
        total,
        available,
        used: Math.max(0, total - available),
        currency: 'USD',
        last_updated: Date.now(),
    };

    onEventCallback?.({ type: 'balance', data: balance });
}
