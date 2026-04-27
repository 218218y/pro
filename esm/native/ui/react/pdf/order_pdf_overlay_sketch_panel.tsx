import type { ReactElement } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import { OrderPdfSketchCard } from './order_pdf_overlay_sketch_card.js';
import { OrderPdfSketchShapeToolbar } from './order_pdf_overlay_sketch_shape_toolbar.js';
import { OrderPdfSketchToolbar } from './order_pdf_overlay_sketch_toolbar.js';
import { useOrderPdfSketchPanelViewHooks } from './order_pdf_overlay_sketch_panel_view_hooks.js';

type OrderPdfOverlaySketchPanelProps = {
  open: boolean;
  busy: boolean;
  error: string | null;
  entries: OrderPdfSketchPreviewEntry[];
  draft: OrderPdfDraft | null;
  onRefresh: () => void;
  onAppendStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (
    key: OrderPdfSketchAnnotationPageKey,
    stroke: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClear: (key: OrderPdfSketchAnnotationPageKey) => void;
};

export function OrderPdfOverlaySketchPanel(props: OrderPdfOverlaySketchPanelProps): ReactElement {
  const {
    open,
    busy,
    error,
    entries,
    draft,
    onRefresh,
    onAppendStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onUndo,
    onRedo,
    onClear,
  } = props;
  const {
    tool,
    freehandTool,
    color,
    width,
    activeKey,
    drawPaletteOpen,
    widthPaletteOpen,
    colorPaletteOpen,
    colorControlDisabled,
    widthControlDisabled,
    strokesByKey,
    textBoxesByKey,
    activeHasStrokes,
    activeHasRedo,
    activeEntry,
    toolbarPlacement,
    shapeToolbarPlacement,
    setTool,
    setActiveKey,
    handleEnterTextMode,
    handleExitTextMode,
    handleAppendStroke,
    handleUpsertTextBox,
    handleDeleteTextBox,
    handleActivateDrawTool,
    handleToggleWidthPalette,
    handleToggleColorPalette,
    handleSelectFreehandTool,
    handleSelectWidth,
    handleSelectColor,
    handleUndoActive,
    handleRedoActive,
    handleClearActive,
    toolbarRef,
    shapeToolbarRef,
    drawTriggerRef,
    widthTriggerRef,
    colorTriggerRef,
    drawPaletteRef,
    widthPaletteRef,
    colorPaletteRef,
    drawConfigRef,
  } = useOrderPdfSketchPanelViewHooks({
    open,
    entries,
    draft,
    onAppendStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onUndo,
    onRedo,
    onClear,
  });

  if (!open) {
    return <section className="wp-pdf-sketch-panel" dir="rtl" aria-hidden="true" />;
  }

  return (
    <section className="wp-pdf-sketch-panel is-open" dir="rtl">
      <div className="wp-pdf-sketch-panel-body">
        <div className="wp-pdf-sketch-panel-shell">
          <OrderPdfSketchShapeToolbar
            tool={tool}
            toolbarPlacement={shapeToolbarPlacement}
            toolbarRef={shapeToolbarRef}
            onSetTool={setTool}
          />

          <div className="wp-pdf-sketch-panel-content">
            <div className="wp-pdf-sketch-panel-head">
              <div className="wp-pdf-sketch-panel-titlebox">
                <div className="wp-pdf-sketch-panel-title">סקיצות לציור</div>
                <div className="wp-pdf-sketch-panel-subtitle">
                  הציור נשמר על אותו עמוד גם אחרי יציאה וחזרה לעורך. הצבע והעובי נלקחים מהסרגל הימני.
                </div>
              </div>
              {activeEntry ? (
                <div className="wp-pdf-sketch-panel-active">דף פעיל: {activeEntry.label}</div>
              ) : null}
            </div>

            {error ? <div className="wp-pdf-sketch-status is-error">{error}</div> : null}
            {busy ? <div className="wp-pdf-sketch-status">טוען את דפי הסקיצה מה‑PDF הנוכחי…</div> : null}
            {!busy && !entries.length ? (
              <div className="wp-pdf-sketch-status">
                אין כרגע דפי סקיצה זמינים להצגה. לחץ על רענון כדי לטעון אותם.
              </div>
            ) : null}

            <div className="wp-pdf-sketch-grid">
              {entries.map(entry => (
                <OrderPdfSketchCard
                  key={entry.key}
                  entry={entry}
                  selected={activeKey === entry.key}
                  strokes={strokesByKey[entry.key]}
                  textBoxes={textBoxesByKey[entry.key]}
                  tool={tool}
                  drawConfigRef={drawConfigRef}
                  onSelect={setActiveKey}
                  onCommitStroke={handleAppendStroke}
                  onUpsertTextBox={handleUpsertTextBox}
                  onDeleteTextBox={handleDeleteTextBox}
                  onEnterTextMode={handleEnterTextMode}
                  onExitTextMode={handleExitTextMode}
                />
              ))}
            </div>
          </div>

          <OrderPdfSketchToolbar
            busy={busy}
            tool={tool}
            freehandTool={freehandTool}
            color={color}
            width={width}
            drawPaletteOpen={drawPaletteOpen}
            widthPaletteOpen={widthPaletteOpen}
            colorPaletteOpen={colorPaletteOpen}
            colorControlDisabled={colorControlDisabled}
            widthControlDisabled={widthControlDisabled}
            activeHasStrokes={activeHasStrokes}
            activeHasRedo={activeHasRedo}
            toolbarPlacement={toolbarPlacement}
            toolbarRef={toolbarRef}
            drawTriggerRef={drawTriggerRef}
            widthTriggerRef={widthTriggerRef}
            colorTriggerRef={colorTriggerRef}
            drawPaletteRef={drawPaletteRef}
            widthPaletteRef={widthPaletteRef}
            colorPaletteRef={colorPaletteRef}
            onSetTool={setTool}
            onActivateDrawTool={handleActivateDrawTool}
            onToggleWidthPalette={handleToggleWidthPalette}
            onToggleColorPalette={handleToggleColorPalette}
            onSelectFreehandTool={handleSelectFreehandTool}
            onSelectWidth={handleSelectWidth}
            onSelectColor={handleSelectColor}
            onRefresh={onRefresh}
            onUndo={handleUndoActive}
            onRedo={handleRedoActive}
            onClear={handleClearActive}
          />
        </div>
      </div>
    </section>
  );
}
