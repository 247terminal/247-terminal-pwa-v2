import { Settings } from 'lucide-preact';
import { IconButton } from './icon_button';

interface SettingsButtonProps {
    on_click?: () => void;
}

export function SettingsButton({ on_click }: SettingsButtonProps) {
    return (
        <IconButton variant="ghost" on_click={on_click}>
            <Settings class="w-3.5 h-3.5" />
        </IconButton>
    );
}
