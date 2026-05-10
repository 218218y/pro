import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

export const ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH = 595;

export function resolveOrderPdfSketchTextBoxScale(stageWidth: number): number {
  if (!Number.isFinite(stageWidth) || stageWidth <= 0) return 1;
  return Math.max(0.5, stageWidth / ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH);
}

export function resolveOrderPdfSketchTextBoxStyle(textBox: OrderPdfSketchTextBox): CSSProperties {
  return {
    left: `${textBox.x * 100}%`,
    top: `${textBox.y * 100}%`,
    width: `${textBox.width * 100}%`,
    height: `${textBox.height * 100}%`,
  };
}

export function resolveOrderPdfSketchTextBoxEditorStyle(
  textBox: OrderPdfSketchTextBox,
  stageWidth: number
): CSSProperties {
  return {
    color: textBox.color,
    fontSize: `${Math.max(12, textBox.fontSize * resolveOrderPdfSketchTextBoxScale(stageWidth))}px`,
    fontWeight: textBox.bold ? 700 : 400,
  };
}

export function normalizeOrderPdfSketchEditorText(value: string): string {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

export function readOrderPdfSketchEditorTextValue(
  element: HTMLDivElement | null,
  defaultText: string
): string {
  if (!element) return normalizeOrderPdfSketchEditorText(defaultText);
  const raw = typeof element.innerText === 'string' ? element.innerText : element.textContent || defaultText;
  return normalizeOrderPdfSketchEditorText(raw);
}

export function handleOrderPdfSketchEditorKeyDown(
  event: ReactKeyboardEvent<HTMLDivElement>,
  onCommit: () => void
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    try {
      event.currentTarget.blur();
    } catch {
      onCommit();
    }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    try {
      event.currentTarget.blur();
    } catch {
      onCommit();
    }
  }
}
