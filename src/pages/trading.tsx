import { useState, useCallback } from 'preact/hooks';
import {
    ResponsiveGridLayout,
    useContainerWidth,
    type Layout,
    type ResponsiveLayouts,
} from 'react-grid-layout';
import { TradingChart } from '../components/chart/trading_chart';
import { ChartToolbar, type Timeframe } from '../components/chart/chart_toolbar';
import { ThemeToggle } from '../components/common/theme_toggle';
import 'react-grid-layout/css/styles.css';

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
    lg: [
        { i: 'chart', x: 0, y: 0, w: 12, h: 10, minW: 4, minH: 4 },
    ],
};

function Header() {
    return (
        <header class="h-10 bg-base-200 border-b border-base-300 flex items-center px-3 shrink-0">
            <img src="/logo.svg" alt="247" class="h-5 w-5 rounded self-center" />
            <div class="ml-auto scale-75">
                <ThemeToggle />
            </div>
        </header>
    );
}

function Footer() {
    return (
        <footer class="h-8 bg-base-200 border-t border-base-300 flex items-center px-4 shrink-0">
            <span class="text-xs text-base-content/50">v2.0.0</span>
            <div class="ml-auto flex items-center gap-4 text-xs text-base-content/50">
                <span>Latency: 24ms</span>
            </div>
        </footer>
    );
}

export function TradingPage() {
    const { width, containerRef, mounted } = useContainerWidth();
    const [timeframe, set_timeframe] = useState<Timeframe>('15');

    const handle_layout_change = useCallback((layout: Layout, layouts: ResponsiveLayouts) => {
        console.log('Layout changed:', layout, layouts);
    }, []);

    return (
        <div class="h-screen flex flex-col bg-base-100">
            <Header />
            <main ref={containerRef as React.RefObject<HTMLDivElement>} class="flex-1 overflow-auto min-h-0">
                {mounted && (
                    <ResponsiveGridLayout
                        className="layout"
                        width={width}
                        layouts={DEFAULT_LAYOUTS}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={50}
                        margin={[8, 8]}
                        containerPadding={[8, 8]}
                        onLayoutChange={handle_layout_change}
                        dragConfig={{ enabled: false }}
                        resizeConfig={{ enabled: true }}
                    >
                        <div key="chart" class="bg-base-200 rounded border border-base-300 overflow-hidden flex flex-col">
                            <ChartToolbar
                                symbol="BTCUSDT"
                                timeframe={timeframe}
                                on_timeframe_change={set_timeframe}
                            />
                            <div class="flex-1 relative min-h-0">
                                <TradingChart />
                            </div>
                        </div>
                    </ResponsiveGridLayout>
                )}
            </main>
            <Footer />
        </div>
    );
}
