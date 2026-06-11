import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchModuleSurfacePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview.ts';

function resolveSketchBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
  centerXHint?: number | null;
  enableCenterSnap?: boolean;
}) {
  const outerW = args.widthM != null && args.widthM > 0 ? args.widthM : args.innerW;
  const outerD = args.depthM != null && args.depthM > 0 ? args.depthM : 0.5;
  const leftX = args.internalCenterX - args.innerW / 2;
  const hintedX = args.centerXHint;
  const xNorm =
    args.xNorm != null
      ? args.xNorm
      : hintedX != null && Number.isFinite(hintedX)
        ? (hintedX - leftX) / args.innerW
        : 0.5;
  const rawCenterX = args.xNorm != null ? leftX + xNorm * args.innerW : (hintedX ?? args.internalCenterX);
  return {
    outerW,
    innerW: Math.max(0.01, outerW - 0.036),
    centerX: rawCenterX,
    xNorm,
    centered: Math.abs(rawCenterX - args.internalCenterX) <= 1e-9,
    outerD,
    innerD: Math.max(0.01, outerD - 0.036),
    centerZ: args.internalZ,
    innerCenterZ: args.internalZ,
    innerBackZ: args.internalZ - outerD / 2,
  };
}

test('module surface preview returns add box preview through the canonical seam', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 0, isBottom: false, ts: 1 },
    tool: 'sketch_box:40',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
    hitLocalX: 0.18,
    yClamped: 0.2,
    bottomY: -1,
    topY: 1,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1.2,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: true,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: 0.36,
    boxDepthOverrideM: 0.32,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.hoverRecord?.kind, 'box');
  assert.equal(result.hoverRecord?.op, 'add');
  assert.equal(result.preview?.kind, 'box');
  assert.equal(result.preview?.op, 'add');
  assert.equal(result.preview?.boxH, 0.4);
  assert.equal(result.preview?.w, 0.36);
  assert.equal(result.preview?.d, 0.32);
  assert.equal(Array.isArray(result.preview?.clearanceMeasurements), true);
  assert.equal((result.preview?.clearanceMeasurements as { label: string }[]).length, 2);
  assert.deepEqual(
    (result.preview?.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['60 ס"מ', '100 ס"מ']
  );
});

test('module surface preview stays unhandled when no content kind or removal probe is active', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 0, isBottom: false, ts: 1 },
    tool: 'sketch_box:40',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: null,
    hitLocalX: 0,
    yClamped: 0,
    bottomY: -1,
    topY: 1,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1.2,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.deepEqual(result, { handled: false });
});
