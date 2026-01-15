function isDexSymbol(symbol) {
    const dashIndex = symbol.indexOf('-');
    if (dashIndex <= 0) return false;
    const prefix = symbol.substring(0, dashIndex);
    return /^[A-Z]+$/.test(prefix);
}

function getNextHourTimestamp() {
    const now = Date.now();
    return Math.ceil(now / 3600000) * 3600000;
}
