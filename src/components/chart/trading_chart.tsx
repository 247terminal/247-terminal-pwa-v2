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

const CHART_COLORS = {
    background: 'rgb(28, 29, 31)',
    text: '#91969e',
    grid: 'rgba(40, 41, 45, 0.5)',
    up: 'rgb(0, 200, 114)',
    down: 'rgb(255, 107, 59)',
};

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

        const chart = createChart(container_ref.current, {
            layout: {
                background: { type: ColorType.Solid, color: CHART_COLORS.background },
                textColor: CHART_COLORS.text,
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: CHART_COLORS.grid },
                horzLines: { color: CHART_COLORS.grid },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: CHART_COLORS.grid,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderColor: CHART_COLORS.grid,
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
            upColor: CHART_COLORS.up,
            downColor: CHART_COLORS.down,
            wickUpColor: CHART_COLORS.up,
            wickDownColor: CHART_COLORS.down,
            borderVisible: false,
        });

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
            resize_observer.disconnect();
            chart.remove();
            chart_ref.current = null;
            series_ref.current = null;
        };
    }, []);

    return <div ref={container_ref} class="absolute inset-0" />;
}
