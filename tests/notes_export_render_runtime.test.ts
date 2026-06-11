import test from 'node:test';
import assert from 'node:assert/strict';

import { createMapPoint, createTransformRuntime } from '../esm/native/ui/notes_export_render_transform.ts';
import { clampScale } from '../esm/native/ui/notes_export_render_shared.ts';

test('notes export transform runtime prefers affine mapping and clamps fallback scale sanely', () => {
  const runtime = createTransformRuntime({
    kind: 'affine',
    a: 2,
    b: 0,
    c: 0,
    d: 3,
    e: 10,
    f: 20,
    sx: 9,
    sy: 9,
    dx: 999,
    dy: 999,
  });

  const mapPoint = createMapPoint(runtime, { width: 100, height: 50 } as DOMRect, 1000, 500);
  assert.deepEqual(mapPoint(4, 5), { x: 18, y: 35 });

  assert.equal(clampScale(Number.NaN), 1);
  assert.equal(clampScale(0.0001), 0.05);
  assert.equal(clampScale(50), 20);
});
