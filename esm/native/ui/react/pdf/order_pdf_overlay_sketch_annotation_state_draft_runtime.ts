import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import {
  areOrderPdfSketchTextBoxesEqual,
  buildOrderPdfSketchAnnotationId,
  isFiniteNumber,
  listOrderPdfSketchStrokes,
  listOrderPdfSketchTextBoxes,
  normalizeOrderPdfSketchStroke,
  normalizeOrderPdfSketchTextBox,
  ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS,
} from './order_pdf_overlay_sketch_annotation_state_core_runtime.js';
import { makeEmptyDraft } from './order_pdf_overlay_text.js';

export type OrderPdfSketchAnnotationLayer = {
  strokes: OrderPdfSketchStroke[];
  textBoxes?: OrderPdfSketchTextBox[];
};

function buildOrderPdfNextAnnotationLayer(args: {
  strokes?: OrderPdfSketchStroke[];
  textBoxes?: OrderPdfSketchTextBox[];
}): OrderPdfSketchAnnotationLayer | null {
  const strokes = args.strokes || [];
  const textBoxes = args.textBoxes || [];
  if (!strokes.length && !textBoxes.length) return null;
  return {
    strokes,
    ...(textBoxes.length ? { textBoxes } : {}),
  };
}

function finalizeOrderPdfAnnotationDraft(args: {
  draft: OrderPdfDraft | null | undefined;
  currentAnnotations: Record<string, unknown>;
  nextLayer: OrderPdfSketchAnnotationLayer | null;
  key: OrderPdfSketchAnnotationPageKey;
}): OrderPdfDraft {
  const { draft, currentAnnotations, nextLayer, key } = args;
  const previousLayer = (draft?.sketchAnnotations || {})[key] || null;
  if (nextLayer) currentAnnotations[key] = nextLayer;
  else delete currentAnnotations[key];
  const nextSketchAnnotations = Object.keys(currentAnnotations).length ? currentAnnotations : undefined;
  if (previousLayer === nextLayer && draft?.sketchAnnotations === nextSketchAnnotations) {
    return draft || makeEmptyDraft();
  }
  return {
    ...(draft || makeEmptyDraft()),
    sketchAnnotations: nextSketchAnnotations,
  };
}

function mutateOrderPdfAnnotationLayer(args: {
  draft: OrderPdfDraft | null | undefined;
  key: OrderPdfSketchAnnotationPageKey;
  mutate: (current: {
    strokes: OrderPdfSketchStroke[];
    textBoxes: OrderPdfSketchTextBox[];
  }) => OrderPdfSketchAnnotationLayer | null;
}): OrderPdfDraft {
  const { draft, key, mutate } = args;
  const currentAnnotations = draft?.sketchAnnotations ? { ...draft.sketchAnnotations } : {};
  const current = {
    strokes: listOrderPdfSketchStrokes(draft, key),
    textBoxes: listOrderPdfSketchTextBoxes(draft, key),
  };
  return finalizeOrderPdfAnnotationDraft({
    draft,
    currentAnnotations,
    key,
    nextLayer: mutate(current),
  });
}

function readOrderPdfSketchAnnotationSortKey(
  item: OrderPdfSketchStroke | OrderPdfSketchTextBox,
  index: number
): number {
  return isFiniteNumber(item.createdAt) ? item.createdAt : index + 1;
}

export function appendOrderPdfSketchStroke(args: {
  draft: OrderPdfDraft | null | undefined;
  key: OrderPdfSketchAnnotationPageKey;
  stroke: OrderPdfSketchStroke;
}): OrderPdfDraft {
  const { draft, key, stroke } = args;
  const normalizedStroke = normalizeOrderPdfSketchStroke(stroke);
  if (!normalizedStroke) return draft || makeEmptyDraft();
  return mutateOrderPdfAnnotationLayer({
    draft,
    key,
    mutate: current =>
      buildOrderPdfNextAnnotationLayer({
        strokes: [...current.strokes, normalizedStroke],
        textBoxes: current.textBoxes,
      }),
  });
}

