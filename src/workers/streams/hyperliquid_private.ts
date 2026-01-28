import { PRIVATE_WS_CONFIG } from '@/config';
import {
    PrivateStreamStateEnum,
    createPrivateStreamState,
    calculateBackoff,
    createWebSocket,
    safeClose,
    safeSend,
    cleanupState,
} from '../private_stream_utils';
import { hyperliquid as sym } from '../symbol_utils';
import type {
    ExchangeAuthParams,
    PrivateStreamState,
    PrivateStreamCallback,
    RawPosition,
    RawOrder,
    RawBalance,
    HyperliquidOrderUpdate,
    HyperliquidWebData2,
    HyperliquidClearinghouseStateResponse,
} from '@/types/worker.types';

const state: PrivateStreamState = createPrivateStreamState();

let userAddress: string | null = null;
let onEventCallback: PrivateStreamCallback | null = null;
let dexNames: string[] = [];

export function startHyperliquidPrivateStream(
    auth: ExchangeAuthParams,
    onEvent: PrivateStreamCallback,
    dexes: string[] = []
): void {
    if (state.state !== 'disconnected') return;
    if (!auth.wallet_address) {
        console.error('hyperliquid private requires wallet address');
        return;
    }
    userAddress = auth.wallet_address;
    onEventCallback = onEvent;
    dexNames = dexes;
    connect();
}

export function stopHyperliquidPrivateStream(): void {
    cleanupState(state);
    userAddress = null;
    onEventCallback = null;
    dexNames = [];
}

export function isHyperliquidPrivateActive(): boolean {
    return state.state !== 'disconnected';
}

function connect(): void {
    state.state = PrivateStreamStateEnum.CONNECTING;

    const ws = createWebSocket(PRIVATE_WS_CONFIG.hyperliquid.wsUrl);
    if (!ws) {
        scheduleReconnect();
        return;
    }

    state.ws = ws;

    ws.onopen = () => {
        state.state = PrivateStreamStateEnum.CONNECTED;
        state.reconnectAttempts = 0;
        subscribe();
        startPing();
        onEventCallback?.({ type: 'connected' });
    };

    ws.onmessage = (event) => {
        if (state.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.channel === 'webData2') {
                handleWebData2(msg.data);
            } else if (msg.channel === 'orderUpdates') {
                handleOrderUpdates(msg.data);
            } else if (msg.channel === 'clearinghouseState') {
                handleClearinghouseState(msg.data);
            } else if (msg.channel === 'subscriptionResponse') {
                return;
            }
        } catch (e) {
            console.error('hyperliquid private message parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (state.state === 'disconnected') return;
        stopPing();
        console.error('hyperliquid private connection closed:', event.code, event.reason);
        onEventCallback?.({ type: 'disconnected' });
        scheduleReconnect();
    };

    ws.onerror = () => {
        console.error('hyperliquid private connection error');
    };
}

function subscribe(): void {
    if (!userAddress) return;

    safeSend(state.ws, {
        method: 'subscribe',
        subscription: { type: 'webData2', user: userAddress },
    });

    safeSend(state.ws, {
        method: 'subscribe',
        subscription: { type: 'orderUpdates', user: userAddress },
    });

    for (const dex of dexNames) {
        safeSend(state.ws, {
            method: 'subscribe',
            subscription: { type: 'clearinghouseState', user: userAddress, dex },
        });
    }
}

function startPing(): void {
    stopPing();
    state.pingInterval = setInterval(() => {
        safeSend(state.ws, { method: 'ping' });
    }, PRIVATE_WS_CONFIG.hyperliquid.pingInterval);
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
        if (userAddress && onEventCallback) {
            safeClose(state.ws);
            state.ws = null;
            connect();
        }
    }, delay);
}

