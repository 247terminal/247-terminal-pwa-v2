interface LicenseInputProps {
    value: string;
    on_change: (value: string) => void;
    error?: string;
    disabled?: boolean;
}

export function LicenseInput({ value, on_change, error, disabled }: LicenseInputProps) {
    const handle_change = (e: Event) => {
        const target = e.target as HTMLInputElement;
        on_change(target.value.toUpperCase());
    };

    return (
        <div class="form-control w-full">
            <input
                type="password"
                name="license_key"
                autocomplete="current-password"
                placeholder="ENTER YOUR LICENSE KEY"
                class={`input input-bordered w-full font-mono text-center ${error ? 'input-error' : ''}`}
                value={value}
                onInput={handle_change}
                disabled={disabled}
            />
            {error && (
                <label class="label">
                    <span class="label-text-alt text-error">{error}</span>
                </label>
            )}
        </div>
    );
}
