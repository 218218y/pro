import { memo } from 'react';
import type { ReactElement } from 'react';

import { resolveFreehandToolDefinition } from './order_pdf_overlay_sketch_toolbar_freehand.js';
import {
  OrderPdfSketchColorPalette,
  OrderPdfSketchDrawToolPalette,
  OrderPdfSketchWidthPalette,
} from './order_pdf_overlay_sketch_toolbar_palettes.js';
import type { OrderPdfSketchToolbarProps } from './order_pdf_overlay_sketch_toolbar_types.js';

function resolveWidthTitle(tool: OrderPdfSketchToolbarProps['tool']): string {
  return tool === 'text' ? 'גודל הטקסט נקבע מהתיבה הפעילה' : tool === 'eraser' ? 'גודל מחק' : 'עובי';
}

function resolveColorTitle(tool: OrderPdfSketchToolbarProps['tool'], disabled: boolean): string {
  return tool === 'text' ? 'צבע הטקסט נקבע מהתיבה הפעילה' : disabled ? 'צבע לא רלוונטי למחיקה' : 'צבע';
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
  const widthTitle = resolveWidthTitle(tool);
  const colorTitle = resolveColorTitle(tool, colorControlDisabled);

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
              title={widthTitle}
              aria-label={widthTitle}
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
              title={colorTitle}
              aria-label={colorTitle}
              aria-expanded={colorPaletteOpen}
              disabled={colorControlDisabled}
            >
              <span className="wp-pdf-sketch-toolbar-color-chip" style={{ backgroundColor: color }} />
            </button>
          </div>

          <div className="wp-pdf-sketch-toolbar-divider" />
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

      <OrderPdfSketchDrawToolPalette
        open={drawPaletteOpen}
        tool={tool}
        freehandTool={freehandTool}
        triggerRef={drawTriggerRef}
        paletteRef={drawPaletteRef}
        toolbarRef={toolbarRef}
        onSelectFreehandTool={onSelectFreehandTool}
      />

      <OrderPdfSketchWidthPalette
        open={widthPaletteOpen}
        width={width}
        triggerRef={widthTriggerRef}
        paletteRef={widthPaletteRef}
        toolbarRef={toolbarRef}
        onSelectWidth={onSelectWidth}
      />

      <OrderPdfSketchColorPalette
        open={colorPaletteOpen}
        color={color}
        triggerRef={colorTriggerRef}
        paletteRef={colorPaletteRef}
        toolbarRef={toolbarRef}
        onSelectColor={onSelectColor}
      />
    </aside>
  );
});
