import { useState, useCallback } from 'preact/hooks';
import {
    ResponsiveGridLayout,
    useContainerWidth,
    type Layout,
    type ResponsiveLayouts,
} from 'react-grid-layout';
import { TradingChart } from '../components/chart/trading_chart';
import { ChartToolbar, type Timeframe } from '../components/chart/chart_toolbar';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import 'react-grid-layout/css/styles.css';

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
    lg: [
        { i: 'chart', x: 0, y: 0, w: 12, h: 10, minW: 4, minH: 4 },
    ],
};

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
