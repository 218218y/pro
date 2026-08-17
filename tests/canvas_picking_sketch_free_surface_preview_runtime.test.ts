import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findSketchFreeHoverTargetBox,
  resolveSketchFreePlacementBoxPreview,
} from '../esm/native/services/canvas_picking_sketch_free_surface_preview.ts';
import { resolveSketchFreeSurfaceAdornmentPreview } from '../esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts';
import { decodeSketchFreeBoxPlacementHover } from '../esm/native/services/canvas_picking_sketch_free_box_command.ts';
import { decodeSketchStructuralCommandHover } from '../esm/native/services/canvas_picking_sketch_structural_command.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import {
  SKETCH_BOX_ADORNMENT_PREVIEW_POLICY,
  SKETCH_BOX_DOOR_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

function requireFreeBoxPlacementCommand(value: unknown) {
  const decoded = decodeSketchFreeBoxPlacementHover(value);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) assert.fail(`Expected canonical free-box placement hover: ${decoded.reason}`);
  return decoded.value;
}

function requireStructuralCommand(value: unknown) {
  const decoded = decodeSketchStructuralCommandHover(value);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) assert.fail(`Expected canonical structural command hover: ${decoded.reason}`);
  return decoded.value.command;
}

const wardrobeBox = { centerX: 0, centerY: 1, centerZ: 0, width: 2, height: 2, depth: 0.6 } as const;

function resolveSketchFreeBoxGeometry(args: {
  centerX: number;
  widthM?: number | null;
  depthM?: number | null;
}) {
  const innerW = Number(args.widthM) || 0.8;
  const innerD = Number(args.depthM) || 0.4;
  return {
    centerX: Number(args.centerX) || 0,
    outerW: innerW + 0.036,
    innerW,
    outerD: innerD + 0.036,
    innerD,
    centerZ: 0,
    innerBackZ: -innerD / 2,
  };
}

test('sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks', () => {
  const boxWithLocalHit = {
    id: 'box-local',
    freePlacement: true,
    absX: 0.6,
    absY: 1,
    heightM: 0.8,
    widthM: 0.7,
  };
  const boxWithoutLocalHit = {
    id: 'box-plane',
    freePlacement: true,
    absX: 0.15,
    absY: 1,
    heightM: 0.8,
    widthM: 0.7,
  };

  const target = findSketchFreeHoverTargetBox({
    App: {} as never,
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    hostModuleKey: 0,
    freeBoxes: [boxWithoutLocalHit as any, boxWithLocalHit as any],
    planeHit: { x: 0.12, y: 1 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey, boxId) => `prefix:${String(boxId)}`,
    findSketchFreeBoxLocalHit: ({ partPrefix }) =>
      partPrefix === 'prefix:box-local' ? ({ x: 0.61, y: 1 } as any) : null,
  });

  assert.ok(target);
  assert.equal(target?.boxId, 'box-local');
  assert.ok(Math.abs(Number(target?.pointerX) - 0.61) < 1e-9);
});

test('sketch free divider target scan projects fallback pointer to the box front plane', () => {
  const box = {
    id: 'front-plane-box',
    freePlacement: true,
    absX: 0,
    absY: 1,
    heightM: 0.8,
    widthM: 0.7,
    depthM: 0.4,
  };
  const projectedPlanes: number[] = [];

  const target = findSketchFreeHoverTargetBox({
    App: {} as never,
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    hostModuleKey: 0,
    freeBoxes: [box as any],
    // This is intentionally outside the box at the wardrobe/back plane.
    // The divider workflow should behave like module-box hover and resolve the cursor on the box front.
    planeHit: { x: 0.9, y: 1, z: -0.3 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey, boxId) => `prefix:${String(boxId)}`,
    findSketchFreeBoxLocalHit: () => null,
    projectPointerToLocalZPlane: planeZ => {
      projectedPlanes.push(planeZ);
      return { x: 0.1, y: 1, z: planeZ } as any;
    },
  });

  assert.ok(target);
  assert.equal(target?.boxId, 'front-plane-box');
  assert.ok(Math.abs(Number(target?.pointerX) - 0.1) < 1e-9);
  assert.equal(projectedPlanes.length, 1);
  assert.ok(Math.abs(projectedPlanes[0] - 0.2) < 1e-9);
});

