import type { MutableRefObject, ReactElement } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import { OrderPdfSketchCard } from './order_pdf_overlay_sketch_card.js';
import type { OrderPdfSketchCardDrawConfig } from './order_pdf_overlay_sketch_card_runtime.js';
import type {
  OrderPdfSketchStrokeMap,
  OrderPdfSketchTextBoxMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';

type OrderPdfSketchPanelCardsProps = {
  entries: OrderPdfSketchPreviewEntry[];
  activeKey: OrderPdfSketchAnnotationPageKey;
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
  tool: OrderPdfSketchTool;
  drawConfigRef: MutableRefObject<OrderPdfSketchCardDrawConfig>;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  onCommitStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onEnterTextMode: () => void;
  onExitTextMode: () => void;
};

export function OrderPdfSketchPanelCards(props: OrderPdfSketchPanelCardsProps): ReactElement {
  const {
    entries,
    activeKey,
    strokesByKey,
    textBoxesByKey,
    tool,
    drawConfigRef,
    onSelect,
    onCommitStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onEnterTextMode,
    onExitTextMode,
  } = props;
  return (
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
          onSelect={onSelect}
          onCommitStroke={onCommitStroke}
          onUpsertTextBox={onUpsertTextBox}
          onDeleteTextBox={onDeleteTextBox}
          onEnterTextMode={onEnterTextMode}
          onExitTextMode={onExitTextMode}
        />
      ))}
    </div>
  );
}
