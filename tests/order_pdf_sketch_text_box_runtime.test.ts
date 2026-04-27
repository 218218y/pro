import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDER_PDF_SKETCH_TEXT_BOX_HANDLE_DIRECTIONS,
  ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTIONS,
  applyOrderPdfSketchTextBoxInteraction,
  buildOrderPdfSketchTextBoxCreateRect,
  areOrderPdfSketchTextBoxesEqual,
  createOrderPdfSketchTextBoxMoveInteraction,
  createOrderPdfSketchTextBoxPointerInteraction,
  createOrderPdfSketchTextBoxResizeInteraction,
  shouldCreateOrderPdfSketchTextBoxFromPointerDrag,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_runtime.js';

const baseTextBox = {
  id: 'txt-1',
  createdAt: 1,
  x: 0.2,
  y: 0.25,
  width: 0.24,
  height: 0.18,
  color: '#111827',
  fontSize: 18,
  bold: false,
  text: 'שלום',
} as const;

test('[order-pdf] sketch text box drag-create preserves the dragged preview bounds and normalizes reverse drags', () => {
  const tiny = buildOrderPdfSketchTextBoxCreateRect({
    start: { x: 0.96, y: 0.95 },
    end: { x: 0.97, y: 0.96 },
  });
  assert.ok(Math.abs(tiny.width - 0.01) < 1e-9);
  assert.ok(Math.abs(tiny.height - 0.01) < 1e-9);
  assert.ok(tiny.x + tiny.width <= 1);
  assert.ok(tiny.y + tiny.height <= 1);

  const reversed = buildOrderPdfSketchTextBoxCreateRect({
    start: { x: 0.7, y: 0.65 },
    end: { x: 0.4, y: 0.3 },
  });
  assert.equal(reversed.x, 0.4);
  assert.equal(reversed.y, 0.3);
  assert.ok(Math.abs(reversed.width - 0.3) < 1e-9);
  assert.ok(Math.abs(reversed.height - 0.35) < 1e-9);
});

test('[order-pdf] sketch text box drag-create ignores click-like pointer taps until the user actually drags', () => {
  assert.equal(
    shouldCreateOrderPdfSketchTextBoxFromPointerDrag({
      startClientX: 100,
      startClientY: 120,
      endClientX: 103,
      endClientY: 124,
    }),
    false
  );
  assert.equal(
    shouldCreateOrderPdfSketchTextBoxFromPointerDrag({
      startClientX: 100,
      startClientY: 120,
      endClientX: 109,
      endClientY: 121,
    }),
    true
  );
});

test('[order-pdf] sketch text box move and resize interactions stay normalized', () => {
  const moved = applyOrderPdfSketchTextBoxInteraction({
    textBox: baseTextBox,
    interaction: createOrderPdfSketchTextBoxMoveInteraction({
      textBox: baseTextBox,
      pointerId: 4,
      clientX: 100,
      clientY: 80,
    }),
    surfaceWidth: 400,
    surfaceHeight: 200,
    clientX: 180,
    clientY: 120,
  });
  assert.equal(moved.x, 0.4);
  assert.equal(moved.y, 0.45);

  const resized = applyOrderPdfSketchTextBoxInteraction({
    textBox: baseTextBox,
    interaction: createOrderPdfSketchTextBoxResizeInteraction({
      textBox: baseTextBox,
      dir: 'nw',
      pointerId: 5,
      clientX: 100,
      clientY: 80,
    }),
    surfaceWidth: 400,
    surfaceHeight: 200,
    clientX: 20,
    clientY: 20,
  });
  assert.equal(resized.x, 0);
  assert.equal(resized.y, 0);
  assert.ok(resized.width > baseTextBox.width);
  assert.ok(resized.height > baseTextBox.height);
  assert.ok(resized.x + resized.width <= 1);
  assert.ok(resized.y + resized.height <= 1);
});