test('side-wall free-box content target keeps the remapped rotated hit instead of projecting to a wardrobe Z plane', () => {
  const box = {
    id: 'side-wall-box',
    freePlacement: true,
    placementWall: 'left',
    absX: 0.25,
    absY: 1,
    heightM: 1,
    widthM: 0.8,
    depthM: 0.4,
  };
  let projectorCalls = 0;

  const target = findSketchFreeHoverTargetBox({
    App: {} as never,
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    hostModuleKey: 0,
    freeBoxes: [box as any],
    planeHit: { x: 9, y: 1, z: -0.3 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey, boxId) => `prefix:${String(boxId)}`,
    findSketchFreeBoxLocalHit: () => ({ x: 0.27, y: 1.05, z: 0.18 }) as any,
    projectPointerToLocalZPlane: () => {
      projectorCalls += 1;
      return { x: 9, y: 1, z: 9 } as any;
    },
  });

  assert.ok(target);
  assert.equal(target?.boxId, 'side-wall-box');
  assert.ok(Math.abs(Number(target?.pointerX) - 0.27) < 1e-9);
  assert.ok(Math.abs(Number(target?.pointerY) - 1.05) < 1e-9);
  assert.ok(Math.abs(Number(target?.pointerZ) - 0.18) < 1e-9);
  assert.equal(projectorCalls, 0);
});

test('sketch free surface target scan rejects string-encoded free-box geometry', () => {
  const target = findSketchFreeHoverTargetBox({
    App: {} as never,
    tool: 'sketch_box_divider',
    contentKind: 'divider',
    hostModuleKey: 0,
    freeBoxes: [
      {
        id: 'legacy-string-box',
        freePlacement: true,
        absX: '0.2',
        absY: '1',
        heightM: '1',
        widthM: '0.8',
        depthM: '0.4',
      },
    ] as any,
    planeHit: { x: 0.2, y: 1, z: -0.3 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey, boxId) => `prefix:${String(boxId)}`,
    findSketchFreeBoxLocalHit: () => ({ x: 0.2, y: 1, z: 0.2 }) as any,
  });

  assert.equal(target, null);
});

