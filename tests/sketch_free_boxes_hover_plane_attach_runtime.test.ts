import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxHoverPlacement } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';

type HoverArgs = Parameters<typeof resolveSketchFreeBoxHoverPlacement>[0];

function makeArgs(overrides: Partial<HoverArgs>): HoverArgs {
  return {
    App: {} as never,
    planeX: 0,
    planeY: -0.45,
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
    hostModuleKey: 0,
    intersects: [
      {
        object: {
          userData: {
            partId: 'sketch_box_free_0_a',
          },
        },
        point: { tag: 'surface' },
      } as never,
    ],
    localParent: {},
    projectWorldPointToLocal: () => ({ x: 0.28, y: -0.15, z: 0 }),
    ...overrides,
  };
}

test('free-box hover attach below falls back to a valid floor-safe side placement when room floor blocks under-stack placement', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(makeArgs({}));

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 0.6024) <= 1e-9);
  assert.ok(Math.abs(placement.previewY - 0.206) <= 1e-9);
  assert.equal(placement.snapToCenter, false);
});

test('free-box hover attach above keeps plane X even when surface hit lands on the left wall of the target box', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeY: 0.45,
      intersects: [
        {
          object: {
            userData: {
              partId: 'sketch_box_free_0_a',
            },
          },
          point: { tag: 'surface' },
        } as never,
      ],
      projectWorldPointToLocal: () => ({ x: -0.27, y: 0.15, z: 0 }),
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 0) <= 1e-9);
  assert.ok(Math.abs(placement.previewY - 0.4024) <= 1e-9);
  assert.equal(placement.snapToCenter, true);
});

test('free-box hover near lower corners stays symmetric when room floor forces the fallback placement sideways', () => {
  const left = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: -0.5,
      planeY: -0.18,
      boxH: 0.3,
      widthOverrideM: 0.6,
    })
  );
  const right = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0.5,
      planeY: -0.18,
      boxH: 0.3,
      widthOverrideM: 0.6,
    })
  );

  assert.ok(left);
  assert.ok(right);
  assert.equal(left.op, 'add');
  assert.equal(right.op, 'add');
  assert.ok(Math.abs(left.previewX - -0.6018) <= 1e-9);
  assert.ok(Math.abs(right.previewX - 0.6018) <= 1e-9);
  assert.ok(Math.abs(left.previewY - 0.156) <= 1e-9);
  assert.ok(Math.abs(right.previewY - 0.156) <= 1e-9);
  assert.equal(left.snapToCenter, false);
  assert.equal(right.snapToCenter, false);
});

test('free-box hover below at the outer edge still resolves to the floor-safe side placement', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0.6,
      planeY: -0.18,
      boxH: 0.3,
      widthOverrideM: 0.6,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 0.6018) <= 1e-9);
  assert.ok(Math.abs(placement.previewY - 0.156) <= 1e-9);
  assert.equal(placement.snapToCenter, false);
});

test('free-box hover between adjacent boxes keeps the gap column instead of snapping to an outer side wall', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0,
      planeY: 0.9,
      wardrobeBox: {
        centerX: 0,
        centerY: 1,
        centerZ: 0,
        width: 2,
        height: 4,
        depth: 0.6,
      },
      freeBoxes: [
        {
          id: 'left',
          freePlacement: true,
          absX: -0.306,
          absY: 1.2,
          widthM: 0.6,
          depthM: 0.5,
          heightM: 0.4,
        },
        {
          id: 'right',
          freePlacement: true,
          absX: 0.306,
          absY: 1.2,
          widthM: 0.6,
          depthM: 0.5,
          heightM: 0.4,
        },
      ],
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 0) <= 1e-9);
  assert.ok(Math.abs(placement.previewY - 0.7976) <= 1e-9);
  assert.equal(placement.snapToCenter, false);
});

test('free-box hover slightly off-center between adjacent boxes still stays in the gap column until a real side target exists', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0.05,
      planeY: 0.9,
      wardrobeBox: {
        centerX: 0,
        centerY: 1,
        centerZ: 0,
        width: 2,
        height: 4,
        depth: 0.6,
      },
      freeBoxes: [
        {
          id: 'left',
          freePlacement: true,
          absX: -0.306,
          absY: 1.2,
          widthM: 0.6,
          depthM: 0.5,
          heightM: 0.4,
        },
        {
          id: 'right',
          freePlacement: true,
          absX: 0.306,
          absY: 1.2,
          widthM: 0.6,
          depthM: 0.5,
          heightM: 0.4,
        },
      ],
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewX - 0.05) <= 1e-9);
  assert.ok(Math.abs(placement.previewY - 0.7976) <= 1e-9);
  assert.equal(placement.snapToCenter, false);
});
