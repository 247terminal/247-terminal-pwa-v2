import { PRIVATE_WS_CONFIG } from '@/config';
import {
    PrivateStreamStateEnum,
    createPrivateStreamState,
    calculateBackoff,
    createWebSocket,
    safeClose,
    safeSend,
    cleanupState,
    hmacSha256HexBase64,
} from '../private_stream_utils';
import { blofin as sym } from '../symbol_utils';
import type {
    ExchangeAuthParams,
    PrivateStreamState,
    PrivateStreamCallback,
    RawPosition,
    RawOrder,
    RawBalance,
    BlofinWsPosition,
    BlofinWsOrder,
    BlofinWsBalance,
} from '@/types/worker.types';

const state: PrivateStreamState = createPrivateStreamState();

let authData: ExchangeAuthParams | null = null;
let onEventCallback: PrivateStreamCallback | null = null;

export function startBlofinPrivateStream(
    auth: ExchangeAuthParams,
    onEvent: PrivateStreamCallback
): void {
    if (state.state !== 'disconnected') return;
    authData = auth;
    onEventCallback = onEvent;
    connect();
}

export function stopBlofinPrivateStream(): void {
    cleanupState(state);
    authData = null;
    onEventCallback = null;
}

export function isBlofinPrivateActive(): boolean {
    return state.state !== 'disconnected';
}

function connect(): void {
    state.state = PrivateStreamStateEnum.CONNECTING;

    const ws = createWebSocket(PRIVATE_WS_CONFIG.blofin.wsUrl);
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

        if (event.data === 'pong') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.event === 'error') {
                console.error('blofin private error:', msg.code, msg.msg);
                scheduleReconnect();
                return;
            }

            if (msg.event === 'login') {
                if (msg.code === '0') {
                    state.state = PrivateStreamStateEnum.CONNECTED;
                    subscribe();
                    startPing();
                    onEventCallback?.({ type: 'connected' });
                } else {
                    console.error('blofin private auth failed:', msg.msg);
                    scheduleReconnect();
                }
                return;
            }

            if (msg.event === 'subscribe') {
                return;
            }

            if (msg.arg?.channel === 'positions') {
                handlePositionUpdate(msg.data);
            } else if (msg.arg?.channel === 'orders' || msg.arg?.channel === 'orders-algo') {
                handleOrderUpdate(msg.data);
            } else if (msg.arg?.channel === 'account') {
                handleAccountUpdate(msg.data);
            }
        } catch (e) {
            console.error('blofin private message parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (state.state === 'disconnected') return;
        stopPing();
        console.error('blofin private connection closed:', event.code, event.reason);
        onEventCallback?.({ type: 'disconnected' });
        scheduleReconnect();
    };

    ws.onerror = () => {
        console.error('blofin private connection error');
    };
}

async function authenticate(): Promise<void> {
    if (!authData?.api_key || !authData?.api_secret || !authData?.passphrase) {
        console.error('blofin private missing auth credentials');
        return;
    }

    const timestamp = Date.now().toString();
    const nonce = `n_${timestamp}`;
    const signStr = `/users/self/verifyGET${timestamp}${nonce}`;
    const sign = await hmacSha256HexBase64(signStr, authData.api_secret);

    safeSend(state.ws, {
        op: 'login',
        args: [
            {
                apiKey: authData.api_key,
                passphrase: authData.passphrase,
                timestamp,
                nonce,
                sign,
            },
        ],
    });
}

function subscribe(): void {
    safeSend(state.ws, {
        op: 'subscribe',
        args: [
            { channel: 'positions', instType: 'SWAP' },
            { channel: 'orders', instType: 'SWAP' },
            { channel: 'orders-algo', instType: 'SWAP' },
            { channel: 'account' },
        ],
    });
}