test('sketch free content target scan projects profile-door hits to the canonical box front plane', () => {
  const box = {
    id: 'profile-door-box',
    freePlacement: true,
    absX: 0.2,
    absY: 1,
    heightM: 1,
    widthM: 0.8,
    depthM: 0.4,
  };

  const projectedPlanes: number[] = [];
  const target = findSketchFreeHoverTargetBox({
    App: {} as never,
    tool: 'sketch_shelf:regular',
    contentKind: 'shelf',
    hostModuleKey: 0,
    freeBoxes: [box as any],
    planeHit: { x: 0.2, y: 1, z: -0.3 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    getSketchFreeBoxPartPrefix: (_moduleKey, boxId) => `prefix:${String(boxId)}`,
    // Simulates a raised profile rail stealing the raycast at the top of the door.
    findSketchFreeBoxLocalHit: () => ({ x: 0.2, y: 1.48, z: 0.24 }) as any,
    projectPointerToLocalZPlane: planeZ => {
      projectedPlanes.push(planeZ);
      return { x: 0.2, y: 1.12, z: planeZ } as any;
    },
  });

  assert.ok(target);
  assert.equal(target?.boxId, 'profile-door-box');
  assert.ok(Math.abs(Number(target?.pointerY) - 1.12) < 1e-9);
  assert.equal(projectedPlanes.length, 1);
  assert.ok(Math.abs(projectedPlanes[0] - 0.2) < 1e-9);
});

test('sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry', () => {
  const preview = resolveSketchFreePlacementBoxPreview({
    App: {} as never,
    tool: 'sketch_box_free',
    host: { moduleKey: 2, isBottom: false },
    planeHit: { x: 0.25, y: 0.9 },
    wardrobeBox: wardrobeBox as any,
    wardrobeBackZ: -0.3,
    freeBoxes: [
      {
        id: 'free-1',
        absX: 0.3,
        absY: 0.9,
        widthM: 0.8,
        depthM: 0.4,
        heightM: 1,
        doors: [{ id: 'door-1' }],
      },
    ] as any,
    intersects: [],
    localParent: null,
    resolveSketchFreeBoxHoverPlacement: () => ({
      op: 'remove',
      previewX: 0.3,
      previewY: 0.9,
      previewH: 1,
      previewW: 0.8,
      previewD: 0.4,
      snapToCenter: true,
      removeId: 'free-1',
    }),
    resolveSketchFreeBoxGeometry: resolveSketchFreeBoxGeometry as never,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
    boxH: 1,
    widthOverrideM: null,
    depthOverrideM: null,
  });

  assert.ok(preview);
  assert.equal(preview?.hoverRecord.kind, 'box');
  const command = requireFreeBoxPlacementCommand(preview?.hoverRecord);
  assert.equal(command.kind, 'remove-free-box');
  if (command.kind !== 'remove-free-box') assert.fail('Expected remove-free-box command');
  assert.equal(command.boxId, 'free-1');
  assert.equal(preview?.hoverRecord.hostModuleKey, 2);
  assert.equal(preview?.hoverRecord.hostIsBottom, false);
  assert.equal('moduleKey' in (preview?.hoverRecord ?? {}), false);
  assert.equal('isBottom' in (preview?.hoverRecord ?? {}), false);
  assert.equal(preview?.preview.kind, 'box');
  assert.equal(preview?.preview.op, 'remove');
  assert.equal(preview?.preview.fillFront, true);
  assert.equal(preview?.preview.fillBack, true);
  assert.equal(preview?.preview.snapToCenter, true);
  assert.equal(preview?.preview.x, 0.3);
  assert.equal(preview?.preview.w, 0.8);
  assert.equal('clearanceMeasurements' in (preview?.preview ?? {}), false);
  assert.ok(Math.abs(Number(preview?.preview.frontOverlayW) - 0.832) < 1e-9);
});

test('sketch free base adornment preview rejects string-encoded current base dimensions', () => {
  const targetBox = {
    id: 'string-base',
    freePlacement: true,
    baseType: 'legs',
    baseLegStyle: 'tapered',
    baseLegColor: 'black',
    baseLegPlatformMode: 'stage',
    baseLegPlatformSideMode: 'overhang',
    baseLegHeightCm: '24',
    baseLegWidthCm: '7',
    baseLegPlatformSideOverhangCm: '10',
    baseLegPlatformFrontOverhangCm: '10',
  };

  const preview = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'sketch_box_base:legs@tapered@black@24@7@stage@overhang@10@10',
    contentKind: 'base',
    host: { moduleKey: 0, isBottom: false },
    target: {
      boxId: 'string-base',
      partPrefix: 'prefix:string-base',
      targetBox,
      targetGeo: resolveSketchFreeBoxGeometry({ centerX: 0, widthM: 0.8, depthM: 0.4 }),
      targetCenterY: 1,
      targetHeight: 0.8,
      pointerX: 0,
      pointerY: 1,
    },
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  const command = requireStructuralCommand(preview.hoverRecord);
  assert.equal(command.kind, 'set-base');
  if (command.kind !== 'set-base') assert.fail('Expected set-base command');
  assert.equal(command.op, 'add');
  assert.equal(command.baseLegHeightCm, 24);
  assert.equal(command.baseLegWidthCm, 7);
});

function assertNear(actual: unknown, expected: number, epsilon = 1e-9): void {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(Number(actual) - expected) <= epsilon, `${String(actual)} != ${String(expected)}`);
}

function makeAdornmentTarget(overrides: Record<string, unknown> = {}) {
  return {
    boxId: 'adornment-box',
    partPrefix: 'prefix:adornment-box',
    targetBox: {},
    targetGeo: {
      centerX: 0.2,
      centerZ: -0.1,
      outerW: 0.8,
      innerW: 0.764,
      outerD: 0.42,
      innerD: 0.384,
      innerBackZ: -0.31,
    },
    targetCenterY: 1,
    targetHeight: 0.8,
    pointerX: 0.2,
    pointerY: 1,
    ...overrides,
  } as any;
}

