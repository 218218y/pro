import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxHoverPlacement } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';
import { createSketchFreeBoxHoverContext } from '../esm/native/services/canvas_picking_sketch_free_box_hover_context.ts';
import {
  clampSketchFreeBoxCenterYToWorkspace,
  getSketchFreePlacementRoomFloorY,
  getSketchFreePlacementVerticalSlack,
  isSketchFreeBoxUnderWardrobeColumn,
  isWithinSketchFreePlacementBounds,
} from '../esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts';
import {
  SKETCH_BOX_FREE_VERTICAL_POLICY,
  SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY,
} from '../esm/shared/dimensions/sketch_box_free_placement_policy.ts';

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

test('free-box hover context preserves focused workspace-pad min, ratio, max, and public shape', () => {
  const App = {
    store: {
      getState: () => ({
        config: { wardrobeType: 'hinged' },
        ui: { raw: { doors: 2 } },
      }),
    },
  } as any;
  const create = (boxH: number) =>
    createSketchFreeBoxHoverContext({
      App,
      planeX: 1.2,
      planeY: 0.5,
      boxH,
      widthOverrideM: null,
      depthOverrideM: null,
      wardrobeBox: {
        centerX: 0,
        centerY: 1,
        centerZ: 0,
        width: 2,
        height: 2,
        depth: 0.6,
      },
      wardrobeBackZ: -0.3,
      freeBoxes: [{ id: 'existing' }],
      projectWorldPointToLocal: () => null,
    } as any);

  const minimum = create(0.02);
  const ratio = create(0.2);
  const maximum = create(1);
  assert.ok(minimum);
  assert.ok(ratio);
  assert.ok(maximum);
  assert.equal(minimum.workspacePad, SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMinM);
  assert.equal(ratio.workspacePad, 0.004);
  assert.equal(maximum.workspacePad, SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMaxM);
  assert.equal(ratio.roomFloorY, SKETCH_BOX_FREE_VERTICAL_POLICY.roomFloorY);
  assert.equal(ratio.noMainWardrobeSketchMode, false);
  assert.equal(ratio.blocksFreeAddUnderWardrobe, false);
  assert.deepEqual(ratio.freeBoxes, [{ id: 'existing' }]);
  assert.equal(typeof ratio.previewX, 'number');
  assert.equal(typeof ratio.previewY, 'number');
  assert.equal(typeof ratio.previewW, 'number');
  assert.equal(typeof ratio.previewD, 'number');
  assert.equal(typeof ratio.previewH, 'number');
});

test('free-box hover context applies optional width/depth overrides and treats omitted overrides as fallback inputs', () => {
  const withDefaultOverrides = makeArgs({ planeX: 0, planeY: 0.5, boxH: 0.4 });
  const {
    widthOverrideM: _defaultWidthOverrideM,
    depthOverrideM: _defaultDepthOverrideM,
    ...base
  } = withDefaultOverrides;
  const explicit = createSketchFreeBoxHoverContext({
    ...base,
    widthOverrideM: 1.1,
    depthOverrideM: 0.45,
  });
  const omitted = createSketchFreeBoxHoverContext(base);
  const explicitUndefined = createSketchFreeBoxHoverContext({
    ...base,
    widthOverrideM: undefined,
    depthOverrideM: undefined,
  } as any);

  assert.ok(explicit);
  assert.ok(omitted);
  assert.ok(explicitUndefined);
  assert.equal(explicit.previewW, 1.1);
  assert.equal(explicit.previewD, 0.45);
  assert.equal(explicitUndefined.previewW, omitted.previewW);
  assert.equal(explicitUndefined.previewD, omitted.previewD);
});

test('free-box hover context rejects malformed required geometry without changing helper fallbacks', () => {
  const base = makeArgs({ planeX: 1.2, planeY: 0.5, boxH: 0.4 });
  assert.equal(createSketchFreeBoxHoverContext({ ...base, planeX: Number.NaN }), null);
  assert.equal(createSketchFreeBoxHoverContext({ ...base, planeY: Number.POSITIVE_INFINITY }), null);
  assert.equal(createSketchFreeBoxHoverContext({ ...base, boxH: 0 }), null);
  assert.equal(createSketchFreeBoxHoverContext({ ...base, wardrobeBackZ: Number.NaN }), null);
});
