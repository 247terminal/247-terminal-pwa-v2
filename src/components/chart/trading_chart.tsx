import { useRef, useEffect } from 'preact/hooks';
import {
    createChart,
    CandlestickSeries,
    ColorType,
    CrosshairMode,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type Time,
} from 'lightweight-charts';

function get_css_variable(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function get_theme_colors() {
    const is_dark = document.documentElement.getAttribute('data-theme') === 'terminal-dark';
    const base_content = get_css_variable('--color-base-content');
    const base_300 = get_css_variable('--color-base-300');
    const success = get_css_variable('--color-success');
    const error = get_css_variable('--color-error');

    return {
        background: is_dark ? '#000000' : '#ffffff',
        text: base_content || '#fafafa',
        grid: base_300 ? `color-mix(in oklch, ${base_300}, transparent 50%)` : 'rgba(40, 41, 45, 0.5)',
        up: success || 'rgb(0, 200, 114)',
        down: error || 'rgb(255, 107, 59)',
    };
}

function generate_sample_data(): CandlestickData<Time>[] {
    const data: CandlestickData<Time>[] = [];
    const base_price = 42000;
    const now = Math.floor(Date.now() / 1000);
    const interval = 3600;

    for (let i = 200; i >= 0; i--) {
        const time = (now - i * interval) as Time;
        const volatility = Math.random() * 500;
        const trend = Math.sin(i / 20) * 1000;
        const open = base_price + trend + (Math.random() - 0.5) * volatility;
        const close = open + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;

        data.push({ time, open, high, low, close });
    }

    return data;
}

export function TradingChart() {
    const container_ref = useRef<HTMLDivElement>(null);
    const chart_ref = useRef<IChartApi | null>(null);
    const series_ref = useRef<ISeriesApi<'Candlestick'> | null>(null);

    useEffect(() => {
        if (!container_ref.current) return;

        const colors = get_theme_colors();
        const chart = createChart(container_ref.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors.background },
                textColor: colors.text,
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: colors.grid,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderColor: colors.grid,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScale: {
                axisPressedMouseMove: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
        });

        const candle_series = chart.addSeries(CandlestickSeries, {
            upColor: colors.up,
            downColor: colors.down,
            wickUpColor: colors.up,
            wickDownColor: colors.down,
            borderVisible: false,
        });

        const apply_theme = () => {
            const c = get_theme_colors();
            chart.applyOptions({
                layout: { background: { type: ColorType.Solid, color: c.background }, textColor: c.text },
                grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
                rightPriceScale: { borderColor: c.grid },
                timeScale: { borderColor: c.grid },
            });
            candle_series.applyOptions({
                upColor: c.up,
                downColor: c.down,
                wickUpColor: c.up,
                wickDownColor: c.down,
            });
        };

        const observer = new MutationObserver(apply_theme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        candle_series.setData(generate_sample_data());
        chart.timeScale().fitContent();

        chart_ref.current = chart;
        series_ref.current = candle_series;

        const handle_resize = () => {
            if (container_ref.current && chart_ref.current) {
                chart_ref.current.applyOptions({
                    width: container_ref.current.clientWidth,
                    height: container_ref.current.clientHeight,
                });
            }
        };

        const resize_observer = new ResizeObserver(handle_resize);
        resize_observer.observe(container_ref.current);
        handle_resize();

        return () => {
            observer.disconnect();
            resize_observer.disconnect();
            chart.remove();
            chart_ref.current = null;
            series_ref.current = null;
        };
    }, []);

    return <div ref={container_ref} class="absolute inset-0" />;
}
