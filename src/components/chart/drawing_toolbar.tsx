import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { DrawingTool, DrawingToolbarProps, ToolButtonProps } from '../../types/drawing.types';
import { ColorPicker } from './color_picker';

const ToolButton = memo(function ToolButton({
    active,
    on_click,
    children,
    title,
    aria_label,
}: ToolButtonProps) {
    return (
        <button
            type="button"
            onClick={on_click}
            title={title}
            aria-label={aria_label || title}
            aria-pressed={active}
            class={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                active
                    ? 'bg-primary/20 text-primary'
                    : 'text-base-content/50 hover:text-base-content/70 hover:bg-base-300/50'
            }`}
        >
            {children}
        </button>
    );
});

const SelectIcon = memo(function SelectIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
        </svg>
    );
});

const MeasureIcon = memo(function MeasureIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
            <path d="m14.5 12.5 2-2" />
            <path d="m11.5 9.5 2-2" />
            <path d="m8.5 6.5 2-2" />
            <path d="m17.5 15.5 2-2" />
        </svg>
    );
});

const HLineIcon = memo(function HLineIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18" />
        </svg>
    );
});

const TrendLineIcon = memo(function TrendLineIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21L21 3" />
        </svg>
    );
});

const RectangleIcon = memo(function RectangleIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
    );
});

const BrushIcon = memo(function BrushIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            <path d="m15 5 4 4" />
        </svg>
    );
});

const DeleteIcon = memo(function DeleteIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    );
});

const ClearAllIcon = memo(function ClearAllIcon() {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
        </svg>
    );
});

const ColorIcon = memo(function ColorIcon({ color }: { color: string }) {
    return (
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" fill={color} stroke={color} />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity="0.3" />
        </svg>
    );
});

const TOOLS: readonly {
    tool: DrawingTool;
    Icon: preact.FunctionComponent;
    title: string;
    aria_label: string;
}[] = [
    { tool: 'select', Icon: SelectIcon, title: 'Select (Esc)', aria_label: 'Select drawing tool' },
    { tool: 'measure', Icon: MeasureIcon, title: 'Measure', aria_label: 'Measure price and time' },
    {
        tool: 'horizontal_line',
        Icon: HLineIcon,
        title: 'Horizontal Line',
        aria_label: 'Draw horizontal line',
    },
    { tool: 'trend_line', Icon: TrendLineIcon, title: 'Trend Line', aria_label: 'Draw trend line' },
    { tool: 'rectangle', Icon: RectangleIcon, title: 'Rectangle', aria_label: 'Draw rectangle' },
    { tool: 'brush', Icon: BrushIcon, title: 'Brush', aria_label: 'Freehand brush tool' },
] as const;

export const DrawingToolbar = memo(function DrawingToolbar({
    active_tool,
    on_tool_change,
    on_delete_selected,
    on_clear_all,
    selected_id,
    has_drawings,
    selected_color = '#2962ff',
    on_color_change,
}: DrawingToolbarProps) {
    const [show_color_picker, set_show_color_picker] = useState(false);
    const toolbar_ref = useRef<HTMLDivElement>(null);
    const [focused_index, set_focused_index] = useState(-1);

    const get_all_buttons = useCallback(() => {
        if (!toolbar_ref.current) return [];
        return Array.from(toolbar_ref.current.querySelectorAll('button'));
    }, []);

    const handle_keydown = useCallback(
        (e: KeyboardEvent) => {
            const buttons = get_all_buttons();
            if (buttons.length === 0) return;

            let new_index = focused_index;

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                new_index = focused_index < buttons.length - 1 ? focused_index + 1 : 0;
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                new_index = focused_index > 0 ? focused_index - 1 : buttons.length - 1;
            } else if (e.key === 'Home') {
                e.preventDefault();
                new_index = 0;
            } else if (e.key === 'End') {
                e.preventDefault();
                new_index = buttons.length - 1;
            }

            if (new_index !== focused_index && new_index >= 0) {
                set_focused_index(new_index);
                buttons[new_index]?.focus();
            }
        },
        [focused_index, get_all_buttons]
    );

    useEffect(() => {
        const toolbar = toolbar_ref.current;
        if (!toolbar) return;

        const handle_focus_in = (e: FocusEvent) => {
            const buttons = get_all_buttons();
            const index = buttons.indexOf(e.target as HTMLButtonElement);
            if (index >= 0) set_focused_index(index);
        };

        toolbar.addEventListener('focusin', handle_focus_in);
        return () => toolbar.removeEventListener('focusin', handle_focus_in);
    }, [get_all_buttons]);

    const handle_tool_click = useCallback(
        (tool: DrawingTool) => {
            if (active_tool === tool && tool !== 'select') {
                on_tool_change('select');
            } else {
                on_tool_change(tool);
            }
        },
        [active_tool, on_tool_change]
    );

    const handle_color_toggle = useCallback(() => {
        set_show_color_picker((prev) => !prev);
    }, []);

    const handle_color_close = useCallback(() => {
        set_show_color_picker(false);
    }, []);

    return (
        <div
            class="absolute left-3 z-30"
            style={{ top: 'calc(50% - 13px)', transform: 'translateY(-50%)' }}
        >
            <div
                ref={toolbar_ref}
                role="toolbar"
                aria-label="Drawing tools"
                onKeyDown={handle_keydown}
                class="flex flex-col gap-1 bg-base-200/90 rounded-lg p-1 backdrop-blur-sm"
            >
                {TOOLS.map(({ tool, Icon, title, aria_label }) => (
                    <ToolButton
                        key={tool}
                        active={active_tool === tool}
                        on_click={() => handle_tool_click(tool)}
                        title={title}
                        aria_label={aria_label}
                    >
                        <Icon />
                    </ToolButton>
                ))}
                {selected_id && (
                    <>
                        <div class="border-t border-base-content/10 my-1" />
                        <ToolButton
                            active={show_color_picker}
                            on_click={handle_color_toggle}
                            title="Change Color"
                            aria_label="Change selected drawing color"
                        >
                            <ColorIcon color={selected_color} />
                        </ToolButton>
                        <ToolButton
                            active={false}
                            on_click={on_delete_selected}
                            title="Delete Selected"
                            aria_label="Delete selected drawing"
                        >
                            <DeleteIcon />
                        </ToolButton>
                    </>
                )}
                {has_drawings && (
                    <>
                        <div class="border-t border-base-content/10 my-1" />
                        <ToolButton
                            active={false}
                            on_click={on_clear_all}
                            title="Clear All Drawings"
                            aria_label="Clear all drawings from chart"
                        >
                            <ClearAllIcon />
                        </ToolButton>
                    </>
                )}
            </div>
            {show_color_picker && on_color_change && selected_id && (
                <div class="absolute left-full top-1/2 -translate-y-1/2">
                    <ColorPicker
                        color={selected_color}
                        on_change={on_color_change}
                        on_close={handle_color_close}
                    />
                </div>
            )}
        </div>
    );
});
