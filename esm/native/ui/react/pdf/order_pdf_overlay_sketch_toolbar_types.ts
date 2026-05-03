import type { MutableRefObject, ReactNode } from 'react';

import type { OrderPdfSketchTool } from './order_pdf_overlay_contracts.js';
import type { SketchToolbarPlacement } from './order_pdf_overlay_sketch_panel_measurement_runtime.js';
import type { OrderPdfSketchFreehandTool } from './order_pdf_overlay_sketch_panel_controller.js';

export type OrderPdfSketchToolbarProps = {
  busy: boolean;
  tool: OrderPdfSketchTool;
  freehandTool: OrderPdfSketchFreehandTool;
  color: string;
  width: number;
  drawPaletteOpen: boolean;
  widthPaletteOpen: boolean;
  colorPaletteOpen: boolean;
  colorControlDisabled: boolean;
  widthControlDisabled: boolean;
  activeHasStrokes: boolean;
  activeHasRedo: boolean;
  toolbarPlacement: SketchToolbarPlacement;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  drawTriggerRef: MutableRefObject<HTMLButtonElement | null>;
  widthTriggerRef: MutableRefObject<HTMLButtonElement | null>;
  colorTriggerRef: MutableRefObject<HTMLButtonElement | null>;
  drawPaletteRef: MutableRefObject<HTMLDivElement | null>;
  widthPaletteRef: MutableRefObject<HTMLDivElement | null>;
  colorPaletteRef: MutableRefObject<HTMLDivElement | null>;
  onSetTool: (tool: OrderPdfSketchTool) => void;
  onActivateDrawTool: () => void;
  onToggleWidthPalette: () => void;
  onToggleColorPalette: () => void;
  onSelectFreehandTool: (tool: OrderPdfSketchFreehandTool) => void;
  onSelectWidth: (width: number) => void;
  onSelectColor: (color: string) => void;
  onRefresh: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export type OrderPdfSketchFloatingPaletteProps = {
  open: boolean;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  paletteRef: MutableRefObject<HTMLDivElement | null>;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  paletteClassName: string;
  children: ReactNode;
};

export type FreehandToolDefinition = {
  tool: OrderPdfSketchFreehandTool;
  label: string;
  iconClassName: string;
};
