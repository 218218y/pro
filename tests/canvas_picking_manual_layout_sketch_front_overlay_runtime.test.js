import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const ROOT = process.cwd();
const OVERLAY_FILE = path.join(
  ROOT,
  'esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts'
);
const PREVIEW_POLICY_FILE = path.join(ROOT, 'esm/shared/dimensions/sketch_box_preview_policy.ts');
const GEOMETRY_POLICY_FILE = path.join(ROOT, 'esm/shared/dimensions/sketch_box_geometry_policy.ts');
const MATERIAL_POLICY_FILE = path.join(ROOT, 'esm/shared/dimensions/material_thickness_policy.ts');

const { SKETCH_BOX_DOOR_PREVIEW_POLICY, SKETCH_BOX_DRAWER_PREVIEW_POLICY } = loadTsRuntimeModule(
  PREVIEW_POLICY_FILE,
  { cache: new Map() }
);
const { SKETCH_BOX_SHELL_GEOMETRY_POLICY } = loadTsRuntimeModule(GEOMETRY_POLICY_FILE, {
  cache: new Map(),
});
const { MATERIAL_THICKNESS_POLICY } = loadTsRuntimeModule(MATERIAL_POLICY_FILE, {
  cache: new Map(),
});

function loadOverlayModule({ findDoors = () => [], previewPolicy = null } = {}) {
  const mocks = {
    './canvas_picking_sketch_box_dividers.js': {
      findSketchBoxDoorsForSegment: findDoors,
    },
  };
  if (previewPolicy) {
    mocks['../../shared/dimensions/sketch_box_preview_policy.js'] = previewPolicy;
  }
  return loadTsRuntimeModule(OVERLAY_FILE, { cache: new Map(), mocks });
}

function closeTo(actual, expected, epsilon = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

function segment({ index = 0, leftX, rightX, xNorm = 0.5 }) {
  return {
    index,
    leftX,
    rightX,
    centerX: (leftX + rightX) / 2,
    width: rightX - leftX,
    xNorm,
  };
}

function expectedDoorOverlayZ({ centerZ, outerD, woodThick, policy = SKETCH_BOX_DOOR_PREVIEW_POLICY }) {
  const doorDepth = Math.max(
    policy.doorThicknessMinM,
    Math.min(policy.doorThicknessMaxM, Math.max(woodThick, policy.doorThicknessMinM))
  );
  const clearance = Math.max(
    policy.doorBackClearanceMinM,
    Math.min(policy.doorBackClearanceMaxM, doorDepth * policy.doorBackClearanceDepthRatio)
  );
  const doorFrontZ = centerZ + outerD / 2;
  const renderedDoorCenterZ = doorFrontZ + doorDepth / 2 + clearance;
  const renderedDoorFrontZ = renderedDoorCenterZ + doorDepth / 2;
  return {
    depth: doorDepth,
    z:
      renderedDoorFrontZ +
      doorDepth / 2 +
      Math.max(policy.doorRemoveOffsetMinM, woodThick * policy.doorRemoveOffsetWoodRatio),
  };
}

const baseGeo = Object.freeze({ centerX: 0, innerW: 1, outerW: 1.1, centerZ: 0.2, outerD: 0.6 });

function overlayArgs(overrides = {}) {
  return {
    box: {},
    boxCenterY: 1,
    boxHeight: 1.5,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    geo: baseGeo,
    segments: [],
    ...overrides,
  };
}

test('front-overlay segment face spans preserve edge extensions, fallbacks, epsilon boundaries, and minimums', () => {
  const { resolveSketchBoxSegmentFaceSpan } = loadOverlayModule();
  const wood = 0.02;
  const full = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: 0, rightX: 1 }),
  });
  closeTo(full.centerX, 0.5);
  closeTo(full.spanW, 1 + wood * 2);
  closeTo(full.innerSpanW, 1);

  const left = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: 0, rightX: 0.6 }),
  });
  closeTo(left.centerX, 0.295);
  closeTo(left.spanW, 0.63);
  closeTo(left.innerSpanW, 0.6);

  const right = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: 0.4, rightX: 1 }),
  });
  closeTo(right.centerX, 0.705);
  closeTo(right.spanW, 0.63);

  const inner = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: 0.2, rightX: 0.8 }),
  });
  closeTo(inner.centerX, 0.5);
  closeTo(inner.spanW, 0.62);

  const fallback = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: null,
  });
  closeTo(fallback.centerX, 0.5);
  closeTo(fallback.spanW, 1 + wood * 2);
  closeTo(fallback.innerSpanW, 1);

  for (const invalidWood of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const value = resolveSketchBoxSegmentFaceSpan({
      boxCenterX: 0.5,
      innerW: 1,
      woodThick: invalidWood,
      segment: null,
    });
    closeTo(value.spanW, 1 + MATERIAL_THICKNESS_POLICY.wood.thicknessM * 2);
  }

  const eps = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM;
  const at = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: eps, rightX: 0.6 }),
  });
  const below = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: eps / 2, rightX: 0.6 }),
  });
  const above = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: wood,
    segment: segment({ leftX: eps + 1e-9, rightX: 0.6 }),
  });
  closeTo(at.spanW, 0.6 - eps + wood + wood / 2);
  closeTo(below.spanW, 0.6 - eps / 2 + wood + wood / 2);
  closeTo(above.spanW, 0.6 - (eps + 1e-9) + wood / 2 + wood / 2);

  const minimum = resolveSketchBoxSegmentFaceSpan({
    boxCenterX: 0.5,
    innerW: 1,
    woodThick: 0.0001,
    segment: segment({ leftX: 0.5, rightX: 0.501 }),
  });
  assert.equal(minimum.spanW, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM);
  assert.equal(minimum.innerSpanW, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerDimensionM);
});

