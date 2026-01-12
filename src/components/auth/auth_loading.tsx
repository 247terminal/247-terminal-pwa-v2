export function AuthLoading() {
    return (
        <div class="min-h-screen bg-base-100 flex items-center justify-center">
            <div class="flex flex-col items-center gap-4">
                <span class="loading loading-spinner loading-lg text-primary"></span>
                <p class="text-base-content/70">Checking session...</p>
            </div>
        </div>
    );
}
