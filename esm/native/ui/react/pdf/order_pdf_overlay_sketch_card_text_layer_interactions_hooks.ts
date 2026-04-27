import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  buildOrderPdfSketchPersistedTextBoxMap,
  resolveOrderPdfSketchCommitTextBoxSource,
  resolveOrderPdfSketchPersistLiveTextBox,
  shouldResetOrderPdfSketchInteractionPreview,
} from './order_pdf_overlay_sketch_card_text_layer_runtime.js';
import { useOrderPdfSketchCardTextLayerPointerHooks } from './order_pdf_overlay_sketch_card_text_layer_pointer_hooks.js';

type OrderPdfSketchCardTextLayerInteractionsArgs = {
  activeTextBoxId: string | null;
  entryKey: OrderPdfSketchAnnotationPageKey;
  getHostRect: (mode?: 'cached' | 'fresh') => DrawingRect | null;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onExitTextMode: () => void;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  readEditorText: (id: string, fallback: string) => string;
  setActiveTextBoxId: (id: string | null) => void;
  closeTextBoxPalettes: () => void;
  clearActiveTextBox: () => void;
  focusTextBoxEditor: (id: string) => void;
  textBoxes: OrderPdfSketchTextBox[];
  tool: OrderPdfSketchTool;
};

type OrderPdfSketchCardTextLayerInteractionsResult = {
  createRectStyle: CSSProperties | null;
  interactionPreviewBox: OrderPdfSketchTextBox | null;
  commitTextBoxById: (id: string) => boolean;
  deleteTextBox: (id: string) => void;
  handleBoxPointerDown: (textBox: OrderPdfSketchTextBox, event: ReactPointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleResizeHandlePointerDown: (
    textBox: OrderPdfSketchTextBox,
    dir: string,
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
  persistLiveTextBox: (textBox: OrderPdfSketchTextBox, allowDelete: boolean) => boolean;
};

export function useOrderPdfSketchCardTextLayerInteractions(
  args: OrderPdfSketchCardTextLayerInteractionsArgs
): OrderPdfSketchCardTextLayerInteractionsResult {
  const {
    activeTextBoxId,
    clearActiveTextBox,
    closeTextBoxPalettes,
    entryKey,
    focusTextBoxEditor,
    getHostRect,
    hostRef,
    onDeleteTextBox,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    readEditorText,
    setActiveTextBoxId,
    textBoxes,
    tool,
  } = args;
  const textMode = tool === 'text';
  const persistedTextBoxesRef = useRef<Record<string, OrderPdfSketchTextBox>>({});
  const commitTextBoxByIdRef = useRef<((id: string) => boolean) | null>(null);
  const clearInteractionPreviewBoxRef = useRef<(() => void) | null>(null);
  const interactionPreviewBoxIdRef = useRef<string | null>(null);

  useEffect(() => {
    persistedTextBoxesRef.current = buildOrderPdfSketchPersistedTextBoxMap(textBoxes);
  }, [textBoxes]);

  const persistLiveTextBox = useCallback(
    (textBox: OrderPdfSketchTextBox, allowDelete: boolean) => {
      const result = resolveOrderPdfSketchPersistLiveTextBox({
        textBox,
        allowDelete,
        persistedTextBoxes: persistedTextBoxesRef.current,
        readEditorText,
      });
      persistedTextBoxesRef.current = result.nextPersistedTextBoxes;
      if (interactionPreviewBoxIdRef.current === result.nextTextBox.id) {
        clearInteractionPreviewBoxRef.current?.();
      }
      if (result.action === 'delete') {
        onDeleteTextBox(entryKey, result.nextTextBox.id);
      } else if (result.action === 'upsert') {
        onUpsertTextBox(entryKey, result.nextTextBox);
      }
      return result.kept;
    },
    [entryKey, onDeleteTextBox, onUpsertTextBox, readEditorText]
  );

  const {
    createRectStyle,
    interactionPreviewBox,
    clearInteractionPreviewBox,
    resetInteractionState,
    handleBoxPointerDown,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerFinish,
    handleResizeHandlePointerDown,
  } = useOrderPdfSketchCardTextLayerPointerHooks({
    activeTextBoxId,
    entryKey,
    textMode,
    getHostRect,
    hostRef,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    readEditorText,
    setActiveTextBoxId,
    closeTextBoxPalettes,
    clearActiveTextBox,
    focusTextBoxEditor,
    commitTextBoxByIdRef,
    persistLiveTextBox,
  });

  const commitTextBoxById = useCallback(
    (id: string) => {
      const source = resolveOrderPdfSketchCommitTextBoxSource({
        id,
        interactionPreviewBox,
        textBoxes,
      });
      if (!source) return false;
      const kept = persistLiveTextBox(source, true);
      if (!kept && activeTextBoxId === id) clearActiveTextBox();
      return kept;
    },
    [activeTextBoxId, clearActiveTextBox, interactionPreviewBox, persistLiveTextBox, textBoxes]
  );

  commitTextBoxByIdRef.current = commitTextBoxById;
  clearInteractionPreviewBoxRef.current = clearInteractionPreviewBox;
  interactionPreviewBoxIdRef.current = interactionPreviewBox?.id || null;

  useEffect(() => {
    if (!shouldResetOrderPdfSketchInteractionPreview({ interactionPreviewBox, textBoxes })) return;
    resetInteractionState();
  }, [interactionPreviewBox, resetInteractionState, textBoxes]);

  const deleteTextBox = useCallback(
    (id: string) => {
      onDeleteTextBox(entryKey, id);
      if (activeTextBoxId === id) clearActiveTextBox();
      clearInteractionPreviewBox();
    },
    [activeTextBoxId, clearActiveTextBox, clearInteractionPreviewBox, entryKey, onDeleteTextBox]
  );

  return {
    createRectStyle,
    interactionPreviewBox,
    commitTextBoxById,
    deleteTextBox,
    handleBoxPointerDown,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerFinish,
    handleResizeHandlePointerDown,
    persistLiveTextBox,
  };
}