test('sketch free cornice adornment keeps toggle, fallback, focused geometry, and host metadata parity', () => {
  const host = { moduleKey: 3, isBottom: true } as const;
  const target = makeAdornmentTarget({
    targetGeo: {
      ...makeAdornmentTarget().targetGeo,
      outerW: 0.01,
    },
  });

  const fallback = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'invalid-cornice-tool',
    contentKind: 'cornice',
    host,
    target,
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });
  const addCommand = requireStructuralCommand(fallback.hoverRecord);
  assert.equal(addCommand.kind, 'set-cornice');
  if (addCommand.kind !== 'set-cornice') assert.fail('Expected set-cornice command');
  assert.equal(addCommand.corniceType, 'classic');
  assert.equal(addCommand.freePlacement, true);
  assert.equal(addCommand.blockedReason, null);
  assert.equal(fallback.hoverRecord.hostModuleKey, 3);
  assert.equal(fallback.hoverRecord.hostIsBottom, true);
  assert.equal(fallback.preview.op, 'add');
  assert.equal(fallback.preview.kind, 'storage');
  assertNear(fallback.preview.x, 0.2);
  assertNear(fallback.preview.y, 1 + 0.8 / 2 + SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentCorniceYOffsetM);
  assertNear(
    fallback.preview.z,
    -0.1 + 0.42 / 2 - SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentCorniceZInsetM
  );
  assertNear(fallback.preview.w, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM);
  assertNear(fallback.preview.h, SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentCorniceHeightM);
  assertNear(fallback.preview.d, SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentCorniceDepthM);
  assertNear(fallback.preview.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);

  const remove = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'sketch_box_cornice:wave',
    contentKind: 'cornice',
    host,
    target: makeAdornmentTarget({ targetBox: { hasCornice: true, corniceType: 'wave' } }),
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });
  const removeCommand = requireStructuralCommand(remove.hoverRecord);
  assert.equal(removeCommand.kind, 'remove-cornice');
  assert.equal(remove.preview.op, 'remove');

  const changedType = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'sketch_box_cornice:wave',
    contentKind: 'cornice',
    host,
    target: makeAdornmentTarget({ targetBox: { hasCornice: true, corniceType: 'classic' } }),
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });
  assert.equal(requireStructuralCommand(changedType.hoverRecord).kind, 'set-cornice');
});

test('sketch free base adornment preserves tool fallback, option equality, none toggle, and payload defaults', () => {
  const host = { moduleKey: 0, isBottom: false } as const;
  const common = {
    contentKind: 'base' as const,
    host,
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  };

  const fallback = resolveSketchFreeSurfaceAdornmentPreview({
    ...common,
    tool: 'invalid-base-tool',
    target: makeAdornmentTarget(),
  });
  const fallbackCommand = requireStructuralCommand(fallback.hoverRecord);
  assert.equal(fallbackCommand.kind, 'set-base');
  if (fallbackCommand.kind !== 'set-base') assert.fail('Expected set-base command');
  assert.equal(fallbackCommand.baseType, 'plinth');

  const samePlinth = resolveSketchFreeSurfaceAdornmentPreview({
    ...common,
    tool: 'sketch_box_base:plinth@10',
    target: makeAdornmentTarget({ targetBox: { baseType: 'plinth', basePlinthHeightCm: 10 } }),
  });
  assert.equal(requireStructuralCommand(samePlinth.hoverRecord).kind, 'remove-base');
  assert.equal(samePlinth.preview.op, 'remove');

  const changedPlinth = resolveSketchFreeSurfaceAdornmentPreview({
    ...common,
    tool: 'sketch_box_base:plinth@12',
    target: makeAdornmentTarget({ targetBox: { baseType: 'plinth', basePlinthHeightCm: 10 } }),
  });
  const changedCommand = requireStructuralCommand(changedPlinth.hoverRecord);
  assert.equal(changedCommand.kind, 'set-base');
  if (changedCommand.kind !== 'set-base') assert.fail('Expected set-base command');
  assert.equal(changedCommand.basePlinthHeightCm, 12);

  const removeExisting = resolveSketchFreeSurfaceAdornmentPreview({
    ...common,
    tool: 'sketch_box_base:none',
    target: makeAdornmentTarget({ targetBox: { baseType: 'legs' } }),
  });
  assert.equal(requireStructuralCommand(removeExisting.hoverRecord).kind, 'remove-base');

  const addLegs = resolveSketchFreeSurfaceAdornmentPreview({
    ...common,
    tool: 'sketch_box_base:legs@round@gold@25@8@plain@flush@2@3',
    target: makeAdornmentTarget(),
  });
  const legsCommand = requireStructuralCommand(addLegs.hoverRecord);
  assert.equal(legsCommand.kind, 'set-base');
  if (legsCommand.kind !== 'set-base') assert.fail('Expected set-base command');
  assert.deepEqual(
    {
      baseType: legsCommand.baseType,
      baseLegStyle: legsCommand.baseLegStyle,
      baseLegColor: legsCommand.baseLegColor,
      baseLegPlatformMode: legsCommand.baseLegPlatformMode,
      baseLegPlatformSideMode: legsCommand.baseLegPlatformSideMode,
      baseLegPlatformSideOverhangCm: legsCommand.baseLegPlatformSideOverhangCm,
      baseLegPlatformFrontOverhangCm: legsCommand.baseLegPlatformFrontOverhangCm,
      baseLegHeightCm: legsCommand.baseLegHeightCm,
      baseLegWidthCm: legsCommand.baseLegWidthCm,
    },
    {
      baseType: 'legs',
      baseLegStyle: 'round',
      baseLegColor: 'gold',
      baseLegPlatformMode: 'plain',
      baseLegPlatformSideMode: 'flush',
      baseLegPlatformSideOverhangCm: 2,
      baseLegPlatformFrontOverhangCm: 3,
      baseLegHeightCm: 25,
      baseLegWidthCm: 8,
    }
  );
});

