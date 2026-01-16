import { Component, type ComponentChildren } from 'preact';

interface ErrorBoundaryProps {
    children: ComponentChildren;
    fallback?: ComponentChildren;
    on_error?: (error: Error, error_info: { componentStack: string }) => void;
}

interface ErrorBoundaryState {
    has_error: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        has_error: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { has_error: true, error };
    }

    componentDidCatch(error: Error, error_info: { componentStack: string }) {
        console.error('error boundary caught:', error, error_info);
        this.props.on_error?.(error, error_info);
    }

    render() {
        if (this.state.has_error) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div class="flex items-center justify-center h-full bg-base-100 text-base-content/60">
                    <div class="text-center p-4">
                        <svg
                            class="w-8 h-8 mx-auto mb-2 text-error/60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p class="text-sm">Something went wrong</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
