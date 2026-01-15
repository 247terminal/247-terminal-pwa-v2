export function tick_size_to_precision(tick_size: number): number {
    if (tick_size >= 1) return 0;
    return Math.max(0, Math.ceil(-Math.log10(tick_size)));
}

export function format_price(price: number | null, tick_size: number, locale = false): string {
    if (price === null || price === 0) return '-';
    const precision = tick_size_to_precision(tick_size);
    if (locale) {
        return price.toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
        });
    }
    return price.toFixed(precision);
}
