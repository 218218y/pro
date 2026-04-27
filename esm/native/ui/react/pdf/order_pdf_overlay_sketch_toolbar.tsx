import { memo } from 'react';
import type { MutableRefObject, ReactElement, ReactNode } from 'react';

import { createPortal } from 'react-dom';

import type { OrderPdfSketchTool } from './order_pdf_overlay_contracts.js';
import {
  ORDER_PDF_SKETCH_COLOR_SWATCHES,
  ORDER_PDF_SKETCH_WIDTH_OPTIONS,
} from './order_pdf_overlay_sketch_annotations.js';
import { getNodeDocument } from '../viewport_layout_runtime.js';
import { useOrderPdfSketchFloatingPalettePlacement } from './order_pdf_overlay_sketch_panel_measurement_hooks.js';
import type { SketchToolbarPlacement } from './order_pdf_overlay_sketch_panel_measurement_runtime.js';
import type { OrderPdfSketchFreehandTool } from './order_pdf_overlay_sketch_panel_controller.js';

type OrderPdfSketchToolbarProps = {
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

type OrderPdfSketchFloatingPaletteProps = {
  open: boolean;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  paletteRef: MutableRefObject<HTMLDivElement | null>;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  paletteClassName: string;
  children: ReactNode;
};

type FreehandToolDefinition = {
  tool: OrderPdfSketchFreehandTool;
  label: string;
  iconClassName: string;
};

const FREEHAND_TOOLS: readonly FreehandToolDefinition[] = [
  { tool: 'pen', label: 'עט', iconClassName: 'fas fa-pen' },
  { tool: 'marker', label: 'מרקר', iconClassName: 'fas fa-highlighter' },
];

function resolveFreehandToolDefinition(tool: OrderPdfSketchFreehandTool): FreehandToolDefinition {
  return FREEHAND_TOOLS.find(definition => definition.tool === tool) || FREEHAND_TOOLS[0];
}

function OrderPdfSketchFloatingPalette(props: OrderPdfSketchFloatingPaletteProps): ReactElement | null {
  const { open, triggerRef, paletteRef, toolbarRef, paletteClassName, children } = props;
  const placement = useOrderPdfSketchFloatingPalettePlacement({
    open,
    triggerRef,
    paletteRef,
    toolbarRef,
  });
  const doc = getNodeDocument(triggerRef.current || toolbarRef.current);
  const body = doc?.body ?? null;
  if (!open || !body) return null;

  return createPortal(
    <div
      ref={paletteRef}
      className={paletteClassName}
      style={
        placement
          ? {
              position: 'fixed',
              top: `${placement.top}px`,
              left: `${placement.left}px`,
              maxHeight: `${placement.maxHeight}px`,
            }
          : { position: 'fixed', visibility: 'hidden', insetInlineStart: '-9999px', top: '0' }
      }
    >
      {children}
    </div>,
    body
  );
}

export const OrderPdfSketchToolbar = memo(function OrderPdfSketchToolbar(
  props: OrderPdfSketchToolbarProps
): ReactElement {
  const {
    busy,
    tool,
    freehandTool,
    color,
    width,
    drawPaletteOpen,
    widthPaletteOpen,
    colorPaletteOpen,
    colorControlDisabled,
    widthControlDisabled,
    activeHasStrokes,
    activeHasRedo,
    toolbarPlacement,
    toolbarRef,
    drawTriggerRef,
    widthTriggerRef,
    colorTriggerRef,
    drawPaletteRef,
    widthPaletteRef,
    colorPaletteRef,
    onSetTool,
    onActivateDrawTool,
    onToggleWidthPalette,
    onToggleColorPalette,
    onSelectFreehandTool,
    onSelectWidth,
    onSelectColor,
    onRefresh,
    onUndo,
    onRedo,
    onClear,
  } = props;
  const freehandDefinition = resolveFreehandToolDefinition(freehandTool);
  const freehandActive = tool === 'pen' || tool === 'marker';

  return (
    <aside className="wp-pdf-sketch-toolbar-rail" dir="rtl">
      <div
        className={`wp-pdf-sketch-toolbar wp-pdf-sketch-toolbar--floating${toolbarPlacement.mode === 'fixed' ? ' is-fixed' : ''}`}
        dir="rtl"
        ref={toolbarRef}
        style={
          toolbarPlacement.mode === 'fixed'
            ? {
                top: `${toolbarPlacement.top}px`,
                right: `${toolbarPlacement.right}px`,
                maxHeight: `${toolbarPlacement.maxHeight}px`,
              }
            : undefined
        }
      >
        <div className="wp-pdf-sketch-toolbar-stack">
          <div className="wp-pdf-sketch-toolbar-control">
            <button
              type="button"
              ref={drawTriggerRef}
              className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn wp-pdf-sketch-tool-btn--combo${freehandActive || drawPaletteOpen ? ' active-state' : ''}`}
              onClick={onActivateDrawTool}
              title={`${freehandDefinition.label} / מרקר`}
              aria-label={`${freehandDefinition.label} / מרקר`}
              aria-expanded={drawPaletteOpen}
              aria-pressed={freehandActive}
            >
              <span className="wp-pdf-sketch-tool-btn-mainicon" aria-hidden="true">
                <i className={freehandDefinition.iconClassName} />
              </span>
              <span className="wp-pdf-sketch-tool-btn-caret" aria-hidden="true">
                <i className={`fas ${drawPaletteOpen ? 'fa-chevron-left' : 'fa-chevron-down'}`} />
              </span>
            </button>
          </div>

          <button
            type="button"
            className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn${tool === 'eraser' ? ' active-state' : ''}`}
            onClick={() => onSetTool('eraser')}
            title="מחק"
            aria-label="מחק"
            aria-pressed={tool === 'eraser'}
          >
            <i className="fas fa-eraser" />
          </button>

          <div className="toolbar-size-container wp-pdf-sketch-toolbar-control">
            <button
              type="button"
              ref={widthTriggerRef}
              className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-toolbar-trigger${widthPaletteOpen ? ' active-state' : ''}`}
              onClick={onToggleWidthPalette}
              title={
                tool === 'text' ? 'גודל הטקסט נקבע מהתיבה הפעילה' : tool === 'eraser' ? 'גודל מחק' : 'עובי'
              }
              aria-label={
                tool === 'text' ? 'גודל הטקסט נקבע מהתיבה הפעילה' : tool === 'eraser' ? 'גודל מחק' : 'עובי'
              }
              aria-expanded={widthPaletteOpen}
              disabled={widthControlDisabled}
            >
              {width}
            </button>
          </div>

          <div className="toolbar-color-container wp-pdf-sketch-toolbar-control">
            <button
              type="button"
              ref={colorTriggerRef}
              className={`toolbar-btn toolbar-btn--square wp-pdf-sketch-toolbar-trigger${colorPaletteOpen ? ' active-state' : ''}`}
              onClick={onToggleColorPalette}
              title={
                tool === 'text'
                  ? 'צבע הטקסט נקבע מהתיבה הפעילה'
                  : colorControlDisabled
                    ? 'צבע לא רלוונטי למחיקה'
                    : 'צבע'
              }
              aria-label={
                tool === 'text'
                  ? 'צבע הטקסט נקבע מהתיבה הפעילה'
                  : colorControlDisabled
                    ? 'צבע לא רלוונטי למחיקה'
                    : 'צבע'
              }
              aria-expanded={colorPaletteOpen}
              disabled={colorControlDisabled}
            >
              <span className="wp-pdf-sketch-toolbar-color-chip" style={{ backgroundColor: color }} />
            </button>
          </div>

          <div className="wp-pdf-sketch-toolbar-divider" />

          <button
            type="button"
            className="toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn"
            onClick={onRefresh}
            disabled={busy}
            title={busy ? 'טוען סקיצות…' : 'רענן סקיצות'}
            aria-label={busy ? 'טוען סקיצות' : 'רענן סקיצות'}
          >
            <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-sync'}`} />
          </button>

          <button
            type="button"
            className="toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn"
            onClick={onUndo}
            disabled={!activeHasStrokes}
            title="בטל קו אחרון (Ctrl/Cmd+Z)"
            aria-label="בטל קו אחרון"
          >
            <i className="fas fa-undo" />
          </button>

          <button
            type="button"
            className="toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn"
            onClick={onRedo}
            disabled={!activeHasRedo}
            title="החזר קו אחרון (Ctrl/Cmd+Y)"
            aria-label="החזר קו אחרון"
          >
            <i className="fas fa-redo" />
          </button>

          <button
            type="button"
            className="toolbar-btn toolbar-btn--square wp-pdf-sketch-tool-btn close-btn"
            onClick={onClear}
            disabled={!activeHasStrokes}
            title="נקה עמוד"
            aria-label="נקה עמוד"
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>

      <OrderPdfSketchFloatingPalette
        open={drawPaletteOpen}
        triggerRef={drawTriggerRef}
        paletteRef={drawPaletteRef}
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

      <OrderPdfSketchFloatingPalette
        open={widthPaletteOpen}
        triggerRef={widthTriggerRef}
        paletteRef={widthPaletteRef}
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

      <OrderPdfSketchFloatingPalette
        open={colorPaletteOpen}
        triggerRef={colorTriggerRef}
        paletteRef={colorPaletteRef}
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
    </aside>
  );
});
