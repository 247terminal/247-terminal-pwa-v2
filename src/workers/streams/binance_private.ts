import { PRIVATE_WS_CONFIG, EXCHANGE_CONFIG, PROXY_CONFIG } from '@/config';
import {
    PrivateStreamStateEnum,
    createPrivateStreamState,
    calculateBackoff,
    createWebSocket,
    safeClose,
    cleanupState,
} from '../private_stream_utils';
import { getExchange } from '../data_fetchers';
import {
    fetch_balance as adapterFetchBalance,
    fetch_leverage_settings as adapterFetchLeverage,
    type BinanceExchange,
} from '../adapters/binance';
import { binance as sym } from '../symbol_utils';
import type {
    ExchangeAuthParams,
    PrivateStreamState,
    PrivateStreamCallback,
    RawPosition,
    RawOrder,
    RawBalance,
    BinanceWsPosition,
    BinanceWsOrder,
    BinanceWsAlgoOrder,
    BinanceWsBalance,
} from '@/types/worker.types';

interface ExtendedPrivateStreamState extends PrivateStreamState {
    listenKey: string | null;
    listenKeyRefreshInterval: ReturnType<typeof setInterval> | null;
}

const state: ExtendedPrivateStreamState = {
    ...createPrivateStreamState(),
    listenKey: null,
    listenKeyRefreshInterval: null,
};

let authData: ExchangeAuthParams | null = null;
let onEventCallback: PrivateStreamCallback | null = null;
let cachedLeverage: Record<string, number> = {};
let lastBalanceFetch = 0;
let balanceFetchPending = false;
const BALANCE_FETCH_THROTTLE_MS = 3000;

const binanceProxy = PROXY_CONFIG.binance;

function getProxiedUrl(path: string): string {
    const baseUrl = EXCHANGE_CONFIG.binance.restUrl;
    if (binanceProxy?.url) {
        return `${binanceProxy.url}${baseUrl}${path}`;
    }
    return `${baseUrl}${path}`;
}

function getProxyHeaders(): Record<string, string> {
    if (binanceProxy?.auth) {
        return { 'x-proxy-auth': binanceProxy.auth };
    }
    return {};
}

export function startBinancePrivateStream(
    auth: ExchangeAuthParams,
    onEvent: PrivateStreamCallback
): void {
    if (state.state !== 'disconnected') return;
    authData = auth;
    onEventCallback = onEvent;
    getListenKeyAndConnect();
}

export function stopBinancePrivateStream(): void {
    if (state.listenKeyRefreshInterval) {
        clearInterval(state.listenKeyRefreshInterval);
        state.listenKeyRefreshInterval = null;
    }
    state.listenKey = null;
    cachedLeverage = {};
    lastBalanceFetch = 0;
    balanceFetchPending = false;
    cleanupState(state);
    authData = null;
    onEventCallback = null;
}

export function isBinancePrivateActive(): boolean {
    return state.state !== 'disconnected';
}

export function updateBinanceCachedLeverage(leverageMap: Record<string, number>): void {
    cachedLeverage = { ...cachedLeverage, ...leverageMap };
}

async function getListenKeyAndConnect(): Promise<void> {
    state.state = PrivateStreamStateEnum.CONNECTING;

    try {
        const listenKey = await fetchListenKey();
        if (!listenKey) {
            console.error('binance private failed to get listenKey');
            scheduleReconnect();
            return;
        }

        state.listenKey = listenKey;
        connect();
        startListenKeyRefresh();
    } catch (err) {
        console.error('binance private listenKey error:', (err as Error).message);
        scheduleReconnect();
    }
}

