import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import {
  applyOrderPdfSketchTextBoxInteraction,
  areOrderPdfSketchTextBoxesEqual,
  type OrderPdfSketchTextBoxInteraction,
} from './order_pdf_overlay_sketch_text_box_runtime.js';

export type OrderPdfSketchTextBoxInteractionPreview = {
  sourceBox: OrderPdfSketchTextBox;
  interaction: OrderPdfSketchTextBoxInteraction;
  previewBox: OrderPdfSketchTextBox;
  surfaceWidth: number;
  surfaceHeight: number;
};

function normalizeOrderPdfSketchInteractionSurfaceSize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function createOrderPdfSketchTextBoxInteractionPreview(args: {
  sourceBox: OrderPdfSketchTextBox;
  interaction: OrderPdfSketchTextBoxInteraction;
  surfaceWidth: number;
  surfaceHeight: number;
}): OrderPdfSketchTextBoxInteractionPreview {
  const { sourceBox, interaction, surfaceWidth, surfaceHeight } = args;
  return {
    sourceBox,
    interaction,
    previewBox: sourceBox,
    surfaceWidth: normalizeOrderPdfSketchInteractionSurfaceSize(surfaceWidth),
    surfaceHeight: normalizeOrderPdfSketchInteractionSurfaceSize(surfaceHeight),
  };
}

export function updateOrderPdfSketchTextBoxInteractionPreview(args: {
  preview: OrderPdfSketchTextBoxInteractionPreview;
  clientX: number;
  clientY: number;
}): OrderPdfSketchTextBoxInteractionPreview {
  const { preview, clientX, clientY } = args;
  const nextPreviewBox = applyOrderPdfSketchTextBoxInteraction({
    textBox: preview.sourceBox,
    interaction: preview.interaction,
    surfaceWidth: preview.surfaceWidth,
    surfaceHeight: preview.surfaceHeight,
    clientX,
    clientY,
  });
  return areOrderPdfSketchTextBoxesEqual(preview.previewBox, nextPreviewBox)
    ? preview
    : {
        ...preview,
        previewBox: nextPreviewBox,
      };
}

export function resolveOrderPdfSketchRenderedTextBoxes(args: {
  textBoxes: OrderPdfSketchTextBox[];
  previewBox: OrderPdfSketchTextBox | null | undefined;
}): OrderPdfSketchTextBox[] {
  const { textBoxes, previewBox } = args;
  if (!previewBox) return textBoxes;
  const index = textBoxes.findIndex(textBox => textBox.id === previewBox.id);
  if (index < 0) return textBoxes;
  const current = textBoxes[index];
  if (areOrderPdfSketchTextBoxesEqual(current, previewBox)) return textBoxes;
  const next = textBoxes.slice();
  next[index] = previewBox;
  return next;
}
