import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxHoverPlacement } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';
import {
  clampSketchFreeBoxCenterYToWorkspace,
  getSketchFreePlacementRoomFloorY,
  getSketchFreePlacementVerticalSlack,
  isSketchFreeBoxUnderWardrobeColumn,
  isWithinSketchFreePlacementBounds,
} from '../esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts';
import { SKETCH_BOX_FREE_VERTICAL_POLICY } from '../esm/shared/dimensions/sketch_box_free_placement_policy.ts';

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

test('free-box hover below the room floor clamps onto the floor when it is outside the wardrobe column', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(makeArgs({ planeX: 1.35 }));

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewY - 0.206) <= 1e-9);
});

test('free-box hover near the lower wardrobe interior still snaps when it is not under the base', () => {
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

test('free-box hover under the wardrobe column is blocked instead of becoming a swallowed free box', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(makeArgs({ planeX: 0, planeY: -0.95, boxH: 0.4 }));

  assert.equal(placement, null);
});

test('free-box hover under the wardrobe column still allows removing an existing bad free box', () => {
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      planeX: 0,
      planeY: -0.95,
      boxH: 0.4,
      freeBoxes: [
        {
          id: 'bad-under-wardrobe',
          freePlacement: true,
          absX: 0,
          absY: -0.95,
          heightM: 0.4,
          widthM: 0.6,
          depthM: 0.5,
        },
      ],
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'remove');
  assert.equal(placement.removeId, 'bad-under-wardrobe');
});

test('focused vertical policy preserves default, min, ratio, max, floor, and workspace clamping', () => {
  assert.equal(
    getSketchFreePlacementVerticalSlack(Number.NaN),
    SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackDefaultM
  );
  assert.equal(getSketchFreePlacementVerticalSlack(0.2), SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackMinM);
  assert.equal(getSketchFreePlacementVerticalSlack(1), 0.75);
  assert.equal(getSketchFreePlacementVerticalSlack(10), SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackMaxM);
  assert.equal(getSketchFreePlacementRoomFloorY(), SKETCH_BOX_FREE_VERTICAL_POLICY.roomFloorY);

  assert.equal(
    clampSketchFreeBoxCenterYToWorkspace({
      centerY: -2,
      boxH: 0.4,
      wardrobeCenterY: 0,
      wardrobeHeight: 2,
    }),
    0.2
  );
  assert.equal(
    clampSketchFreeBoxCenterYToWorkspace({
      centerY: 3,
      boxH: 0.4,
      wardrobeCenterY: 0,
      wardrobeHeight: 2,
    }),
    2.15
  );
});

test('focused vertical geometry preserves column and placement boundary inclusivity', () => {
  const wardrobeBox = { centerX: 0, centerY: 1, width: 2, height: 2 };
  assert.equal(isSketchFreeBoxUnderWardrobeColumn({ planeX: -1, planeY: 0.2, boxH: 0.4, wardrobeBox }), true);
  assert.equal(
    isSketchFreeBoxUnderWardrobeColumn({ planeX: 1.0001, planeY: 0.2, boxH: 0.4, wardrobeBox }),
    false
  );
  assert.equal(
    isWithinSketchFreePlacementBounds({
      planeX: 0,
      planeY: -0.65,
      wardrobeBox,
      previewW: 0.4,
      previewH: 0.4,
    }),
    true
  );
  assert.equal(
    isWithinSketchFreePlacementBounds({
      planeX: 0,
      planeY: 3.5501,
      wardrobeBox,
      previewW: 0.4,
      previewH: 0.4,
    }),
    false
  );
  assert.equal(
    isWithinSketchFreePlacementBounds({
      planeX: 0,
      planeY: Number.NaN,
      wardrobeBox,
      previewW: 0.4,
      previewH: 0.4,
    }),
    false
  );
});
