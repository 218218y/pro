import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';
import { getNodeWindow } from '../viewport_layout_runtime.js';
import { resolveOrderPdfSketchRenderedTextBoxes } from './order_pdf_overlay_sketch_text_box_interaction_preview.js';
import { readOrderPdfSketchEditorTextValue } from './order_pdf_overlay_sketch_note_box_runtime.js';
import { useOrderPdfSketchCardTextLayerInteractions } from './order_pdf_overlay_sketch_card_text_layer_interactions_hooks.js';

type OrderPdfSketchCardTextLayerArgs = {
  entryKey: OrderPdfSketchAnnotationPageKey;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  tool: OrderPdfSketchTool;
  textBoxes: OrderPdfSketchTextBox[];
  getHostRect: (mode?: 'cached' | 'fresh') => DrawingRect | null;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onEnterTextMode: () => void;
  onExitTextMode: () => void;
};

type OrderPdfSketchCardTextLayerResult = {
  activeTextBoxId: string | null;
  colorPaletteOpen: boolean;
  createRectStyle: CSSProperties | null;
  registerEditorRef: (id: string, element: HTMLDivElement | null) => void;
  renderedTextBoxes: OrderPdfSketchTextBox[];
  sizePaletteOpen: boolean;
  activateTextBox: (id: string) => void;
  clearActiveTextBox: () => void;
  commitTextBoxById: (id: string) => boolean;
  deleteTextBox: (id: string) => void;
  handleApplyActiveTextBoxPatch: (patch: Partial<OrderPdfSketchTextBox>) => void;
  handleBoxPointerDown: (textBox: OrderPdfSketchTextBox, event: ReactPointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleResizeHandlePointerDown: (
    textBox: OrderPdfSketchTextBox,
    dir: string,
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
  toggleColorPalette: () => void;
  toggleSizePalette: () => void;
};

export function useOrderPdfSketchCardTextLayer(
  args: OrderPdfSketchCardTextLayerArgs
): OrderPdfSketchCardTextLayerResult {
  const {
    entryKey,
    getHostRect,
    hostRef,
    onDeleteTextBox,
    onEnterTextMode,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    textBoxes,
    tool,
  } = args;
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTextBoxId, setActiveTextBoxId] = useState<string | null>(null);
  const [colorPaletteOpen, setColorPaletteOpen] = useState<boolean>(false);
  const [sizePaletteOpen, setSizePaletteOpen] = useState<boolean>(false);

  const registerEditorRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) editorRefs.current[id] = element;
    else delete editorRefs.current[id];
  }, []);

  const readEditorText = useCallback(
    (id: string, fallback: string) =>
      readOrderPdfSketchEditorTextValue(editorRefs.current[id] || null, fallback),
    []
  );

  const closeTextBoxPalettes = useCallback(() => {
    setColorPaletteOpen(false);
    setSizePaletteOpen(false);
  }, []);

  const clearActiveTextBox = useCallback(() => {
    setActiveTextBoxId(null);
    closeTextBoxPalettes();
  }, [closeTextBoxPalettes]);

  useEffect(() => {
    if (!activeTextBoxId) return;
    if (textBoxes.some(textBox => textBox.id === activeTextBoxId)) return;
    clearActiveTextBox();
  }, [activeTextBoxId, clearActiveTextBox, textBoxes]);

  const focusTextBoxEditor = useCallback(
    (id: string) => {
      const win = getNodeWindow(hostRef.current);
      win?.setTimeout(() => {
        const editor = editorRefs.current[id];
        if (!editor) return;
        try {
          editor.focus();
          const selection = editor.ownerDocument?.getSelection?.();
          if (!selection) return;
          const range = editor.ownerDocument?.createRange?.();
          if (!range) return;
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch {
          // ignore focus errors
        }
      }, 0);
    },
    [hostRef]
  );

  const {
    commitTextBoxById,
    createRectStyle,
    deleteTextBox,
    handleBoxPointerDown,
    handleCanvasPointerDown,
    handleCanvasPointerFinish,
    handleCanvasPointerMove,
    handleResizeHandlePointerDown,
    interactionPreviewBox,
    persistLiveTextBox,
  } = useOrderPdfSketchCardTextLayerInteractions({
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
  });

  const renderedTextBoxes = useMemo(
    () => resolveOrderPdfSketchRenderedTextBoxes({ textBoxes, previewBox: interactionPreviewBox }),
    [interactionPreviewBox, textBoxes]
  );
  const activeTextBox = useMemo(
    () => renderedTextBoxes.find(textBox => textBox.id === activeTextBoxId) || null,
    [activeTextBoxId, renderedTextBoxes]
  );

  const activateTextBox = useCallback(
    (id: string) => {
      onEnterTextMode();
      onSelect(entryKey);
      if (activeTextBoxId && activeTextBoxId !== id) commitTextBoxById(activeTextBoxId);
      setActiveTextBoxId(id);
      closeTextBoxPalettes();
      focusTextBoxEditor(id);
    },
    [
      activeTextBoxId,
      closeTextBoxPalettes,
      commitTextBoxById,
      entryKey,
      focusTextBoxEditor,
      onEnterTextMode,
      onSelect,
    ]
  );

  const handleApplyActiveTextBoxPatch = useCallback(
    (patch: Partial<OrderPdfSketchTextBox>) => {
      if (!activeTextBox) return;
      const next = { ...activeTextBox, text: readEditorText(activeTextBox.id, activeTextBox.text), ...patch };
      persistLiveTextBox(next, false);
      if (patch.color) setColorPaletteOpen(false);
      if (typeof patch.fontSize === 'number') setSizePaletteOpen(false);
      focusTextBoxEditor(activeTextBox.id);
    },
    [activeTextBox, focusTextBoxEditor, persistLiveTextBox, readEditorText]
  );

  const toggleColorPalette = useCallback(() => {
    setSizePaletteOpen(false);
    setColorPaletteOpen(prev => !prev);
  }, []);

  const toggleSizePalette = useCallback(() => {
    setColorPaletteOpen(false);
    setSizePaletteOpen(prev => !prev);
  }, []);

  return {
    activeTextBoxId,
    colorPaletteOpen,
    createRectStyle,
    registerEditorRef,
    renderedTextBoxes,
    sizePaletteOpen,
    activateTextBox,
    clearActiveTextBox,
    commitTextBoxById,
    deleteTextBox,
    handleApplyActiveTextBoxPatch,
    handleBoxPointerDown,
    handleCanvasPointerDown,
    handleCanvasPointerFinish,
    handleCanvasPointerMove,
    handleResizeHandlePointerDown,
    toggleColorPalette,
    toggleSizePalette,
  };
}
