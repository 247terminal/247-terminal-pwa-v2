import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { Check, Copy, Download, X } from 'lucide-preact';
import { pnl_card_data, hide_pnl_card } from '@/stores/pnl_card_store';
import { get_market, get_ticker_signal } from '@/stores/exchange_store';
import { format_price } from '@/utils/format';
import { calculate_position_pnl } from '@/utils/pnl';
import {
    init_pnl_card_assets,
    render_pnl_card,
    copy_canvas_to_clipboard,
    download_canvas,
} from '@/utils/pnl_card_renderer';
import { PNL_CARD_CONSTANTS } from '@/config/pnl_card.constants';
import type { MarketData } from '@/types/chart.types';
import type { PnlCardRenderData } from '@/types/pnl_card.types';

function get_clean_symbol(market: MarketData | undefined, symbol: string): string {
    if (market?.base && market?.quote) {
        return `${market.base}${market.quote}`.toUpperCase();
    }
    const parts = symbol.split('/');
    const base = parts[0] || symbol;
    const quote = parts[1]?.split(':')[0] || '';
    return `${base}${quote}`.toUpperCase();
}

export function PnlCardModal() {
    const data = pnl_card_data.value;
    const canvas_ref = useRef<HTMLCanvasElement>(null);
    const assets_loaded_ref = useRef(false);
    const [loading, set_loading] = useState(true);
    const [copied, set_copied] = useState(false);
    const copied_timeout_ref = useRef<number | null>(null);

    const get_render_data = useCallback((): PnlCardRenderData | null => {
        if (!data) return null;

        if (data.type === 'history') {
            const market = get_market(data.exchange_id, data.symbol);
            return {
                symbol: get_clean_symbol(market, data.symbol),
                side: data.side,
                leverage: data.leverage,
                roi_percent: data.roi_percent,
                pnl_amount: data.pnl_amount,
                entry_price: data.entry_price,
                current_price: data.close_price,
                is_realized: true,
            };
        }

        const { position, exchange_id } = data;
        const market = get_market(exchange_id, position.symbol);
        const tick_size = market?.tick_size ?? 0.01;
        const ticker = get_ticker_signal(exchange_id, position.symbol).value;
        const last_price = ticker?.last_price ?? position.last_price;

        const is_long = position.side === 'long';
        const { pnl, pnl_pct } = calculate_position_pnl(
            is_long,
            position.entry_price,
            last_price,
            position.size,
            position.margin,
            position.leverage
        );

        return {
            symbol: get_clean_symbol(market, position.symbol),
            side: position.side,
            leverage: position.leverage,
            roi_percent: pnl_pct,
            pnl_amount: pnl,
            entry_price: format_price(position.entry_price, tick_size),
            current_price: format_price(last_price, tick_size),
            is_realized: false,
        };
    }, [data]);

    const get_render_data_ref = useRef(get_render_data);
    get_render_data_ref.current = get_render_data;

    useEffect(() => {
        if (!data) return;

        const init = async () => {
            set_loading(true);
            if (!assets_loaded_ref.current) {
                await init_pnl_card_assets();
                assets_loaded_ref.current = true;
            }
            set_loading(false);
        };

        init();
    }, [data]);

    useEffect(() => {
        if (!canvas_ref.current || loading) return;

        let raf_id: number;
        let last_draw = 0;
        let is_active = true;
        const frame_interval =
            data?.type === 'position' ? PNL_CARD_CONSTANTS.LIVE_UPDATE_FRAME_INTERVAL_MS : 0;
        const is_live = data?.type === 'position';

        const draw = (timestamp: number) => {
            if (!is_active || !canvas_ref.current) return;

            if (timestamp - last_draw >= frame_interval) {
                const rd = get_render_data_ref.current();
                if (rd) render_pnl_card(canvas_ref.current, rd);
                last_draw = timestamp;
            }

            if (is_live) {
                raf_id = requestAnimationFrame(draw);
            }
        };

        raf_id = requestAnimationFrame(draw);

        return () => {
            is_active = false;
            if (raf_id) cancelAnimationFrame(raf_id);
        };
    }, [loading, data?.type]);

    useEffect(() => {
        const handle_escape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') hide_pnl_card();
        };
        document.addEventListener('keydown', handle_escape);
        return () => document.removeEventListener('keydown', handle_escape);
    }, []);

    useEffect(() => {
        return () => {
            if (copied_timeout_ref.current) clearTimeout(copied_timeout_ref.current);
        };
    }, []);

    const handle_backdrop = useCallback((e: MouseEvent) => {
        if (e.target === e.currentTarget) hide_pnl_card();
    }, []);

    const handle_copy = useCallback(async () => {
        if (!canvas_ref.current) return;
        const success = await copy_canvas_to_clipboard(canvas_ref.current);
        if (success) {
            set_copied(true);
            if (copied_timeout_ref.current) clearTimeout(copied_timeout_ref.current);
            copied_timeout_ref.current = window.setTimeout(() => set_copied(false), 1500);
        }
    }, []);

    const handle_download = useCallback(() => {
        if (!canvas_ref.current) return;
        const rd = get_render_data();
        if (!rd) return;
        download_canvas(canvas_ref.current, `${rd.symbol}_${rd.side}_${Date.now()}.png`);
    }, [get_render_data]);

    if (!data) return null;

    return (
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handle_backdrop}
        >
            <div class="flex flex-col items-center gap-3">
                <div class="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    {loading && (
                        <div
                            class="max-w-[90vw] flex items-center justify-center bg-base-300"
                            style={{
                                width: PNL_CARD_CONSTANTS.WIDTH,
                                height: PNL_CARD_CONSTANTS.HEIGHT,
                            }}
                        >
                            <span class="loading loading-spinner loading-md" />
                        </div>
                    )}
                    <canvas
                        ref={canvas_ref}
                        class="max-w-[90vw] h-auto block"
                        style={{ display: loading ? 'none' : 'block' }}
                    />
                </div>

                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handle_copy}
                        disabled={loading}
                        class="h-9 px-4 flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all text-sm font-medium"
                        aria-label="Copy to clipboard"
                    >
                        {copied ? <Check class="w-4 h-4" /> : <Copy class="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        type="button"
                        onClick={handle_download}
                        disabled={loading}
                        class="h-9 px-4 flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all text-sm font-medium"
                        aria-label="Download image"
                    >
                        <Download class="w-4 h-4" />
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={hide_pnl_card}
                        class="h-9 px-4 flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-red-500/50 text-white/80 hover:text-white transition-all text-sm font-medium"
                        aria-label="Close"
                    >
                        <X class="w-4 h-4" />
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