test('front-overlay selection preserves door/drawer Z ordering, dimensions, and numeric return shape', () => {
  const { resolveSketchBoxVisibleFrontOverlay } = loadOverlayModule({ findDoors: () => [{ door: {} }] });

  assert.equal(resolveSketchBoxVisibleFrontOverlay(overlayArgs()), null);

  const doorOnly = resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({ box: { doors: [{ id: 'door' }] }, fullWidth: true })
  );
  assert.ok(doorOnly);
  const expectedDoor = expectedDoorOverlayZ({
    centerZ: baseGeo.centerZ,
    outerD: baseGeo.outerD,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  });
  closeTo(doorOnly.z, expectedDoor.z);
  closeTo(doorOnly.d, expectedDoor.depth);
  closeTo(doorOnly.w, baseGeo.outerW - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayWidthClearanceM);
  closeTo(doorOnly.h, 1.5 - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayHeightClearanceM);

  const drawerOnly = resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({ box: { extDrawers: [{ id: 'drawer' }] }, fullWidth: true })
  );
  assert.ok(drawerOnly);
  closeTo(drawerOnly.d, SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM);
  closeTo(
    drawerOnly.z,
    baseGeo.centerZ +
      baseGeo.outerD / 2 +
      SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM / 2 +
      SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewZOffsetM
  );

  const both = resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({ box: { doors: [{}], extDrawers: [{}] }, fullWidth: true })
  );
  assert.ok(both);
  assert.equal(both.z, Math.max(doorOnly.z, drawerOnly.z));
  for (const key of ['x', 'y', 'z', 'w', 'h', 'd']) assert.equal(typeof both[key], 'number');
});

test('front-overlay segmented matching preserves epsilon, vertical forwarding, and highest valid overlay', () => {
  let captured = null;
  const target = segment({ index: 3, leftX: -0.2, rightX: 0.2, xNorm: 0 });
  const other = segment({ index: 4, leftX: 0.2, rightX: 0.5, xNorm: 0.5 });
  const verticalSegments = [{ index: 8, bottomY: 0, topY: 1, centerY: 0.5, height: 1, yNorm: 0.5 }];
  const activeVerticalSegment = { ...verticalSegments[0], yNorm: 0.75 };
  const { resolveSketchBoxVisibleFrontOverlay } = loadOverlayModule({
    findDoors(args) {
      captured = args;
      return [{ door: { id: 'door' } }];
    },
  });

  const exactDrawer = resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({
      box: { extDrawers: [{ xNorm: SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM }] },
      segments: [target, other],
      segment: target,
      verticalSegments,
      activeVerticalSegment,
      fullBoxCenterY: 2,
      fullBoxInnerH: 3,
    })
  );
  assert.ok(exactDrawer);
  assert.deepEqual(captured.verticalSegments, verticalSegments);
  assert.equal(captured.boxCenterY, 2);
  assert.equal(captured.innerH, 3);
  assert.equal(captured.xNorm, target.xNorm);
  assert.equal(captured.yNorm, activeVerticalSegment.yNorm);

  const outsideDrawerNoDoor = loadOverlayModule().resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({
      box: { extDrawers: [{ xNorm: SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM + 1e-9 }] },
      segments: [target, other],
      segment: target,
    })
  );
  assert.equal(outsideDrawerNoDoor, null);

  const segmentedDoor = resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({ segments: [target, other], segment: target })
  );
  assert.ok(segmentedDoor);
  const faceSpan = loadOverlayModule().resolveSketchBoxSegmentFaceSpan({
    boxCenterX: baseGeo.centerX,
    innerW: baseGeo.innerW,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    segment: target,
  });
  closeTo(segmentedDoor.x, faceSpan.centerX);
  closeTo(
    segmentedDoor.w,
    Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
      faceSpan.spanW - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayWidthClearanceM
    )
  );
});