async function fetchListenKey(): Promise<string | null> {
    if (!authData?.api_key) return null;

    const response = await fetch(getProxiedUrl(PRIVATE_WS_CONFIG.binance.listenKeyEndpoint), {
        method: 'POST',
        headers: {
            'X-MBX-APIKEY': authData.api_key,
            ...getProxyHeaders(),
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('binance listenKey request failed:', response.status, text);
        return null;
    }

    const data = await response.json();
    return data.listenKey || null;
}

async function refreshListenKey(): Promise<void> {
    if (!state.listenKey || !authData?.api_key) return;

    try {
        await fetch(getProxiedUrl(PRIVATE_WS_CONFIG.binance.listenKeyEndpoint), {
            method: 'PUT',
            headers: {
                'X-MBX-APIKEY': authData.api_key,
                ...getProxyHeaders(),
            },
        });
    } catch (err) {
        console.error('binance listenKey refresh error:', (err as Error).message);
    }
}

function startListenKeyRefresh(): void {
    if (state.listenKeyRefreshInterval) {
        clearInterval(state.listenKeyRefreshInterval);
    }
    state.listenKeyRefreshInterval = setInterval(
        refreshListenKey,
        PRIVATE_WS_CONFIG.binance.listenKeyRefreshMs
    );
}

function connect(): void {
    if (!state.listenKey) return;

    const wsUrl = `${PRIVATE_WS_CONFIG.binance.wsUrl}/${state.listenKey}`;
    const ws = createWebSocket(wsUrl);
    if (!ws) {
        scheduleReconnect();
        return;
    }

    state.ws = ws;

    ws.onopen = () => {
        state.state = PrivateStreamStateEnum.CONNECTED;
        state.reconnectAttempts = 0;
        onEventCallback?.({ type: 'connected' });
        fetchLeverageSettings();
    };

    ws.onmessage = (event) => {
        if (state.state === 'disconnected') return;

        try {
            const msg = JSON.parse(event.data);

            if (msg.e === 'ACCOUNT_UPDATE') {
                handleAccountUpdate(msg);
            } else if (msg.e === 'ORDER_TRADE_UPDATE') {
                handleOrderUpdate(msg.o);
            } else if (msg.e === 'ALGO_UPDATE') {
                handleAlgoUpdate(msg.o);
            }
        } catch (e) {
            console.error('binance private message parse error:', (e as Error).message);
        }
    };

    ws.onclose = (event) => {
        if (state.state === 'disconnected') return;
        console.error('binance private connection closed:', event.code, event.reason);
        onEventCallback?.({ type: 'disconnected' });
        scheduleReconnect();
    };

    ws.onerror = () => {
        console.error('binance private connection error');
    };
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
            state.listenKey = null;
            getListenKeyAndConnect();
        }
    }, delay);
}

function handleAccountUpdate(msg: {
    a: { B?: BinanceWsBalance[]; P?: BinanceWsPosition[] };
}): void {
    const accountData = msg.a;

    if (accountData.B && Array.isArray(accountData.B)) {
        handleBalanceUpdate(accountData.B);
    }

    if (accountData.P && Array.isArray(accountData.P)) {
        handlePositionUpdate(accountData.P);
    }
}

function handleBalanceUpdate(_balances: BinanceWsBalance[]): void {
    throttledFetchBalance();
}

async function fetchBalanceRest(): Promise<void> {
    try {
        const exchange = getExchange('binance') as unknown as BinanceExchange;
        const result = await adapterFetchBalance(exchange);
        if (!result) return;

        const balance: RawBalance = {
            total: result.total,
            available: result.available,
            used: result.used,
            currency: result.currency,
            last_updated: result.last_updated,
        };

        onEventCallback?.({ type: 'balance', data: balance });
    } catch (err) {
        console.error('binance REST balance fetch error:', (err as Error).message);
    }
}

function throttledFetchBalance(): void {
    const now = Date.now();
    const timeSinceLastFetch = now - lastBalanceFetch;

    if (timeSinceLastFetch >= BALANCE_FETCH_THROTTLE_MS) {
        lastBalanceFetch = now;
        fetchBalanceRest();
    } else if (!balanceFetchPending) {
        balanceFetchPending = true;
        setTimeout(() => {
            balanceFetchPending = false;
            lastBalanceFetch = Date.now();
            fetchBalanceRest();
        }, BALANCE_FETCH_THROTTLE_MS - timeSinceLastFetch);
    }
}

