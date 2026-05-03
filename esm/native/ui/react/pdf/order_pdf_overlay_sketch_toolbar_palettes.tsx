import type { MutableRefObject, ReactElement } from 'react';

import type { OrderPdfSketchTool } from './order_pdf_overlay_contracts.js';
import {
  ORDER_PDF_SKETCH_COLOR_SWATCHES,
  ORDER_PDF_SKETCH_WIDTH_OPTIONS,
} from './order_pdf_overlay_sketch_annotations.js';
import type { OrderPdfSketchFreehandTool } from './order_pdf_overlay_sketch_panel_controller.js';
import { FREEHAND_TOOLS } from './order_pdf_overlay_sketch_toolbar_freehand.js';
import { OrderPdfSketchFloatingPalette } from './order_pdf_overlay_sketch_toolbar_floating_palette.js';

type SharedFloatingPaletteRefs = {
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
};

type DrawToolPaletteProps = SharedFloatingPaletteRefs & {
  open: boolean;
  tool: OrderPdfSketchTool;
  freehandTool: OrderPdfSketchFreehandTool;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  paletteRef: MutableRefObject<HTMLDivElement | null>;
  onSelectFreehandTool: (tool: OrderPdfSketchFreehandTool) => void;
};

type WidthPaletteProps = SharedFloatingPaletteRefs & {
  open: boolean;
  width: number;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  paletteRef: MutableRefObject<HTMLDivElement | null>;
  onSelectWidth: (width: number) => void;
};

type ColorPaletteProps = SharedFloatingPaletteRefs & {
  open: boolean;
  color: string;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  paletteRef: MutableRefObject<HTMLDivElement | null>;
  onSelectColor: (color: string) => void;
};

export function OrderPdfSketchDrawToolPalette(props: DrawToolPaletteProps): ReactElement {
  const { open, tool, freehandTool, triggerRef, paletteRef, toolbarRef, onSelectFreehandTool } = props;
  return (
    <OrderPdfSketchFloatingPalette
      open={open}
      triggerRef={triggerRef}
      paletteRef={paletteRef}
      toolbarRef={toolbarRef}
      paletteClassName="size-palette wp-pdf-sketch-tool-palette show wp-pdf-sketch-floating-palette"
    >
      {FREEHAND_TOOLS.map(definition => (
        <button
          key={definition.tool}
          type="button"
          className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-palette-btn${freehandTool === definition.tool ? ' active-state' : ''}`}
          onClick={() => onSelectFreehandTool(definition.tool)}
          title={definition.label}
          aria-label={definition.label}
          aria-pressed={tool === definition.tool}
        >
          <i className={definition.iconClassName} />
        </button>
      ))}
    </OrderPdfSketchFloatingPalette>
  );
}

export function OrderPdfSketchWidthPalette(props: WidthPaletteProps): ReactElement {
  const { open, width, triggerRef, paletteRef, toolbarRef, onSelectWidth } = props;
  return (
    <OrderPdfSketchFloatingPalette
      open={open}
      triggerRef={triggerRef}
      paletteRef={paletteRef}
      toolbarRef={toolbarRef}
      paletteClassName="size-palette wp-pdf-sketch-size-palette show wp-pdf-sketch-floating-palette"
    >
      {ORDER_PDF_SKETCH_WIDTH_OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          className={option === width ? 'size-swatch is-selected' : 'size-swatch'}
          onClick={() => onSelectWidth(option)}
        >
          {option}
        </button>
      ))}
    </OrderPdfSketchFloatingPalette>
  );
}

export function OrderPdfSketchColorPalette(props: ColorPaletteProps): ReactElement {
  const { open, color, triggerRef, paletteRef, toolbarRef, onSelectColor } = props;
  return (
    <OrderPdfSketchFloatingPalette
      open={open}
      triggerRef={triggerRef}
      paletteRef={paletteRef}
      toolbarRef={toolbarRef}
      paletteClassName="color-palette wp-pdf-sketch-color-palette is-horizontal show wp-pdf-sketch-floating-palette"
    >
      {ORDER_PDF_SKETCH_COLOR_SWATCHES.map(swatch => (
        <button
          key={swatch}
          type="button"
          className={`color-swatch wp-pdf-sketch-color-swatch${color === swatch ? ' is-selected' : ''}`}
          style={{ backgroundColor: swatch }}
          onClick={() => onSelectColor(swatch)}
          aria-label={`בחר צבע ${swatch}`}
          title={swatch}
        />
      ))}
    </OrderPdfSketchFloatingPalette>
  );
}
