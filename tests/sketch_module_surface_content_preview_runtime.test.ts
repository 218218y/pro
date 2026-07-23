import test from 'node:test';
import assert from 'node:assert/strict';

import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.js';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.js';
import {
  SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY,
  SKETCH_BOX_ROD_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.js';
import { resolveSketchModuleContentPreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_content.js';
import { resolveSketchModuleVerticalRangePlacementAgainstDrawers } from '../esm/native/services/canvas_picking_sketch_module_vertical_content_collision.js';
import { clampSketchModuleStorageCenterY } from '../esm/native/services/canvas_picking_sketch_module_vertical_content_match.js';

const close = (actual: number, expected: number, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

type Measurement = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z?: number;
  styleKey?: string;
  textScale?: number;
  role?: string;
};

function centeredLineOffset(width: number): number {
  const lineGap = Math.max(0.035, Math.min(0.085, width * 0.045));
  return Math.min(lineGap * 0.9, Math.max(0.008, width / 2 - 0.008));
}

function assertCellMeasurementTargets(args: {
  measurements: Measurement[];
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  containerMinY: number;
  containerMaxY: number;
  z: number;
}) {
  const entries = args.measurements.filter(entry => entry.role === 'cell');
  assert.equal(entries.length, 2);
  const lineX = args.centerX + centeredLineOffset(args.width);
  const targetMinY = args.centerY - args.height / 2;
  const targetMaxY = args.centerY + args.height / 2;
  for (const entry of entries) {
    close(entry.startX, lineX);
    close(entry.endX, lineX);
    close(entry.z as number, args.z);
    assert.equal(entry.role, 'cell');
    assert.equal(entry.styleKey, 'cell');
    assert.equal(entry.textScale, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale);
  }
  assert.ok(
    entries.some(
      entry =>
        Math.abs(entry.startY - args.containerMinY) <= 1e-9 && Math.abs(entry.endY - targetMinY) <= 1e-9
    )
  );
  assert.ok(
    entries.some(
      entry =>
        Math.abs(entry.startY - targetMaxY) <= 1e-9 && Math.abs(entry.endY - args.containerMaxY) <= 1e-9
    )
  );
}

function makeSource(overrides: Record<string, unknown> = {}) {
  return {
    host: { tool: 'sketch_shelf', moduleKey: 0, isBottom: false, ts: 17 },
    tool: 'sketch_shelf',
    hitModuleKey: 0,
    intersects: [],
    info: {},
    cfgRef: null,
    hitLocalX: 0,
    yClamped: 0.5,
    bottomY: 0,
    topY: 1,
    spanH: 1,
    pad: 0.01,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.3,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    drawers: [],
    extDrawers: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry: (args: Record<string, unknown>) => {
      const outerW = typeof args.widthM === 'number' ? args.widthM : (args.innerW as number);
      const outerD = typeof args.depthM === 'number' ? args.depthM : (args.internalDepth as number);
      const xNorm = typeof args.xNorm === 'number' ? args.xNorm : 0.5;
      const innerW = Math.max(0.01, outerW - 0.036);
      const innerD = Math.max(0.01, outerD - 0.036);
      const centerX =
        (args.internalCenterX as number) - (args.innerW as number) / 2 + xNorm * (args.innerW as number);
      return {
        outerW,
        innerW,
        centerX,
        xNorm,
        centered: Math.abs(centerX - (args.internalCenterX as number)) <= 1e-9,
        outerD,
        innerD,
        centerZ: args.internalZ as number,
        innerCenterZ: args.internalZ as number,
        innerBackZ: (args.internalZ as number) - outerD / 2,
      };
    },
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
    ...overrides,
  } as any;
}

function makeArgs(overrides: Record<string, unknown> = {}) {
  const source = makeSource((overrides.source as Record<string, unknown>) ?? {});
  return {
    source,
    yClamped: 0.5,
    variantPreview: 'regular',
    shelfDepthOverrideM: null,
    storageHPreview: 0.3,
    contentOp: 'add',
    bottomY: 0,
    topY: 1,
    spanH: 1,
    pad: 0.01,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0,
    backZ: -0.25,
    regularDepth: 0.4,
    removeEpsShelf: 0.02,
    removeEpsBox: 0.03,
    isStorage: false,
    isShelf: false,
    isRod: false,
    boxes: [],
    storageBarriers: [],
    rods: [],
    ...overrides,
    source,
  } as any;
}

test('surface content storage preview preserves focused-owner dimensions and non-finite depth fallback', () => {
  const minimum = resolveSketchModuleContentPreview(
    makeArgs({
      isStorage: true,
      innerW: 0.01,
      internalDepth: Number.NaN,
      internalZ: 0.2,
      woodThick: 0.00001,
      yClamped: 0.5,
    })
  );
  assert.equal(minimum.handled, true);
  assert.equal(minimum.preview?.kind, 'storage');
  assert.equal(minimum.preview?.op, 'add');
  assert.equal(minimum.preview?.w, INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM);
  assert.equal(minimum.preview?.d, INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM);
  close(minimum.preview?.z as number, 0.2 + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM);
  assert.equal(minimum.hoverRecord?.kind, 'storage');
  assert.equal(minimum.hoverRecord?.op, 'add');

  const clearance = resolveSketchModuleContentPreview(
    makeArgs({ isStorage: true, innerW: 1, internalDepth: 0.6, woodThick: 0.03 })
  );
  close(clearance.preview?.w as number, 1 - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM);
  assert.equal(clearance.preview?.d, 0.03);
  close(clearance.preview?.z as number, 0.3 + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM);
});

test('surface content storage preview preserves local remove, placement, and blocked hover semantics', () => {
  const remove = resolveSketchModuleContentPreview(
    makeArgs({
      isStorage: true,
      contentOp: 'remove',
      yClamped: 0.4,
      storageHPreview: 0.2,
      storageBarriers: [{ yNorm: 0.4, heightM: 0.44 }],
    })
  );
  assert.equal(remove.preview?.op, 'remove');
  assert.equal(remove.preview?.h, 0.44);
  assert.equal(remove.hoverRecord, undefined);

  const placementDrawer = { id: 'drawer-placement', yNormC: 0.5, drawerHeightM: 0.18 };
  const placementHeight = 0.1;
  const placementPointerY = 0.3;
  const expectedPlacement = resolveSketchModuleVerticalRangePlacementAgainstDrawers({
    cfgRef: null,
    drawers: [placementDrawer],
    extDrawers: [],
    bottomY: 0,
    topY: 1,
    totalHeight: 1,
    pad: 0.01,
    desiredCenterY: placementPointerY,
    heightM: placementHeight,
  });
  assert.ok(expectedPlacement);
  assert.equal(expectedPlacement?.blocked, false);
  assert.notEqual(expectedPlacement?.centerY, placementPointerY);
  const placed = resolveSketchModuleContentPreview(
    makeArgs({
      isStorage: true,
      yClamped: placementPointerY,
      storageHPreview: placementHeight,
      source: { drawers: [placementDrawer] },
    })
  );
  close(placed.preview?.y as number, expectedPlacement?.centerY as number);
  close(placed.hoverRecord?.yNorm as number, expectedPlacement?.centerY as number);
  assert.equal(placed.preview?.op, 'add');

  const blocked = resolveSketchModuleContentPreview(
    makeArgs({
      isStorage: true,
      yClamped: 0.5,
      storageHPreview: 0.3,
      source: { drawers: [{ id: 'drawer', yNormC: 0.5, drawerHeightM: 0.18 }] },
    })
  );
  assert.equal(blocked.preview?.op, 'blocked');
  assert.equal(blocked.preview?.blockedReason, 'collision');
  assert.equal(blocked.hoverRecord?.__wpBlockedReason, 'collision');
  assert.equal(blocked.hoverRecord?.op, 'add');

  const fallbackPointerY = 0.99;
  const fallbackHeight = 0.3;
  const expectedFallback = clampSketchModuleStorageCenterY({
    bottomY: 0,
    topY: 1,
    pad: 0.01,
    heightM: fallbackHeight,
    pointerY: fallbackPointerY,
  });
  const fallback = resolveSketchModuleContentPreview(
    makeArgs({
      isStorage: true,
      yClamped: fallbackPointerY,
      storageHPreview: fallbackHeight,
      source: { drawers: [], extDrawers: [] },
    })
  );
  close(fallback.preview?.y as number, expectedFallback);
  close(fallback.hoverRecord?.yNorm as number, expectedFallback);
  assert.equal(fallback.preview?.op, 'add');
});

test('surface content rod preview preserves focused-owner geometry, remove clamp, and collision payload', () => {
  const add = resolveSketchModuleContentPreview(makeArgs({ isRod: true, innerW: 0.01 }));
  assert.equal(add.preview?.kind, 'rod');
  assert.equal(add.preview?.w, SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM);
  assert.equal(add.preview?.h, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM);
  assert.equal(add.preview?.d, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM);
  assert.equal(add.hoverRecord?.kind, 'rod');

  const clearance = resolveSketchModuleContentPreview(makeArgs({ isRod: true, innerW: 1 }));
  close(clearance.preview?.w as number, 1 - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM);

  const remove = resolveSketchModuleContentPreview(
    makeArgs({
      isRod: true,
      contentOp: 'remove',
      yClamped: 0.01,
      rods: [{ yNorm: 0 }],
      pad: 0.02,
    })
  );
  assert.equal(remove.preview?.op, 'remove');
  assert.equal(remove.preview?.y, 0.02);
  assert.equal(remove.hoverRecord, undefined);

  const blocked = resolveSketchModuleContentPreview(
    makeArgs({
      isRod: true,
      yClamped: 0.5,
      source: { drawers: [{ id: 'drawer', yNormC: 0.5, drawerHeightM: 0.18 }] },
    })
  );
  assert.equal(blocked.preview?.op, 'blocked');
  assert.equal(blocked.hoverRecord?.__wpBlockedReason, 'collision');
});

test('surface content shelf preview preserves nested-box span and regular-depth clamp', () => {
  const result = resolveSketchModuleContentPreview(
    makeArgs({
      isShelf: true,
      yClamped: 0.5,
      regularDepth: 0.4,
      boxes: [{ yNorm: 0.5, heightM: 0.6, widthM: 0.6, depthM: 0.3, xNorm: 0.75 }],
    })
  );
  assert.equal(result.preview?.kind, 'shelf');
  close(result.preview?.x as number, 0.25);
  close(result.preview?.w as number, 0.564 - INTERIOR_SHELF_GEOMETRY_POLICY.regularWidthClearanceM);
  close(result.preview?.d as number, 0.264);
  close(result.preview?.z as number, -0.15 + 0.264 / 2);
  assert.equal(result.hoverRecord?.kind, 'shelf');
  assert.equal(result.hoverRecord?.op, 'add');
  assert.equal(Array.isArray(result.preview?.clearanceMeasurements), true);
});

test('surface content shelf measurements preserve focused-owner Z branches, scale, and blocked state', () => {
  const minimum = resolveSketchModuleContentPreview(
    makeArgs({ isShelf: true, regularDepth: 0.02, internalDepth: 0.02, backZ: -0.01 })
  );
  const minimumMeasurements = minimum.preview?.clearanceMeasurements as Measurement[];
  const minExpectedZ =
    (minimum.preview?.z as number) +
    (minimum.preview?.d as number) / 2 +
    SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetMinM;
  assert.ok(minimumMeasurements.length > 0);
  assertCellMeasurementTargets({
    measurements: minimumMeasurements,
    centerX: minimum.preview?.x as number,
    centerY: minimum.preview?.y as number,
    width: minimum.preview?.w as number,
    height: minimum.preview?.h as number,
    containerMinY: 0,
    containerMaxY: 1,
    z: minExpectedZ,
  });

  const ratio = resolveSketchModuleContentPreview(
    makeArgs({
      isShelf: true,
      regularDepth: 0.4,
      internalDepth: 0.5,
      backZ: -0.25,
      source: { shelves: [{ yNorm: 0.8, variant: 'regular' }] },
    })
  );
  const ratioMeasurements = ratio.preview?.clearanceMeasurements as Measurement[];
  const ratioOffset =
    (ratio.preview?.d as number) * SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetDepthRatio;
  assert.ok(ratioOffset > SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetMinM);
  const ratioExpectedZ = (ratio.preview?.z as number) + (ratio.preview?.d as number) / 2 + ratioOffset;
  ratioMeasurements.forEach(entry => close(entry.z, ratioExpectedZ));
  assertCellMeasurementTargets({
    measurements: ratioMeasurements,
    centerX: ratio.preview?.x as number,
    centerY: ratio.preview?.y as number,
    width: ratio.preview?.w as number,
    height: ratio.preview?.h as number,
    containerMinY: 0,
    containerMaxY: 1,
    z: ratioExpectedZ,
  });
  const neighbor = ratioMeasurements.find(entry => entry.role === 'neighbor');
  assert.ok(neighbor);
  const neighborScale = Math.max(0.74, SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale * 0.94);
  close(neighbor.startX, (ratio.preview?.x as number) - centeredLineOffset(ratio.preview?.w as number));
  close(neighbor.endX, neighbor.startX);
  close(neighbor.startY, (ratio.preview?.y as number) + (ratio.preview?.h as number) / 2);
  close(neighbor.endY, 0.8 - 0.018 / 2);
  close(neighbor.z as number, ratioExpectedZ);
  assert.equal(neighbor.role, 'neighbor');
  assert.equal(neighbor.styleKey, 'neighbor');
  assert.equal(neighbor.textScale, neighborScale);

  const blocked = resolveSketchModuleContentPreview(
    makeArgs({
      isShelf: true,
      yClamped: 0.5,
      source: { drawers: [{ id: 'drawer', yNormC: 0.5, drawerHeightM: 0.18 }] },
    })
  );
  assert.equal(blocked.preview?.op, 'blocked');
  assert.equal(blocked.hoverRecord?.__wpBlockedReason, 'collision');

  const remove = resolveSketchModuleContentPreview(makeArgs({ isShelf: true, contentOp: 'remove' }));
  assert.equal(remove.preview?.op, 'remove');
  assert.equal(remove.hoverRecord, undefined);
  assert.equal(Array.isArray(remove.preview?.clearanceMeasurements), true);
});
