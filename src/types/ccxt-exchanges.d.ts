// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CcxtExchangeClass = new (config?: Record<string, unknown>) => any;

// REST API versions (for validators)
declare module 'ccxt/js/src/binanceusdm.js' {
    const binanceusdm: CcxtExchangeClass;
    export default binanceusdm;
}

declare module 'ccxt/js/src/blofin.js' {
    const blofin: CcxtExchangeClass;
    export default blofin;
}

declare module 'ccxt/js/src/bybit.js' {
    const bybit: CcxtExchangeClass;
    export default bybit;
}

declare module 'ccxt/js/src/hyperliquid.js' {
    const hyperliquid: CcxtExchangeClass;
    export default hyperliquid;
}

// Pro/WebSocket versions (for worker)
declare module 'ccxt/js/src/pro/binanceusdm.js' {
    const binanceusdm: CcxtExchangeClass;
    export default binanceusdm;
}

declare module 'ccxt/js/src/pro/blofin.js' {
    const blofin: CcxtExchangeClass;
    export default blofin;
}

declare module 'ccxt/js/src/pro/bybit.js' {
    const bybit: CcxtExchangeClass;
    export default bybit;
}

declare module 'ccxt/js/src/pro/hyperliquid.js' {
    const hyperliquid: CcxtExchangeClass;
    export default hyperliquid;
}
