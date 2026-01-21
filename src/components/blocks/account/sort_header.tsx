import { memo } from 'preact/compat';
import { useCallback } from 'preact/hooks';
import type { SortDirection, SortHeaderProps } from '../../../types/account.types';

export type { SortDirection };

function SortHeaderInner<T extends string>({
    label,
    sort_key,
    current_key,
    direction,
    on_sort,
    align = 'left',
    flex = false,
}: SortHeaderProps<T>) {
    const is_active = current_key === sort_key;

    const handle_click = useCallback(() => {
        on_sort(sort_key);
    }, [on_sort, sort_key]);

    return (
        <button
            type="button"
            onClick={handle_click}
            class={`${flex ? 'flex-1' : ''} ${align === 'right' ? 'text-right' : ''} hover:text-base-content transition-colors flex items-center gap-0.5 ${align === 'right' ? 'justify-end' : ''} ${is_active ? 'text-base-content' : ''}`}
        >
            {label}
            {is_active && <span class="text-[8px]">{direction === 'asc' ? '↑' : '↓'}</span>}
        </button>
    );
}

export const SortHeader = memo(SortHeaderInner) as typeof SortHeaderInner;
