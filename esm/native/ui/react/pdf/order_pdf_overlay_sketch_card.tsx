import { memo, useCallback, useRef } from 'react';
import type { MutableRefObject, ReactElement } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import { useObservedOrderPdfDrawingRect } from './order_pdf_overlay_sketch_panel_measurement_hooks.js';
import { useCanvasRedraw } from './order_pdf_overlay_sketch_panel_canvas_hooks.js';
import { OrderPdfSketchNoteBox } from './order_pdf_overlay_sketch_note_box.js';
import { useOrderPdfSketchCardTextLayer } from './order_pdf_overlay_sketch_card_text_layer_hooks.js';
import { useOrderPdfSketchCardDrawingHooks } from './order_pdf_overlay_sketch_card_drawing_hooks.js';
import {
  resolveOrderPdfSketchCardCanvasToolClassName,
  resolveOrderPdfSketchCardStageWidth,
  type OrderPdfSketchCardDrawConfig,
} from './order_pdf_overlay_sketch_card_runtime.js';

export type { OrderPdfSketchCardDrawConfig } from './order_pdf_overlay_sketch_card_runtime.js';

type OrderPdfSketchCardProps = {
  entry: OrderPdfSketchPreviewEntry;
  selected: boolean;
  tool: OrderPdfSketchTool;
  strokes: OrderPdfSketchStroke[];
  textBoxes: OrderPdfSketchTextBox[];
  drawConfigRef: MutableRefObject<OrderPdfSketchCardDrawConfig>;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  onCommitStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onEnterTextMode: () => void;
  onExitTextMode: () => void;
};

export const OrderPdfSketchCard = memo(function OrderPdfSketchCard(
  props: OrderPdfSketchCardProps
): ReactElement {
  const {
    entry,
    selected,
    tool,
    strokes,
    textBoxes,
    drawConfigRef,
    onSelect,
    onCommitStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onEnterTextMode,
    onExitTextMode,
  } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingStrokeRef = useRef<OrderPdfSketchStroke | null>(null);

  const {
    rect: hostRect,
    rectRef: hostRectRef,
    refreshRectNow: refreshHostRect,
  } = useObservedOrderPdfDrawingRect({
    elementRef: hostRef,
    observeScroll: true,
    publish: 'size',
  });
  const stageWidth = resolveOrderPdfSketchCardStageWidth({
    hostWidth: hostRect?.width,
    entryWidth: entry.width,
  });
  const redraw = useCanvasRedraw({
    canvasRef,
    hostRef,
    hostRect,
    refreshHostRect,
    strokes,
    textBoxes: [],
    pendingStrokeRef,
  });
  const getHostRect = useCallback(
    (mode: 'cached' | 'fresh' = 'cached') =>
      mode === 'fresh' ? refreshHostRect() : hostRectRef.current || refreshHostRect(),
    [hostRectRef, refreshHostRect]
  );

  const textLayer = useOrderPdfSketchCardTextLayer({
    entryKey: entry.key,
    hostRef,
    tool,
    textBoxes,
    getHostRect,
    onSelect,
    onUpsertTextBox,
    onDeleteTextBox,
    onEnterTextMode,
    onExitTextMode,
  });

  const drawing = useOrderPdfSketchCardDrawingHooks({
    entryKey: entry.key,
    drawConfigRef,
    getHostRect,
    committedStrokeCount: strokes.length,
    pendingStrokeRef,
    redraw,
    textLayer,
    onCommitStroke,
    onSelect,
  });

  const canvasToolClassName = resolveOrderPdfSketchCardCanvasToolClassName(tool);

  return (
    <article className={`wp-pdf-sketch-card${selected ? ' is-selected' : ''}`} dir="rtl">
      <button type="button" className="wp-pdf-sketch-card-title" onClick={() => onSelect(entry.key)}>
        <span>{entry.label}</span>
        <span className="wp-pdf-sketch-card-sub">עמוד {entry.pageIndex + 1}</span>
      </button>
      <div
        className="wp-pdf-sketch-card-stage"
        ref={hostRef}
        style={{ aspectRatio: `${Math.max(1, entry.width)} / ${Math.max(1, entry.height)}` }}
      >
        <img src={entry.url} alt={entry.label} className="wp-pdf-sketch-card-image" draggable={false} />
        <canvas
          ref={canvasRef}
          className={`wp-pdf-sketch-card-canvas${canvasToolClassName}`}
          onPointerDown={drawing.handlePointerDown}
          onPointerMove={drawing.handlePointerMove}
          onPointerUp={drawing.handlePointerFinish}
          onPointerCancel={drawing.handlePointerFinish}
        />
        <div className={`wp-pdf-sketch-card-text-layer${tool === 'text' ? ' is-text-mode' : ''}`}>
          {textLayer.renderedTextBoxes.map(textBox => (
            <OrderPdfSketchNoteBox
              key={textBox.id}
              textBox={textBox}
              active={textLayer.activeTextBoxId === textBox.id}
              textMode={tool === 'text'}
              stageWidth={stageWidth}
              registerEditorRef={textLayer.registerEditorRef}
              onActivate={textLayer.activateTextBox}
              onCommit={textLayer.commitTextBoxById}
              onBoxPointerDown={textLayer.handleBoxPointerDown}
              onHandlePointerDown={textLayer.handleResizeHandlePointerDown}
              colorPaletteOpen={textLayer.activeTextBoxId === textBox.id && textLayer.colorPaletteOpen}
              sizePaletteOpen={textLayer.activeTextBoxId === textBox.id && textLayer.sizePaletteOpen}
              onToggleBold={() => textLayer.handleApplyActiveTextBoxPatch({ bold: !textBox.bold })}
              onToggleColorPalette={textLayer.toggleColorPalette}
              onToggleSizePalette={textLayer.toggleSizePalette}
              onSelectColor={color => textLayer.handleApplyActiveTextBoxPatch({ color })}
              onSelectFontSize={fontSize => textLayer.handleApplyActiveTextBoxPatch({ fontSize })}
              onDelete={() => textLayer.deleteTextBox(textBox.id)}
            />
          ))}
          {textLayer.createRectStyle ? (
            <div className="annotation-box creating" style={textLayer.createRectStyle} aria-hidden="true" />
          ) : null}
        </div>
      </div>
    </article>
  );
});
