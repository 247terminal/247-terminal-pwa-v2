import { lazy, Suspense } from 'preact/compat';
import { Loader2 } from 'lucide-preact';
import type { BuilderFeeModalProps } from '@/types/builder_fee.types';

const LazyBuilderFeeModalInner = lazy(() =>
    import('./builder_fee_modal_inner').then((m) => ({ default: m.BuilderFeeModalInner }))
);

function LoadingFallback() {
    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="bg-base-100 rounded-2xl shadow-2xl p-8">
                <div class="flex items-center gap-3">
                    <Loader2 class="w-5 h-5 animate-spin text-primary" />
                    <span class="text-base-content">Loading wallet...</span>
                </div>
            </div>
        </div>
    );
}

export function BuilderFeeModal(props: BuilderFeeModalProps) {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <LazyBuilderFeeModalInner {...props} />
        </Suspense>
    );
}
