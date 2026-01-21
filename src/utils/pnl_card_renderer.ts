import type { PnlCardRenderData } from '@/types/pnl_card.types';
import { PNL_CARD_CONSTANTS, PNL_CARD_COLORS, PNL_CARD_ASSETS } from '@/config/pnl_card.constants';

const DPI = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

let positive_bg: HTMLImageElement | null = null;
let negative_bg: HTMLImageElement | null = null;
let fonts_ready = false;

function load_image(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function load_fonts(): Promise<void> {
    if (fonts_ready) return;
    try {
        await Promise.all([
            document.fonts.load('bold 45px "Zuume Bold"'),
            document.fonts.load('bold 30px "Arame Thin"'),
            document.fonts.load('bold 80px "Zuume Bold"'),
            document.fonts.load('14px "Arame Thin"'),
        ]);
    } catch (err) {
        console.warn('failed to load pnl card fonts, using fallback:', err);
    }
    fonts_ready = true;
}

export async function init_pnl_card_assets(): Promise<void> {
    await Promise.all([
        load_image(PNL_CARD_ASSETS.positive_bg).then((img) => (positive_bg = img)),
        load_image(PNL_CARD_ASSETS.negative_bg).then((img) => (negative_bg = img)),
        load_fonts(),
    ]);
}

function format_roi(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

function format_pnl_value(value: number): string {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function render_pnl_card(canvas: HTMLCanvasElement, data: PnlCardRenderData): void {
    const is_profit = data.pnl_amount >= 0;
    const { WIDTH, HEIGHT } = PNL_CARD_CONSTANTS;

    canvas.width = WIDTH * DPI;
    canvas.height = HEIGHT * DPI;
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(DPI, DPI);

    const bg = is_profit ? positive_bg : negative_bg;
    if (bg) ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

    const accent = is_profit ? PNL_CARD_COLORS.profit : PNL_CARD_COLORS.loss;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 45px "Zuume Bold", sans-serif';
    ctx.fillStyle = PNL_CARD_COLORS.text;
    ctx.fillText(data.symbol, 37, 125);

    ctx.font = 'bold 30px "Arame Thin", sans-serif';
    ctx.fillStyle = accent;
    const leverage_text = data.leverage > 1 ? ` ${data.leverage}x` : '';
    ctx.fillText(`${data.side.toUpperCase()}${leverage_text}`, 37, 160);

    ctx.fillStyle = PNL_CARD_COLORS.text_dim;
    ctx.fillText('ROI', 37, 225);

    const roi_text = format_roi(data.roi_percent);
    ctx.font = 'bold 80px "Zuume Bold", sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(roi_text, 37, 290);

    const roi_width = ctx.measureText(roi_text).width;
    ctx.font = 'bold 50px "Zuume Bold", sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(` (${format_pnl_value(data.pnl_amount)})`, 40 + roi_width, 324);
    ctx.textBaseline = 'middle';

    ctx.font = '14px "Arame Thin", sans-serif';
    ctx.fillStyle = PNL_CARD_COLORS.text_muted;
    ctx.fillText('ENTRY PRICE', 37, 375);
    ctx.fillText(data.is_realized ? 'CLOSE PRICE' : 'MARK PRICE', 180, 375);

    ctx.font = 'bold 26px "Zuume Bold", sans-serif';
    ctx.fillStyle = PNL_CARD_COLORS.text;
    ctx.fillText(`$${data.entry_price}`, 37, 405);
    ctx.fillText(`$${data.current_price}`, 180, 405);
}

export async function copy_canvas_to_clipboard(canvas: HTMLCanvasElement): Promise<boolean> {
    return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                resolve(false);
                return;
            }
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                resolve(true);
            } catch {
                resolve(false);
            }
        }, 'image/png');
    });
}

export function download_canvas(canvas: HTMLCanvasElement, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