test('[order-pdf] sketch text box pointer interaction keeps body drags and middle handles as move while resize handles stay resize', () => {
  const move = createOrderPdfSketchTextBoxPointerInteraction({
    textBox: baseTextBox,
    pointerId: 7,
    clientX: 100,
    clientY: 80,
  });
  assert.equal(move.kind, 'move');

  for (const dir of ORDER_PDF_SKETCH_TEXT_BOX_RESIZE_DIRECTIONS) {
    const interaction = createOrderPdfSketchTextBoxPointerInteraction({
      textBox: baseTextBox,
      dir,
      pointerId: 8,
      clientX: 100,
      clientY: 80,
    });
    assert.equal(interaction.kind, 'resize');
    assert.equal(interaction.dir, dir);
  }

  for (const dir of ORDER_PDF_SKETCH_TEXT_BOX_HANDLE_DIRECTIONS.filter(dir => dir === 'n' || dir === 's')) {
    const interaction = createOrderPdfSketchTextBoxPointerInteraction({
      textBox: baseTextBox,
      dir,
      pointerId: 9,
      clientX: 120,
      clientY: 100,
    });
    assert.equal(interaction.kind, 'move');
  }

  const northMove = applyOrderPdfSketchTextBoxInteraction({
    textBox: baseTextBox,
    interaction: createOrderPdfSketchTextBoxPointerInteraction({
      textBox: baseTextBox,
      dir: 'n',
      pointerId: 10,
      clientX: 120,
      clientY: 100,
    }),
    surfaceWidth: 400,
    surfaceHeight: 200,
    clientX: 120,
    clientY: 60,
  });
  assert.equal(northMove.x, baseTextBox.x);
  assert.ok(northMove.y < baseTextBox.y);
  assert.equal(northMove.width, baseTextBox.width);
  assert.equal(northMove.height, baseTextBox.height);

  const southMove = applyOrderPdfSketchTextBoxInteraction({
    textBox: baseTextBox,
    interaction: createOrderPdfSketchTextBoxPointerInteraction({
      textBox: baseTextBox,
      dir: 's',
      pointerId: 11,
      clientX: 120,
      clientY: 100,
    }),
    surfaceWidth: 400,
    surfaceHeight: 200,
    clientX: 120,
    clientY: 140,
  });
  assert.equal(southMove.x, baseTextBox.x);
  assert.ok(southMove.y > baseTextBox.y);
  assert.equal(southMove.width, baseTextBox.width);
  assert.equal(southMove.height, baseTextBox.height);
});

test('[order-pdf] sketch text box interaction returns the same object when drag math settles on identical geometry', () => {
  const unchangedMove = applyOrderPdfSketchTextBoxInteraction({
    textBox: baseTextBox,
    interaction: createOrderPdfSketchTextBoxMoveInteraction({
      textBox: baseTextBox,
      pointerId: 12,
      clientX: 100,
      clientY: 80,
    }),
    surfaceWidth: 400,
    surfaceHeight: 200,
    clientX: 100,
    clientY: 80,
  });
  assert.equal(unchangedMove, baseTextBox);

  const edgeTextBox = { ...baseTextBox, x: 0.76, y: 0.25 };
  const clampedMove = applyOrderPdfSketchTextBoxInteraction({
    textBox: edgeTextBox,
    interaction: createOrderPdfSketchTextBoxMoveInteraction({
      textBox: edgeTextBox,
      pointerId: 13,
      clientX: 100,
      clientY: 80,
    }),
    surfaceWidth: 400,
    surfaceHeight: 200,
    clientX: 500,
    clientY: 80,
  });
  assert.equal(clampedMove, edgeTextBox);
});

test('[order-pdf] sketch text box equality helper ignores cloned-but-identical payload churn', () => {
  const clone = {
    ...baseTextBox,
    text: `${baseTextBox.text}`,
  };
  const changed = {
    ...baseTextBox,
    fontSize: baseTextBox.fontSize + 2,
  };

  assert.equal(areOrderPdfSketchTextBoxesEqual(baseTextBox, clone), true);
  assert.equal(areOrderPdfSketchTextBoxesEqual(baseTextBox, changed), false);
});
