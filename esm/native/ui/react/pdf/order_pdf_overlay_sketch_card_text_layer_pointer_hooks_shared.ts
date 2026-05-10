import type { MutableRefObject } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';

export type OrderPdfSketchCardTextLayerPointerHooksArgs = {
  activeTextBoxId: string | null;
  entryKey: OrderPdfSketchAnnotationPageKey;
  textMode: boolean;
  getHostRect: (mode?: 'cached' | 'fresh') => DrawingRect | null;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  onExitTextMode: () => void;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  readEditorText: (id: string, defaultText: string) => string;
  setActiveTextBoxId: (id: string | null) => void;
  closeTextBoxPalettes: () => void;
  clearActiveTextBox: () => void;
  focusTextBoxEditor: (id: string) => void;
  commitTextBoxByIdRef: MutableRefObject<((id: string) => boolean) | null>;
  persistLiveTextBox: (textBox: OrderPdfSketchTextBox, allowDelete: boolean) => boolean;
};

export function preventOrderPdfSketchPointerEvent(
  event: Pick<PointerEvent, 'preventDefault' | 'stopPropagation'>
): void {
  try {
    event.preventDefault();
    event.stopPropagation();
  } catch {
    // ignore prevent errors
  }
}

export function trySetOrderPdfSketchPointerCapture(
  target: EventTarget | null | undefined,
  pointerId: number
): void {
  try {
    if (target && 'setPointerCapture' in target && typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(pointerId);
    }
  } catch {
    // ignore capture errors
  }
}

export function tryReleaseOrderPdfSketchPointerCapture(
  target: EventTarget | null | undefined,
  pointerId: number
): void {
  try {
    if (target && 'releasePointerCapture' in target && typeof target.releasePointerCapture === 'function') {
      target.releasePointerCapture(pointerId);
    }
  } catch {
    // ignore release failures
  }
}
