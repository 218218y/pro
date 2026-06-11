import test from 'node:test';
import assert from 'node:assert/strict';

import {
  doesSketchFreeBoxPartiallyOverlapWardrobe,
  resolveSketchFreeBoxHoverPlacement,
} from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';

type HoverArgs = Parameters<typeof resolveSketchFreeBoxHoverPlacement>[0];

function makeArgs(overrides: Partial<HoverArgs>): HoverArgs {
  return {
    App: {} as never,
    planeX: 0,
    planeY: 0,
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
    freeBoxes: [
      {
        id: 'a',
        freePlacement: true,
        absX: 0,
        absY: 0,
        widthM: 0.6,
        depthM: 0.5,
        heightM: 0.4,
      },
    ],
    projectWorldPointToLocal: () => null,
    ...overrides,
  };
}

test('free-box remove hover works from most of the box interior using plane hit, not only a tiny center point', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0.22,
      planeY: 0.1,
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'remove');
  assert.equal(placement.removeId, 'a');
});

test('free-box outside placement snaps flush to the wardrobe side wall instead of requiring a large empty gap', () => {
  assert.equal(
    doesSketchFreeBoxPartiallyOverlapWardrobe({
      centerX: 1.02,
      boxW: 0.6,
      wardrobeCenterX: 0,
      wardrobeWidth: 2,
    }),
    true
  );

  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      freeBoxes: [],
      planeX: 1.02,
      planeY: 0,
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 1.3) <= 1e-9);
});

test('free-box placement still remains available when the box is fully inside the wardrobe body', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      freeBoxes: [],
      planeX: 0.2,
      planeY: 0,
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
});

test('free-box placement above the wardrobe stays outside above the roof instead of being clamped back inside', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      freeBoxes: [],
      planeX: 0,
      planeY: 1.02,
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 0) <= 1e-9);
  assert.ok(Math.abs(placement.previewY - 1.2) <= 1e-9);
});

test('free-box placement at side height above the wardrobe still remains available as outside free placement', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      freeBoxes: [],
      planeX: 1.35,
      planeY: 1.02,
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(placement.previewX >= 1.3 - 1e-9);
  assert.ok(placement.previewY >= 1.02 - 1e-9);
});
