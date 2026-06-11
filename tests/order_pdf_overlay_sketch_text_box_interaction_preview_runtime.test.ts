import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrderPdfSketchTextBoxInteractionPreview,
  resolveOrderPdfSketchRenderedTextBoxes,
  updateOrderPdfSketchTextBoxInteractionPreview,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_interaction_preview.ts';
import { createOrderPdfSketchTextBoxPointerInteraction } from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime.ts';
import type { OrderPdfSketchTextBox } from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts';

function createTextBox(overrides: Partial<OrderPdfSketchTextBox> = {}): OrderPdfSketchTextBox {
  return {
    id: 'box-1',
    createdAt: 1,
    x: 0.1,
    y: 0.2,
    width: 0.25,
    height: 0.2,
    color: '#111111',
    fontSize: 18,
    text: 'שלום',
    ...overrides,
  };
}

test('text-box interaction preview runtime keeps the same preview object for no-op moves and updates only when geometry changes', () => {
  const sourceBox = createTextBox();
  const preview = createOrderPdfSketchTextBoxInteractionPreview({
    sourceBox,
    interaction: createOrderPdfSketchTextBoxPointerInteraction({
      textBox: sourceBox,
      pointerId: 7,
      clientX: 100,
      clientY: 120,
    }),
    surfaceWidth: 400,
    surfaceHeight: 400,
  });

  const samePreview = updateOrderPdfSketchTextBoxInteractionPreview({
    preview,
    clientX: 100,
    clientY: 120,
  });
  assert.equal(samePreview, preview);

  const movedPreview = updateOrderPdfSketchTextBoxInteractionPreview({
    preview,
    clientX: 180,
    clientY: 200,
  });
  assert.notEqual(movedPreview, preview);
  assert.notEqual(movedPreview.previewBox, preview.previewBox);
  assert.equal(movedPreview.previewBox.x > sourceBox.x, true);
  assert.equal(movedPreview.previewBox.y > sourceBox.y, true);
  assert.equal(movedPreview.sourceBox, sourceBox);
});

test('text-box interaction preview runtime replaces only the matching box and preserves list identity for equal previews', () => {
  const sourceBox = createTextBox();
  const otherBox = createTextBox({ id: 'box-2', x: 0.55, y: 0.6 });
  const textBoxes = [sourceBox, otherBox];

  assert.equal(
    resolveOrderPdfSketchRenderedTextBoxes({
      textBoxes,
      previewBox: null,
    }),
    textBoxes
  );

  assert.equal(
    resolveOrderPdfSketchRenderedTextBoxes({
      textBoxes,
      previewBox: { ...sourceBox },
    }),
    textBoxes
  );

  const previewBox = { ...sourceBox, x: 0.32, width: 0.3 };
  const rendered = resolveOrderPdfSketchRenderedTextBoxes({ textBoxes, previewBox });
  assert.notEqual(rendered, textBoxes);
  assert.equal(rendered[0], previewBox);
  assert.equal(rendered[1], otherBox);

  assert.equal(
    resolveOrderPdfSketchRenderedTextBoxes({
      textBoxes,
      previewBox: { ...previewBox, id: 'missing' },
    }),
    textBoxes
  );
});
