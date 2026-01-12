import { ExchangeButton } from './exchange_button';

interface Exchange {
    id: string;
    name: string;
    connected: boolean;
    icon: preact.ComponentChildren;
}

const EXCHANGE_ICONS: Record<string, preact.ComponentChildren> = {
    binance: (
        <svg class="w-4 h-4" viewBox="0 0 50 50" fill="currentColor">
            <path d="M11.3,25l-5.6,5.6L0,25l5.7-5.7L11.3,25z M25,11.3l9.7,9.7l5.7-5.7L25,0L9.7,15.3l5.7,5.7L25,11.3z M44.3,19.3L38.7,25l5.7,5.7L50,25L44.3,19.3z M25,38.7L15.3,29l-5.7,5.7L25,50l15.3-15.3L34.7,29L25,38.7z M25,30.6l5.7-5.7L25,19.3L19.3,25L25,30.6z"/>
        </svg>
    ),
    hyperliquid: (
        <svg class="w-4 h-4" viewBox="0 0 65.3 58" fill="currentColor">
            <path d="M65.3 24.3991C65.3 45.8991 52.1 52.7991 45.1 46.6991C39.4 41.6991 37.7 31.0991 29.1 29.9991C18.2 28.6991 17.2 43.1991 10 43.1991C1.6 43.1991 0 31.0991 0 24.7991C0 18.3991 1.8 9.69911 8.9 9.69911C17.2 9.69911 17.7 22.1991 28.1 21.4991C38.4 20.7991 38.6 7.79912 45.4 2.29912C51.3 -2.60088 65.3 2.59912 65.3 24.3991Z"/>
        </svg>
    ),
    bybit: (
        <svg class="h-3" viewBox="95 125 375 140" fill="currentColor">
            <path d="m356.58476344 139.99979h18.59585742v92.51170101h-18.59585742z"/>
            <g fill-rule="nonzero" transform="matrix(4.13793 0 0 4.13793 100 127.586)">
                <path d="m9.634 31.998h-9.634v-22.357h9.247c4.494 0 7.112 2.449 7.112 6.28 0 2.48-1.682 4.083-2.846 4.617 1.39.627 3.168 2.04 3.168 5.024 0 4.175-2.94 6.436-7.047 6.436zm-.743-18.462h-4.397v5.149h4.397c1.907 0 2.974-1.036 2.974-2.575 0-1.538-1.067-2.574-2.974-2.574zm.291 9.074h-4.688v5.496h4.688c2.037 0 3.005-1.256 3.005-2.764 0-1.507-.97-2.732-3.005-2.732z"/>
                <path d="m30.388 22.829v9.169h-4.462v-9.169l-6.919-13.188h4.882l4.3 9.012 4.235-9.012h4.881z"/>
                <path d="m50.046 31.998h-9.634v-22.357h9.246c4.494 0 7.113 2.449 7.113 6.28 0 2.48-1.682 4.083-2.846 4.617 1.389.627 3.168 2.04 3.168 5.024 0 4.175-2.941 6.436-7.047 6.436zm-.743-18.462h-4.397v5.149h4.397c1.907 0 2.974-1.036 2.974-2.575 0-1.538-1.067-2.574-2.974-2.574zm.29 9.074h-4.687v5.496h4.687c2.038 0 3.006-1.256 3.006-2.764 0-1.507-.968-2.732-3.006-2.732z"/>
                <path d="m80.986 13.536v18.464h-4.494v-18.464h-6.013v-3.895h16.521v3.895z"/>
            </g>
        </svg>
    ),
    blofin: (
        <svg class="w-3 h-3" viewBox="65 33 60 62" fill="currentColor">
            <path d="M96.3398 33C104.46 33 110.62 34.4002 114.86 37.2002C115.9 37.8801 116.78 38.6406 117.58 39.4805C119.98 42.0804 121.18 45.3605 121.18 49.3604V49.5195L90.5 72.5996V59.8799L104.54 49.3203C104.26 48.4004 103.74 47.5999 102.98 46.96C101.701 45.88 99.9401 45.3203 97.7002 45.3203H81.7402V82.5996H98.7002C101.54 82.5996 103.7 82.0798 105.1 81C106.5 79.92 107.22 77.9601 107.22 76.2002C107.22 74.4402 106.66 73 105.62 71.96L115.54 64.5596C116.1 64.7596 116.66 65.0403 117.18 65.3203C119.38 66.5603 121.06 68.1602 122.14 70.1602L122.18 70.2002C123.26 72.2002 123.82 71.6404 123.82 77.3604C123.82 83.0802 121.42 87.4805 116.7 90.4805C111.94 93.4804 105.1 95 96.0996 95H65.3799V33H96.3398Z"/>
        </svg>
    ),
};

interface ExchangesProps {
    exchanges: Exchange[];
    on_exchange_click?: (exchange_id: string) => void;
}

export function Exchanges({ exchanges, on_exchange_click }: ExchangesProps) {
    return (
        <div class="flex items-center gap-1 px-1.5 h-7 bg-base-300/50 rounded">
            {exchanges.map((exchange) => (
                <ExchangeButton
                    key={exchange.id}
                    connected={exchange.connected}
                    on_click={() => on_exchange_click?.(exchange.id)}
                >
                    {exchange.icon}
                </ExchangeButton>
            ))}
        </div>
    );
}

export function get_exchange_icon(exchange_id: string): preact.ComponentChildren {
    return EXCHANGE_ICONS[exchange_id] ?? null;
}
