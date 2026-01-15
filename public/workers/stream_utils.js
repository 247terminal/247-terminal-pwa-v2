const StreamState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
};

function calculateBackoff(attempt) {
    const base = STREAM_CONFIG.backoffBase;
    const max = STREAM_CONFIG.backoffMax;
    const jitter = STREAM_CONFIG.backoffJitter;
    const delay = Math.min(base * Math.pow(2, attempt), max);
    return Math.floor(delay + delay * jitter * (Math.random() * 2 - 1));
}

const updatePoolCache = new Map();

function getPooledUpdates(poolKey, size) {
    let pool = updatePoolCache.get(poolKey);
    const targetSize = Math.max(size, STREAM_CONFIG.minPoolSize);

    if (!pool) {
        pool = new Array(targetSize);
        for (let i = 0; i < targetSize; i++) {
            pool[i] = createTickerEntry();
        }
        updatePoolCache.set(poolKey, pool);
    } else if (pool.length < size) {
        const newSize = Math.ceil(size * STREAM_CONFIG.poolGrowthFactor);
        const oldLen = pool.length;
        pool.length = newSize;
        for (let i = oldLen; i < newSize; i++) {
            pool[i] = createTickerEntry();
        }
        updatePoolCache.set(poolKey, pool);
    }

    return pool;
}

function createTickerEntry(symbol = '') {
    return {
        symbol,
        last_price: 0,
        best_bid: 0,
        best_ask: 0,
        price_24h: null,
        volume_24h: null,
        funding_rate: null,
        next_funding_time: null,
    };
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
    createTickerEntry,
    createWebSocket,
    safeClose,
    safeSend,
};
