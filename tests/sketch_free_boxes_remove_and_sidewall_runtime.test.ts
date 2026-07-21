import test from 'node:test';
import assert from 'node:assert/strict';

import {
  doesSketchFreeBoxPartiallyOverlapWardrobe,
  resolveSketchFreeBoxHoverPlacement,
} from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';
import {
  isWithinSketchFreeBoxRemoveZone,
  resolveSketchFreeBoxOutsideWardrobeSnapX,
} from '../esm/native/services/canvas_picking_sketch_free_box_geometry_zone.ts';
import {
  SKETCH_BOX_FREE_REMOVE_POLICY,
  SKETCH_BOX_FREE_WALL_SNAP_POLICY,
} from '../esm/shared/dimensions/sketch_box_free_placement_policy.ts';

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

test('free-box placement at the no-main workspace floor is not blocked as under-wardrobe placement', () => {
  const App = {
    store: {
      getState: () => ({
        ui: {
          doors: 0,
          raw: { doors: 0, width: 0, height: 0, depth: 0 },
        },
        config: { wardrobeType: 'hinged' },
      }),
    },
  } as never;
  const placement = resolveSketchFreeBoxHoverPlacement(
    makeArgs({
      App,
      wardrobeBox: {
        centerX: 0,
        centerY: 1.2,
        centerZ: -0.3,
        width: 1.82,
        height: 2.4,
        depth: 0.56,
      },
      wardrobeBackZ: -0.58,
      freeBoxes: [],
      planeX: 0,
      planeY: 0.2,
      boxH: 0.4,
      intersects: [],
      localParent: null,
    })
  );

  assert.ok(placement);
  assert.equal(placement.op, 'add');
  assert.ok(Math.abs(placement.previewY - 0.206) <= 1e-9);
});

test('focused wall-snap policy preserves left, right, outside-band, and invalid behavior', () => {
  const previewW = 0.1;
  const wallBand = Math.max(
    SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandMinM,
    Math.min(
      SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandMaxM,
      previewW * SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandWidthRatio
    )
  );
  const leftThreshold = -1 + wallBand;
  const rightThreshold = 1 - wallBand;
  assert.equal(
    resolveSketchFreeBoxOutsideWardrobeSnapX({
      planeX: leftThreshold,
      previewW,
      wardrobeCenterX: 0,
      wardrobeWidth: 2,
    }),
    -1.05
  );
  assert.equal(
    resolveSketchFreeBoxOutsideWardrobeSnapX({
      planeX: rightThreshold,
      previewW,
      wardrobeCenterX: 0,
      wardrobeWidth: 2,
    }),
    1.05
  );
  assert.equal(
    resolveSketchFreeBoxOutsideWardrobeSnapX({
      planeX: 0,
      previewW,
      wardrobeCenterX: 0,
      wardrobeWidth: 2,
    }),
    null
  );
  assert.equal(
    resolveSketchFreeBoxOutsideWardrobeSnapX({
      planeX: Number.NaN,
      previewW,
      wardrobeCenterX: 0,
      wardrobeWidth: 2,
    }),
    null
  );
});

test('focused remove-zone policy preserves inset clamps and boundary comparisons', () => {
  const boxW = 0.4;
  const boxH = 0.4;
  const halfW = boxW / 2;
  const inset = Math.min(
    halfW * SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetHalfRatioMax,
    Math.max(
      SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMinM,
      Math.min(
        SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMaxM,
        boxW * SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetRatio
      )
    )
  );
  const boundary = Math.max(SKETCH_BOX_FREE_REMOVE_POLICY.removeHalfMinM, halfW - inset);
  assert.equal(
    isWithinSketchFreeBoxRemoveZone({
      pointX: boundary,
      pointY: boundary,
      boxCenterX: 0,
      boxCenterY: 0,
      boxW,
      boxH,
    }),
    true
  );
  assert.equal(
    isWithinSketchFreeBoxRemoveZone({
      pointX: boundary + 1e-6,
      pointY: 0,
      boxCenterX: 0,
      boxCenterY: 0,
      boxW,
      boxH,
    }),
    false
  );
  assert.equal(
    isWithinSketchFreeBoxRemoveZone({
      pointX: 0,
      pointY: 0,
      boxCenterX: 0,
      boxCenterY: 0,
      boxW: 0,
      boxH,
    }),
    false
  );
});