export function upsertOrderPdfSketchTextBox(args: {
  draft: OrderPdfDraft | null | undefined;
  key: OrderPdfSketchAnnotationPageKey;
  textBox: OrderPdfSketchTextBox;
}): OrderPdfDraft {
  const { draft, key, textBox } = args;
  const currentTextBoxes = listOrderPdfSketchTextBoxes(draft, key);
  const normalizedTextBox = normalizeOrderPdfSketchTextBox({
    value: textBox,
    key,
    index: currentTextBoxes.length,
  });
  if (!normalizedTextBox) return draft || makeEmptyDraft();
  const existingIndex = currentTextBoxes.findIndex(entry => entry.id === normalizedTextBox.id);
  if (
    existingIndex >= 0 &&
    areOrderPdfSketchTextBoxesEqual(currentTextBoxes[existingIndex], normalizedTextBox)
  ) {
    return draft || makeEmptyDraft();
  }
  return mutateOrderPdfAnnotationLayer({
    draft,
    key,
    mutate: current => {
      const textBoxes =
        existingIndex >= 0
          ? current.textBoxes.map((entry, index) => (index === existingIndex ? normalizedTextBox : entry))
          : [...current.textBoxes, normalizedTextBox];
      return buildOrderPdfNextAnnotationLayer({
        strokes: current.strokes,
        textBoxes,
      });
    },
  });
}

export function deleteOrderPdfSketchTextBox(args: {
  draft: OrderPdfDraft | null | undefined;
  key: OrderPdfSketchAnnotationPageKey;
  id: string;
}): OrderPdfDraft {
  const { draft, key, id } = args;
  if (!id) return draft || makeEmptyDraft();
  const currentTextBoxes = listOrderPdfSketchTextBoxes(draft, key);
  const textBoxes = currentTextBoxes.filter(entry => entry.id !== id);
  if (textBoxes.length === currentTextBoxes.length) return draft || makeEmptyDraft();
  return mutateOrderPdfAnnotationLayer({
    draft,
    key,
    mutate: current =>
      buildOrderPdfNextAnnotationLayer({
        strokes: current.strokes,
        textBoxes,
      }),
  });
}

export function undoOrderPdfSketchStroke(
  draft: OrderPdfDraft | null | undefined,
  key: OrderPdfSketchAnnotationPageKey
): OrderPdfDraft {
  const currentStrokes = listOrderPdfSketchStrokes(draft, key);
  const currentTextBoxes = listOrderPdfSketchTextBoxes(draft, key);
  if (!currentStrokes.length && !currentTextBoxes.length) return draft || makeEmptyDraft();

  const lastStroke = currentStrokes[currentStrokes.length - 1] || null;
  const lastTextBox = currentTextBoxes[currentTextBoxes.length - 1] || null;
  const strokeKey = lastStroke
    ? readOrderPdfSketchAnnotationSortKey(lastStroke, currentStrokes.length - 1)
    : -1;
  const textKey = lastTextBox
    ? readOrderPdfSketchAnnotationSortKey(lastTextBox, currentTextBoxes.length - 1)
    : -1;

  const trimmedStrokes = strokeKey >= textKey ? currentStrokes.slice(0, -1) : currentStrokes;
  const trimmedTextBoxes = textKey > strokeKey ? currentTextBoxes.slice(0, -1) : currentTextBoxes;
  return mutateOrderPdfAnnotationLayer({
    draft,
    key,
    mutate: () =>
      buildOrderPdfNextAnnotationLayer({
        strokes: trimmedStrokes,
        textBoxes: trimmedTextBoxes,
      }),
  });
}

export function clearOrderPdfSketchStrokes(
  draft: OrderPdfDraft | null | undefined,
  key: OrderPdfSketchAnnotationPageKey
): OrderPdfDraft {
  const currentAnnotations = draft?.sketchAnnotations || {};
  if (!currentAnnotations[key]) return draft || makeEmptyDraft();
  return finalizeOrderPdfAnnotationDraft({
    draft,
    currentAnnotations: { ...currentAnnotations },
    key,
    nextLayer: null,
  });
}

export function hasOrderPdfSketchAnnotations(draft: OrderPdfDraft | null | undefined): boolean {
  return ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS.some(
    key =>
      listOrderPdfSketchStrokes(draft, key).length > 0 || listOrderPdfSketchTextBoxes(draft, key).length > 0
  );
}

export function createOrderPdfSketchDraftAnnotationId(prefix: string = 'ann'): string {
  return buildOrderPdfSketchAnnotationId(prefix);
}