function startPing(): void {
    stopPing();
    state.pingInterval = setInterval(() => {
        safeSend(state.ws, 'ping');
    }, PRIVATE_WS_CONFIG.blofin.pingInterval);
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

function handlePositionUpdate(data: BlofinWsPosition[]): void {
    if (!data || !Array.isArray(data)) return;

    const positions: RawPosition[] = data.map((p) => {
        const positionsValue = parseFloat(p.positions);
        let side: 'long' | 'short';
        if (p.positionSide === 'long') {
            side = 'long';
        } else if (p.positionSide === 'short') {
            side = 'short';
        } else {
            side = positionsValue >= 0 ? 'long' : 'short';
        }

        return {
            symbol: sym.toUnified(p.instId),
            contracts: Math.abs(positionsValue),
            side,
            entry_price: p.averagePrice,
            mark_price: p.markPrice,
            liquidation_price: p.liquidationPrice || null,
            unrealized_pnl: p.unrealizedPnl,
            leverage: p.leverage,
            margin_mode: (p.marginMode || 'cross') as 'cross' | 'isolated',
            initial_margin: p.margin,
        };
    });

    onEventCallback?.({ type: 'position', data: positions });
}

function handleOrderUpdate(data: BlofinWsOrder[]): void {
    if (!data || !Array.isArray(data)) return;

    for (const o of data) {
        const orderId = o.orderId || o.tpslId || o.algoId;
        if (!orderId) continue;

        const symbol = sym.toUnified(o.instId);
        const orderState = (o.state || '').toLowerCase();
        const isAlgoOrder = !!o.algoId || !!o.tpslId;

        if (['filled', 'cancelled', 'canceled', 'order_failed'].includes(orderState)) {
            if (isAlgoOrder) {
                onEventCallback?.({ type: 'order_removed', data: { id: `${orderId}_tp`, symbol } });
                onEventCallback?.({ type: 'order_removed', data: { id: `${orderId}_sl`, symbol } });
            } else {
                onEventCallback?.({ type: 'order_removed', data: { id: orderId, symbol } });
            }
            continue;
        }

        if (!['live', 'partially_filled'].includes(orderState)) continue;

        const orderType = (o.orderType || '').toLowerCase();
        if (orderType === 'market') continue;

        if (isAlgoOrder) {
            const tp_price = parseFloat(o.tpTriggerPrice || '0');
            const sl_price = parseFloat(o.slTriggerPrice || '0');
            const side = o.side?.toLowerCase() as 'buy' | 'sell';
            const timestamp = parseInt(o.createTime, 10);

            if (tp_price > 0) {
                onEventCallback?.({
                    type: 'order',
                    data: {
                        symbol,
                        id: `${orderId}_tp`,
                        side,
                        type: 'take_profit',
                        amount: 0,
                        price: tp_price,
                        filled: 0,
                        timestamp,
                        category: 'tpsl',
                    },
                });
            }

            if (sl_price > 0) {
                onEventCallback?.({
                    type: 'order',
                    data: {
                        symbol,
                        id: `${orderId}_sl`,
                        side,
                        type: 'stop_loss',
                        amount: 0,
                        price: sl_price,
                        filled: 0,
                        timestamp,
                        category: 'tpsl',
                    },
                });
            }
            continue;
        }

        let type: string = o.orderType?.toLowerCase() || 'limit';
        const hasTpSl = o.tpTriggerPrice || o.slTriggerPrice;

        if (o.tpTriggerPrice && parseFloat(o.tpTriggerPrice) > 0) {
            type = 'take_profit';
        } else if (o.slTriggerPrice && parseFloat(o.slTriggerPrice) > 0) {
            type = 'stop_loss';
        }

        const price_val = parseFloat(o.price || '0');
        const trigger_val = parseFloat(o.triggerPrice || '0');
        const tp_val = parseFloat(o.tpTriggerPrice || '0');
        const sl_val = parseFloat(o.slTriggerPrice || '0');

        const order: RawOrder = {
            symbol,
            id: orderId,
            side: o.side?.toLowerCase() as 'buy' | 'sell',
            type,
            amount: parseFloat(o.size || '0'),
            price:
                price_val > 0
                    ? price_val
                    : trigger_val > 0
                      ? trigger_val
                      : tp_val > 0
                        ? tp_val
                        : sl_val,
            filled: parseFloat(o.filledSize || '0'),
            timestamp: parseInt(o.createTime, 10),
            category: hasTpSl ? 'tpsl' : 'regular',
        };

        onEventCallback?.({ type: 'order', data: order });
    }
}

function handleAccountUpdate(data: BlofinWsBalance | BlofinWsBalance[]): void {
    if (!data) return;

    const account = Array.isArray(data) ? data[0] : data;
    if (!account) return;

    const total = parseFloat(account.totalEquity) || 0;
    const available = account.details?.[0]?.available
        ? parseFloat(account.details[0].available)
        : 0;

    const balance: RawBalance = {
        total,
        available,
        used: Math.max(0, total - available),
        currency: 'USD',
        last_updated: Date.now(),
    };

    onEventCallback?.({ type: 'balance', data: balance });
}
