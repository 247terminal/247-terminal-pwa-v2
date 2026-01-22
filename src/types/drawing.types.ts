export type DrawingTool =
    | 'select'
    | 'measure'
    | 'horizontal_line'
    | 'trend_line'
    | 'rectangle'
    | 'brush'
    | 'delete';

export interface ChartPoint {
    time: number;
    price: number;
    _logical?: number;
}

export interface PixelPoint {
    x: number;
    y: number;
}

export interface DrawingBase {
    id: string;
    type: DrawingTool;
    color: string;
    selected: boolean;
}

export interface LineDrawing extends DrawingBase {
    type: 'horizontal_line' | 'trend_line';
    points: [ChartPoint] | [ChartPoint, ChartPoint];
}

export interface RectangleDrawing extends DrawingBase {
    type: 'rectangle';
    points: [ChartPoint, ChartPoint];
}

export interface BrushDrawing extends DrawingBase {
    type: 'brush';
    points: ChartPoint[];
}

export interface MeasureDrawing extends DrawingBase {
    type: 'measure';
    points: [ChartPoint, ChartPoint];
}

export type Drawing = LineDrawing | RectangleDrawing | BrushDrawing | MeasureDrawing;

export interface ActiveDrawing {
    type?: DrawingTool;
    color?: string;
    points?: ChartPoint[];
}

export interface MeasureResult {
    price_diff: number;
    percent_change: number;
    bars: number;
    time_seconds: number;
    start_price: number;
    end_price: number;
}

export interface DrawingState {
    tool: DrawingTool;
    drawings: Drawing[];
    active_drawing: Partial<Drawing> | null;
    selected_id: string | null;
}

export interface DrawingOverlayProps {
    chart: import('lightweight-charts').IChartApi | null;
    series: import('lightweight-charts').ISeriesApi<'Candlestick'> | null;
    drawings: Drawing[];
    active_drawing: ActiveDrawing | null;
    selected_id: string | null;
    timeframe_seconds: number;
    measure_result: MeasureResult | null;
    measure_points: [ChartPoint, ChartPoint] | null;
    tick_size: number;
}

export interface ColorPickerProps {
    color: string;
    on_change: (color: string) => void;
    on_close?: () => void;
}

export interface ColorState {
    hue: number;
    saturation: number;
    value: number;
    opacity: number;
    hex_input: string;
    dragging_wheel: boolean;
}

export type ColorAction =
    | { type: 'SET_HSV'; hue: number; saturation: number; value: number; hex_input: string }
    | { type: 'SET_OPACITY'; opacity: number }
    | { type: 'SET_HEX_INPUT'; hex_input: string }
    | { type: 'SET_DRAGGING'; dragging_wheel: boolean }
    | {
          type: 'INIT';
          hue: number;
          saturation: number;
          value: number;
          opacity: number;
          hex_input: string;
      };

export interface ToolButtonProps {
    active: boolean;
    on_click: () => void;
    children: preact.ComponentChildren;
    title: string;
    aria_label?: string;
}

export interface DrawingToolbarProps {
    active_tool: DrawingTool;
    on_tool_change: (tool: DrawingTool) => void;
    on_delete_selected: () => void;
    on_clear_all: () => void;
    selected_id: string | null;
    has_drawings: boolean;
    selected_color?: string;
    on_color_change?: (color: string) => void;
}

export type HandleType =
    | 'start'
    | 'end'
    | 'center'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';

export interface HandleInfo {
    drawing_id: string;
    handle_type: HandleType;
}

export interface UseChartDrawingProps {
    chart_ref: import('preact').RefObject<import('lightweight-charts').IChartApi | null>;
    series_ref: import('preact').RefObject<
        import('lightweight-charts').ISeriesApi<'Candlestick'> | null
    >;
    container_ref: import('preact').RefObject<HTMLDivElement | null>;
    timeframe: string;
    first_candle_time: number | null;
}
