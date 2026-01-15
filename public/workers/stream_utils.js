const StreamState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
};

const BACKOFF_BASE = 1000;
const BACKOFF_MAX = 30000;
const BACKOFF_JITTER = 0.3;

function calculateBackoff(attempt) {
    const delay = Math.min(BACKOFF_BASE * Math.pow(2, attempt), BACKOFF_MAX);
    const jitter = delay * BACKOFF_JITTER * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
}

const updatePoolCache = new Map();

function getPooledUpdates(poolKey, size) {
    let pool = updatePoolCache.get(poolKey);
    if (!pool || pool.length < size) {
        const oldLen = pool ? pool.length : 0;
        pool = pool || [];
        pool.length = size;
        for (let i = oldLen; i < size; i++) {
            pool[i] = {
                symbol: '',
                last_price: 0,
                best_bid: 0,
                best_ask: 0,
                price_24h: null,
                volume_24h: null,
                funding_rate: null,
                next_funding_time: null,
            };
        }
        updatePoolCache.set(poolKey, pool);
    }
    return pool;
}

function fillPooledUpdate(
    obj,
    symbol,
    lastPrice,
    bestBid,
    bestAsk,
    price24h,
    volume24h,
    fundingRate,
    nextFundingTime
) {
    obj.symbol = symbol;
    obj.last_price = lastPrice;
    obj.best_bid = bestBid;
    obj.best_ask = bestAsk;
    obj.price_24h = price24h;
    obj.volume_24h = volume24h;
    obj.funding_rate = fundingRate ?? null;
    obj.next_funding_time = nextFundingTime ?? null;
    return obj;
}

function createWebSocket(url) {
    try {
        return new WebSocket(url);
    } catch (e) {
        console.error('websocket creation failed:', url, e.message);
        return null;
    }
}

function safeClose(ws) {
    if (!ws) return;
    try {
        ws.close();
    } catch (e) {}
}

function safeSend(ws, data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('websocket send error:', e.message);
        return false;
    }
}

self.streamUtils = {
    StreamState,
    calculateBackoff,
    getPooledUpdates,
    fillPooledUpdate,
    createWebSocket,
    safeClose,
    safeSend,
};