test('sketch free base adornment preserves floor clamp, ratio/max inset, depth/width policies, material forwarding, and front overlay fields', () => {
  const capturedSegmentArgs: any[] = [];
  const resolveSegments = (args: any) => {
    capturedSegmentArgs.push(args);
    return [{ index: 0, leftX: -0.3, rightX: 0.3, centerX: 0, width: 0.6, xNorm: 0.5 }];
  };
  const targetWithDoor = makeAdornmentTarget({
    targetBox: {
      baseType: 'none',
      doors: [{ id: 'door-1', xNorm: 0.5, hinge: 'left', enabled: true, open: false, groove: false }],
    },
    targetGeo: {
      ...makeAdornmentTarget().targetGeo,
      outerW: 0.06,
      innerW: 0.024,
      outerD: 0.04,
      innerD: 0.004,
      centerZ: 0,
      innerBackZ: -0.002,
    },
    targetCenterY: 0.2,
    targetHeight: 0.2,
  });
  const preview = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'sketch_box_base:legs@round@black@20@8@plain@flush@0@0',
    contentKind: 'base',
    host: { moduleKey: 1, isBottom: true },
    target: targetWithDoor,
    wardrobeBox: { centerX: 0, centerY: 0.5, centerZ: 0, width: 2, height: 1, depth: 0.6 } as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: resolveSegments,
  });

  assert.equal(capturedSegmentArgs.length, 1);
  assertNear(capturedSegmentArgs[0].woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.equal(capturedSegmentArgs[0].boxCenterX, targetWithDoor.targetGeo.centerX);
  assert.equal(capturedSegmentArgs[0].innerW, targetWithDoor.targetGeo.innerW);
  assertNear(preview.preview.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assertNear(
    preview.preview.z,
    targetWithDoor.targetGeo.centerZ +
      Math.min(
        SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseZInsetMaxM,
        targetWithDoor.targetGeo.outerD * SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseZInsetDepthRatio
      )
  );
  assertNear(preview.preview.w, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM);
  assertNear(preview.preview.d, SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseLegDepthM);
  assertNear(preview.preview.y, 0.2 - 0.2 / 2 + Number(preview.preview.h) / 2);
  for (const key of [
    'frontOverlayX',
    'frontOverlayY',
    'frontOverlayZ',
    'frontOverlayW',
    'frontOverlayH',
    'frontOverlayThickness',
  ]) {
    assert.equal(typeof preview.preview[key], 'number', `${key} must forward a numeric overlay value`);
  }

  const maxInset = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'sketch_box_base:plinth@10',
    contentKind: 'base',
    host: { moduleKey: 1, isBottom: false },
    target: makeAdornmentTarget({
      targetGeo: { ...makeAdornmentTarget().targetGeo, outerD: 1 },
      targetBox: {},
    }),
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });
  assertNear(maxInset.preview.z, -0.1 + SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseZInsetMaxM);
  assertNear(maxInset.preview.w, 0.8 - SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseWidthClearanceM);
  assertNear(maxInset.preview.d, 1 - SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseDepthClearanceM);
  for (const key of [
    'frontOverlayX',
    'frontOverlayY',
    'frontOverlayZ',
    'frontOverlayW',
    'frontOverlayH',
    'frontOverlayThickness',
  ]) {
    assert.equal(maxInset.preview[key], undefined, `${key} must remain undefined without a front overlay`);
  }

  const removeMissingHeight = resolveSketchFreeSurfaceAdornmentPreview({
    tool: 'sketch_box_base:none',
    contentKind: 'base',
    host: { moduleKey: 1, isBottom: false },
    target: makeAdornmentTarget({ targetBox: { baseType: 'plinth', basePlinthHeightCm: '10' } }),
    wardrobeBox: wardrobeBox as any,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });
  assertNear(removeMissingHeight.preview.h, SKETCH_BOX_ADORNMENT_PREVIEW_POLICY.adornmentBaseDefaultHeightM);
});
