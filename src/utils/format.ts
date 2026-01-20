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

export function format_size(size: number, qty_step: number): string {
    if (size === 0) return '0';
    const precision = tick_size_to_precision(qty_step);
    return size.toFixed(precision);
}