test('front-overlay door thickness, back clearance, and remove offset retain min/ratio/max branches', () => {
  const baseDoor = {
    ...SKETCH_BOX_DOOR_PREVIEW_POLICY,
    doorThicknessMinM: 0.01,
    doorThicknessMaxM: 0.03,
    doorBackClearanceMinM: 0.001,
    doorBackClearanceMaxM: 0.005,
    doorRemoveOffsetMinM: 0.002,
  };
  const cases = [
    {
      woodThick: 0.005,
      door: { ...baseDoor, doorBackClearanceDepthRatio: 0.01, doorRemoveOffsetWoodRatio: 0.01 },
    },
    {
      woodThick: 0.02,
      door: { ...baseDoor, doorBackClearanceDepthRatio: 0.1, doorRemoveOffsetWoodRatio: 0.2 },
    },
    {
      woodThick: 0.05,
      door: { ...baseDoor, doorBackClearanceDepthRatio: 0.5, doorRemoveOffsetWoodRatio: 0.2 },
    },
  ];

  for (const entry of cases) {
    const module = loadOverlayModule({
      previewPolicy: {
        SKETCH_BOX_DOOR_PREVIEW_POLICY: Object.freeze(entry.door),
        SKETCH_BOX_DRAWER_PREVIEW_POLICY,
      },
    });
    const overlay = module.resolveSketchBoxVisibleFrontOverlay(
      overlayArgs({ box: { doors: [{}] }, woodThick: entry.woodThick, fullWidth: true })
    );
    assert.ok(overlay);
    const expected = expectedDoorOverlayZ({
      centerZ: baseGeo.centerZ,
      outerD: baseGeo.outerD,
      woodThick: entry.woodThick,
      policy: entry.door,
    });
    closeTo(overlay.d, expected.depth);
    closeTo(overlay.z, expected.z);
  }
});

test('front-overlay ignores invalid or non-positive candidates without replacing a valid overlay', () => {
  const invalidDoorModule = loadOverlayModule({
    previewPolicy: {
      SKETCH_BOX_DOOR_PREVIEW_POLICY: Object.freeze({
        ...SKETCH_BOX_DOOR_PREVIEW_POLICY,
        doorThicknessMinM: Number.NaN,
      }),
      SKETCH_BOX_DRAWER_PREVIEW_POLICY,
    },
  });
  const drawer = invalidDoorModule.resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({ box: { doors: [{}], extDrawers: [{}] }, fullWidth: true })
  );
  assert.ok(drawer);
  assert.equal(drawer.d, SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM);

  const invalidDrawerModule = loadOverlayModule({
    previewPolicy: {
      SKETCH_BOX_DOOR_PREVIEW_POLICY,
      SKETCH_BOX_DRAWER_PREVIEW_POLICY: Object.freeze({
        drawerPreviewThicknessM: 0,
        drawerPreviewZOffsetM: SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewZOffsetM,
      }),
    },
  });
  const door = invalidDrawerModule.resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({ box: { doors: [{}], extDrawers: [{}] }, fullWidth: true })
  );
  assert.ok(door);
  assert.equal(door.d, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMaxM);

  const minimum = loadOverlayModule().resolveSketchBoxVisibleFrontOverlay(
    overlayArgs({
      box: { doors: [{}] },
      boxHeight: 0.001,
      geo: { ...baseGeo, outerW: 0.001 },
      fullWidth: true,
    })
  );
  assert.ok(minimum);
  assert.equal(minimum.w, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM);
  assert.equal(minimum.h, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM);
});
