async function fetchBlofinFundingRates(exchange) {
    const config = EXCHANGE_CONFIG.blofin;
    const url = `${config.proxy}${config.restUrl}/api/v1/market/funding-rate`;
    const response = await fetch(url, { headers: config.headers });
    const json = await response.json();
    if (json.code !== '0' || !json.data) return {};

    const result = {};
    for (const item of json.data) {
        const symbol = self.blofinNative.convertBlofinSymbol(item.instId);
        if (!symbol) continue;

        const market = exchange.markets[symbol];
        if (!market) continue;

        const fundingRate = parseFloat(item.fundingRate);
        const fundingTime = parseInt(item.fundingTime);
        result[symbol] = {
            funding_rate: Number.isNaN(fundingRate) ? null : fundingRate,
            next_funding_time: Number.isNaN(fundingTime) ? null : fundingTime,
        };
    }
    return result;
}

self.blofinRest = {
    fetchBlofinFundingRates,
};
