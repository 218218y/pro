import type { ReactElement } from 'react';

import { OrderPdfSketchShapeToolbar } from './order_pdf_overlay_sketch_shape_toolbar.js';
import { OrderPdfSketchToolbar } from './order_pdf_overlay_sketch_toolbar.js';
import { OrderPdfSketchPanelCards } from './order_pdf_overlay_sketch_panel_cards.js';
import { OrderPdfSketchPanelHeader } from './order_pdf_overlay_sketch_panel_header.js';
import { useOrderPdfSketchPanelViewHooks } from './order_pdf_overlay_sketch_panel_view_hooks.js';
import type { OrderPdfOverlaySketchPanelProps } from './order_pdf_overlay_sketch_panel_types.js';

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
            <OrderPdfSketchPanelHeader
              activeEntry={activeEntry}
              busy={busy}
              error={error}
              entryCount={entries.length}
            />

            <OrderPdfSketchPanelCards
              entries={entries}
              activeKey={activeKey}
              strokesByKey={strokesByKey}
              textBoxesByKey={textBoxesByKey}
              tool={tool}
              drawConfigRef={drawConfigRef}
              onSelect={setActiveKey}
              onCommitStroke={handleAppendStroke}
              onUpsertTextBox={handleUpsertTextBox}
              onDeleteTextBox={handleDeleteTextBox}
              onEnterTextMode={handleEnterTextMode}
              onExitTextMode={handleExitTextMode}
            />
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