async function fetchLeverageSettings(): Promise<void> {
    try {
        const exchange = getExchange('binance') as unknown as BinanceExchange;
        const leverageMap = await adapterFetchLeverage(exchange);

        if (Object.keys(leverageMap).length > 0) {
            cachedLeverage = { ...cachedLeverage, ...leverageMap };
        }
    } catch (err) {
        console.error('binance REST leverage fetch error:', (err as Error).message);
    }
}

function handlePositionUpdate(posData: BinanceWsPosition[]): void {
    const positions: RawPosition[] = posData.map((p) => {
        const positionAmt = parseFloat(p.pa);
        const symbol = sym.toUnified(p.s);

        let side: 'long' | 'short';
        if (p.ps === 'LONG') {
            side = 'long';
        } else if (p.ps === 'SHORT') {
            side = 'short';
        } else {
            side = positionAmt >= 0 ? 'long' : 'short';
        }

        return {
            symbol,
            contracts: Math.abs(positionAmt),
            side,
            entry_price: p.ep,
            mark_price: p.ep,
            liquidation_price: null,
            unrealized_pnl: p.up,
            leverage: cachedLeverage[symbol]?.toString() || '1',
            margin_mode: (p.mt || 'cross') as 'cross' | 'isolated',
            initial_margin: p.iw,
        };
    });

    onEventCallback?.({ type: 'position', data: positions });
}

function handleOrderUpdate(o: BinanceWsOrder): void {
    const status = o.X;

    if (['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(status)) {
        onEventCallback?.({
            type: 'order_removed',
            data: { id: String(o.i), symbol: sym.toUnified(o.s) },
        });
        return;
    }

    if (!['NEW', 'PARTIALLY_FILLED'].includes(status)) return;

    const orderType = o.o;
    const origType = o.ot;
    const stopTypes = ['STOP', 'TAKE_PROFIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET'];
    const isStopOrder = stopTypes.includes(origType) || stopTypes.includes(orderType);

    let type: string;
    if (isStopOrder) {
        const typeToCheck = stopTypes.includes(origType) ? origType : orderType;
        if (typeToCheck.includes('TAKE_PROFIT')) {
            type = 'take_profit';
        } else {
            type = 'stop_loss';
        }
    } else {
        type = orderType.toLowerCase();
    }

    const price_val = parseFloat(o.p) || 0;
    const stop_val = parseFloat(o.sp) || 0;

    const order: RawOrder = {
        symbol: sym.toUnified(o.s),
        id: String(o.i),
        side: o.S.toLowerCase() as 'buy' | 'sell',
        type,
        amount: parseFloat(o.q),
        price: price_val > 0 ? price_val : stop_val,
        filled: parseFloat(o.z),
        timestamp: o.T,
        category: isStopOrder ? 'tpsl' : 'regular',
    };

    onEventCallback?.({ type: 'order', data: order });
}

function handleAlgoUpdate(o: BinanceWsAlgoOrder): void {
    const status = o.X;
    const symbol = sym.toUnified(o.s);

    if (['FILLED', 'CANCELED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(status)) {
        onEventCallback?.({
            type: 'order_removed',
            data: { id: String(o.aid), symbol },
        });
        return;
    }

    if (!['NEW', 'PARTIALLY_FILLED'].includes(status)) return;

    const orderType = o.o;
    let type: string;
    if (orderType.includes('TAKE_PROFIT')) {
        type = 'take_profit';
    } else {
        type = 'stop_loss';
    }

    const price_val = parseFloat(o.p) || 0;
    const trigger_val = parseFloat(o.tp) || 0;

    const order: RawOrder = {
        symbol,
        id: String(o.aid),
        side: o.S.toLowerCase() as 'buy' | 'sell',
        type,
        amount: parseFloat(o.q),
        price: price_val > 0 ? price_val : trigger_val,
        filled: 0,
        timestamp: Date.now(),
        category: 'algo',
    };

    onEventCallback?.({ type: 'order', data: order });
}
