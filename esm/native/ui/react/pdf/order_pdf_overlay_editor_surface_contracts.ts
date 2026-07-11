import type { DragEventHandler, MutableRefObject, PointerEventHandler, ReactNode } from 'react';

import type { OrderPdfEditableScalarField } from './order_pdf_overlay_draft_state.js';
import type {
  InlineDetailsConfirmState,
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import type { OrderPdfOverlayLayout } from './order_pdf_overlay_layout.js';
import type {
  OrderPdfDetailsEditorHandlers,
  OrderPdfNotesEditorHandlers,
} from './order_pdf_overlay_rich_editors.js';

export type OrderPdfOverlayAnnotationActions = {
  onAppendStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (
    key: OrderPdfSketchAnnotationPageKey,
    annotation: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClear: (key: OrderPdfSketchAnnotationPageKey) => void;
};

export type OrderPdfOverlayEditorRefs = {
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  detailsRichRef: MutableRefObject<HTMLDivElement | null>;
  notesRichRef: MutableRefObject<HTMLDivElement | null>;
  orderNoInputRef: MutableRefObject<HTMLInputElement | null>;
};

export type OrderPdfOverlayEditorStageModel = {
  dragOver: boolean;
  layout: OrderPdfOverlayLayout;
  draft: OrderPdfDraft | null;
  detailsEditorHandlers: OrderPdfDetailsEditorHandlers;
  notesEditorHandlers: OrderPdfNotesEditorHandlers;
  onScalarFieldChange: (key: OrderPdfEditableScalarField, value: string) => void;
  onPointerDownCapture: PointerEventHandler<HTMLDivElement>;
  onPointerMoveCapture: PointerEventHandler<HTMLDivElement>;
  onPointerUpCapture: PointerEventHandler<HTMLDivElement>;
  onPointerCancelCapture: PointerEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
};

export type OrderPdfOverlaySketchModel = {
  open: boolean;
  busy: boolean;
  error: string | null;
  entries: OrderPdfSketchPreviewEntry[];
  ready: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRefresh: () => void;
};

export type OrderPdfOverlayInlineConfirmModel = {
  state: InlineDetailsConfirmState | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export type OrderPdfOverlayEditorSurfaceProps = {
  toolbar: ReactNode;
  refs: OrderPdfOverlayEditorRefs;
  stage: OrderPdfOverlayEditorStageModel;
  sketch: OrderPdfOverlaySketchModel;
  annotations: OrderPdfOverlayAnnotationActions;
  inlineConfirm: OrderPdfOverlayInlineConfirmModel;
};
