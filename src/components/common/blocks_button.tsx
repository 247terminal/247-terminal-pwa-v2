import { LayoutGrid } from 'lucide-preact';
import { IconButton } from './icon_button';

interface BlocksButtonProps {
    on_click?: () => void;
}

export function BlocksButton({ on_click }: BlocksButtonProps) {
    return (
        <IconButton variant="primary" on_click={on_click}>
            <LayoutGrid class="w-4 h-4" />
        </IconButton>
    );
}
