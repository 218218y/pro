import type { CSSProperties } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import {
  buildOrderPdfSketchTextBoxCreateRect,
  areOrderPdfSketchTextBoxesEqual,
  isOrderPdfSketchTextEmpty,
} from './order_pdf_overlay_sketch_text_box_runtime.js';
import type { OrderPdfSketchTextCreateSession } from './order_pdf_overlay_sketch_text_box_create_interaction.js';
import { resolveOrderPdfSketchTextBoxStyle } from './order_pdf_overlay_sketch_note_box_runtime.js';

export type OrderPdfSketchPersistedTextBoxMap = Record<string, OrderPdfSketchTextBox>;
export type OrderPdfSketchPersistLiveTextBoxAction = 'noop' | 'delete' | 'upsert';

export function buildOrderPdfSketchPersistedTextBoxMap(
  textBoxes: OrderPdfSketchTextBox[]
): OrderPdfSketchPersistedTextBoxMap {
  const nextEntries: OrderPdfSketchPersistedTextBoxMap = {};
  for (const textBox of textBoxes) nextEntries[textBox.id] = textBox;
  return nextEntries;
}

export function shouldResetOrderPdfSketchInteractionPreview(args: {
  interactionPreviewBox: OrderPdfSketchTextBox | null;
  textBoxes: OrderPdfSketchTextBox[];
}): boolean {
  const { interactionPreviewBox, textBoxes } = args;
  if (!interactionPreviewBox) return false;
  return !textBoxes.some(textBox => textBox.id === interactionPreviewBox.id);
}

export function resolveOrderPdfSketchPersistLiveTextBox(args: {
  textBox: OrderPdfSketchTextBox;
  allowDelete: boolean;
  persistedTextBoxes: OrderPdfSketchPersistedTextBoxMap;
  readEditorText: (id: string, fallback: string) => string;
}): {
  kept: boolean;
  action: OrderPdfSketchPersistLiveTextBoxAction;
  nextTextBox: OrderPdfSketchTextBox;
  baseline: OrderPdfSketchTextBox | null;
  nextPersistedTextBoxes: OrderPdfSketchPersistedTextBoxMap;
} {
  const { allowDelete, persistedTextBoxes, readEditorText, textBox } = args;
  const liveText = readEditorText(textBox.id, textBox.text);
  const nextTextBox = liveText === textBox.text ? textBox : { ...textBox, text: liveText };
  const baseline = persistedTextBoxes[nextTextBox.id] || null;
  if (allowDelete && isOrderPdfSketchTextEmpty(nextTextBox.text)) {
    const nextPersistedTextBoxes = { ...persistedTextBoxes };
    delete nextPersistedTextBoxes[nextTextBox.id];
    return {
      kept: false,
      action: baseline ? 'delete' : 'noop',
      nextTextBox,
      baseline,
      nextPersistedTextBoxes,
    };
  }
  if (areOrderPdfSketchTextBoxesEqual(baseline, nextTextBox)) {
    return {
      kept: true,
      action: 'noop',
      nextTextBox,
      baseline,
      nextPersistedTextBoxes: persistedTextBoxes,
    };
  }
  return {
    kept: true,
    action: 'upsert',
    nextTextBox,
    baseline,
    nextPersistedTextBoxes: {
      ...persistedTextBoxes,
      [nextTextBox.id]: nextTextBox,
    },
  };
}

export function resolveOrderPdfSketchCommitTextBoxSource(args: {
  id: string;
  interactionPreviewBox: OrderPdfSketchTextBox | null;
  textBoxes: OrderPdfSketchTextBox[];
}): OrderPdfSketchTextBox | null {
  const { id, interactionPreviewBox, textBoxes } = args;
  if (interactionPreviewBox && interactionPreviewBox.id === id) return interactionPreviewBox;
  return textBoxes.find(textBox => textBox.id === id) || null;
}

export function resolveOrderPdfSketchCreateRectStyle(args: {
  createSession: OrderPdfSketchTextCreateSession | null;
  textMode: boolean;
}): CSSProperties | null {
  const { createSession, textMode } = args;
  if (!createSession || !textMode) return null;
  return resolveOrderPdfSketchTextBoxStyle({
    id: 'creating',
    createdAt: 0,
    ...buildOrderPdfSketchTextBoxCreateRect({
      start: createSession.start,
      end: createSession.current,
    }),
    color: '#000000',
    fontSize: 18,
    text: '',
  });
}
