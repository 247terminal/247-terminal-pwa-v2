import { useEffect } from 'preact/hooks';
import { LocationProvider, Router, Route } from 'preact-iso';
import { Toaster } from 'sonner';
import { AuthGuard } from './components/auth/auth_guard';
import { TradingPage } from './pages/trading';
import { ThemeToggle } from './components/common/theme_toggle';
import { PnlCardModal } from './components/common/pnl_card_modal';
import { pnl_card_visible } from './stores/pnl_card_store';
import { init_exchanges } from './services/exchange/init';
import { current_theme } from './hooks/use_theme';

function HomePage() {
    return (
        <div class="min-h-screen bg-base-100 flex flex-col items-center justify-center gap-4 p-8">
            <div class="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <h1 class="text-4xl font-bold text-base-content">247 Terminal</h1>
            <p class="text-base-content/70">Welcome to 247 Terminal v2</p>
            <a href="/trading" class="btn btn-primary">
                Open Trading View
            </a>
            <button
                class="btn btn-ghost btn-sm text-base-content/50"
                onClick={() => {
                    localStorage.clear();
                    location.reload();
                }}
            >
                Clear Local Storage
            </button>
        </div>
    );
}

function NotFound() {
    return (
        <div class="min-h-screen bg-base-100 flex flex-col items-center justify-center gap-4">
            <h1 class="text-2xl font-bold text-base-content">404</h1>
            <p class="text-base-content/70">Page not found</p>
            <a href="/" class="btn btn-ghost">
                Go Home
            </a>
        </div>
    );
}

export function App() {
    useEffect(() => {
        init_exchanges().catch(console.error);
    }, []);

    return (
        <AuthGuard>
            <LocationProvider>
                <Router>
                    <Route path="/" component={HomePage} />
                    <Route path="/trading" component={TradingPage} />
                    <Route default component={NotFound} />
                </Router>
            </LocationProvider>
            {pnl_card_visible.value && <PnlCardModal />}
            <Toaster
                theme={current_theme.value === 'terminal-dark' ? 'dark' : 'light'}
                closeButton
            />
        </AuthGuard>
    );
}
