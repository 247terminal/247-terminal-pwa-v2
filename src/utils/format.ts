export function tick_size_to_precision(tick_size: number): number {
    if (tick_size >= 1) return 0;
    return Math.max(0, Math.ceil(-Math.log10(tick_size)));
}
