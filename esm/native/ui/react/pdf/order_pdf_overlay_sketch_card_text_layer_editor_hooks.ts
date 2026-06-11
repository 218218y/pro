import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';

import { getNodeWindow } from '../viewport_layout_runtime.js';
import { readOrderPdfSketchEditorTextValue } from './order_pdf_overlay_sketch_note_box_runtime.js';
import type { OrderPdfSketchTextLayerEditorRefs } from './order_pdf_overlay_sketch_card_text_layer_hooks_types.js';

type OrderPdfSketchCardTextLayerEditorArgs = {
  hostRef: MutableRefObject<HTMLDivElement | null>;
};

type OrderPdfSketchCardTextLayerEditorResult = {
  registerEditorRef: (id: string, element: HTMLDivElement | null) => void;
  readEditorText: (id: string, fallback: string) => string;
  focusTextBoxEditor: (id: string) => void;
};

export function useOrderPdfSketchCardTextLayerEditor(
  args: OrderPdfSketchCardTextLayerEditorArgs
): OrderPdfSketchCardTextLayerEditorResult {
  const { hostRef } = args;
  const editorRefs = useRef<OrderPdfSketchTextLayerEditorRefs>({});

  const registerEditorRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) editorRefs.current[id] = element;
    else delete editorRefs.current[id];
  }, []);

  const readEditorText = useCallback(
    (id: string, fallback: string) =>
      readOrderPdfSketchEditorTextValue(editorRefs.current[id] || null, fallback),
    []
  );

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

  return { registerEditorRef, readEditorText, focusTextBoxEditor };
}
