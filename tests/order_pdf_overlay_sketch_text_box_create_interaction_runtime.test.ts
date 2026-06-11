import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrderPdfSketchTextCreateSession,
  resolveOrderPdfSketchTextCreateSessionPoint,
  updateOrderPdfSketchTextCreateSession,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_text_box_create_interaction.ts';

test('text-box create interaction snapshots the surface rect and updates from cached geometry', () => {
  const surfaceRect = { left: 10, top: 20, width: 200, height: 100 };
  const session = createOrderPdfSketchTextCreateSession({
    pointerId: 9,
    start: { x: 0.1, y: 0.2 },
    startClientX: 30,
    startClientY: 40,
    surfaceRect,
  });
  assert.ok(session);
  assert.notEqual(session?.surfaceRect, surfaceRect);

  surfaceRect.width = 800;
  surfaceRect.height = 600;

  const next = updateOrderPdfSketchTextCreateSession({
    session: session as NonNullable<typeof session>,
    clientX: 110,
    clientY: 70,
  });
  assert.notEqual(next, session);
  assert.equal(next.current.x, 0.5);
  assert.equal(next.current.y, 0.5);
});

test('text-box create interaction resolves invalid client points back to the latest current point', () => {
  const session = createOrderPdfSketchTextCreateSession({
    pointerId: 5,
    start: { x: 0.25, y: 0.35 },
    startClientX: 60,
    startClientY: 75,
    surfaceRect: { left: 10, top: 20, width: 200, height: 100 },
  });
  assert.ok(session);

  const updated = updateOrderPdfSketchTextCreateSession({
    session: session as NonNullable<typeof session>,
    clientX: 160,
    clientY: 90,
  });
  const resolved = resolveOrderPdfSketchTextCreateSessionPoint({
    session: updated,
    clientX: Number.NaN,
    clientY: Number.NaN,
  });
  assert.deepEqual(resolved, updated.current);
});
