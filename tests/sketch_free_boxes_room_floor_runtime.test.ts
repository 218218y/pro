import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxHoverPlacement } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';

type HoverArgs = Parameters<typeof resolveSketchFreeBoxHoverPlacement>[0];

function makeArgs(overrides: Partial<HoverArgs>): HoverArgs {
  return {
    App: {} as never,
    planeX: 0,
    planeY: -0.95,
    boxH: 0.4,
    widthOverrideM: 0.6,
    depthOverrideM: 0.5,
    wardrobeBox: {
      centerX: 0,
      centerY: 0,
      centerZ: 0,
      width: 2,
      height: 2,
      depth: 0.6,
    },
    wardrobeBackZ: -0.3,
    freeBoxes: [],
    projectWorldPointToLocal: () => null,
    ...overrides,
  };
}

test('free-box hover below the room floor clamps onto the floor instead of sinking under it', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(makeArgs({}));

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewY - 0.206) <= 1e-9);
});

test('free-box hover below the wardrobe snaps to room floor even when still overlapping the wardrobe width', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0.1,
      planeY: -0.7,
      boxH: 0.3,
      freeBoxes: [],
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewY - 0.156) <= 1e-9);
});