function handleWebData2(data: HyperliquidWebData2): void {
    if (!data) return;

    const clearinghouse = data.clearinghouseState;
    if (!clearinghouse) return;

    if (clearinghouse.marginSummary) {
        const summary = clearinghouse.marginSummary;
        const total = parseFloat(summary.accountValue || '0');
        const used = parseFloat(summary.totalMarginUsed || '0');

        const balance: RawBalance = {
            total,
            available: Math.max(0, total - used),
            used,
            currency: 'USD',
            last_updated: Date.now(),
        };

        onEventCallback?.({ type: 'balance', data: balance });
    }

    if (clearinghouse.assetPositions && Array.isArray(clearinghouse.assetPositions)) {
        const positions: RawPosition[] = clearinghouse.assetPositions.map((ap) => {
            const pos = ap.position;
            const szi = parseFloat(pos.szi);
            const leverageValue = pos.leverage?.value || '1';

            return {
                symbol: sym.coinToSymbol(pos.coin),
                contracts: Math.abs(szi),
                side: szi >= 0 ? 'long' : 'short',
                entry_price: pos.entryPx,
                mark_price: pos.entryPx,
                liquidation_price: pos.liquidationPx,
                unrealized_pnl: pos.unrealizedPnl,
                leverage: leverageValue,
                margin_mode: 'cross' as const,
                initial_margin: pos.positionValue,
            };
        });

        onEventCallback?.({ type: 'position', data: positions });
    }
}

function handleClearinghouseState(data: HyperliquidClearinghouseStateResponse): void {
    if (!data?.clearinghouseState) return;

    const dex = data.dex;
    const assetPositions = data.clearinghouseState.assetPositions;

    if (!Array.isArray(assetPositions)) {
        return;
    }

    const positions: RawPosition[] = assetPositions.map((ap) => {
        const pos = ap.position;
        const szi = parseFloat(pos.szi);
        const leverageValue = pos.leverage?.value || '1';

        return {
            symbol: sym.coinToSymbol(pos.coin),
            contracts: Math.abs(szi),
            side: szi >= 0 ? 'long' : 'short',
            entry_price: pos.entryPx,
            mark_price: pos.entryPx,
            liquidation_price: pos.liquidationPx,
            unrealized_pnl: pos.unrealizedPnl,
            leverage: leverageValue,
            margin_mode: 'isolated' as const,
            initial_margin: pos.positionValue,
        };
    });

    onEventCallback?.({ type: 'position', data: positions, dex });
}

function handleOrderUpdates(data: HyperliquidOrderUpdate[]): void {
    if (!data || !Array.isArray(data)) return;

    for (const update of data) {
        if (
            ['filled', 'cancelled', 'canceled', 'rejected', 'reduceonlycanceled'].includes(
                update.status?.toLowerCase() || ''
            )
        ) {
            onEventCallback?.({
                type: 'order_removed',
                data: { id: String(update.order.oid), symbol: sym.coinToSymbol(update.order.coin) },
            });
            continue;
        }

        if (!['open', 'partiallyFilled'].includes(update.status)) continue;

        const o = update.order;
        const origSz = parseFloat(o.origSz);
        const currentSz = parseFloat(o.sz);
        const filled = origSz - currentSz;

        const is_sell = o.side === 'A';
        const has_trigger = o.triggerPx && parseFloat(o.triggerPx) > 0;
        const trigger_above = o.triggerCondition === 'gt';

        let type: string;
        let category: 'regular' | 'tpsl' = 'regular';

        if (has_trigger || o.reduceOnly) {
            category = 'tpsl';
            if (is_sell) {
                type = trigger_above ? 'take_profit' : 'stop_loss';
            } else {
                type = trigger_above ? 'stop_loss' : 'take_profit';
            }
        } else {
            type = 'limit';
        }

        const order: RawOrder = {
            symbol: sym.coinToSymbol(o.coin),
            id: String(o.oid),
            side: o.side === 'B' ? 'buy' : 'sell',
            type,
            amount: origSz,
            price: parseFloat(o.triggerPx || o.limitPx),
            filled: Math.max(0, filled),
            timestamp: update.statusTimestamp,
            category,
        };

        onEventCallback?.({ type: 'order', data: order });
    }
}
