import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchModuleSurfacePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview.ts';
import { tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_surface.ts';

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

test('module surface preview ignores string-encoded existing box geometry while adding a box', () => {
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
    boxes: [
      {
        id: 'legacy-string-box',
        yNorm: '0.6',
        heightM: '0.4',
        widthM: '0.36',
        depthM: '0.32',
        xNorm: '0.65',
      },
    ] as any,
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
  assert.equal(result.hoverRecord?.removeId, undefined);
  assert.equal(result.preview?.op, 'add');
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

test('module surface storage remove probe rejects string-encoded sketch barrier geometry', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_int_drawers', moduleKey: 1, isBottom: false, ts: 3 },
    tool: 'sketch_int_drawers',
    hitModuleKey: 1,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true, customData: { storage: false } },
    hitLocalX: 0,
    yClamped: 0.72,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: true,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [{ yNorm: '0.6', heightM: '0.32' }] as any,
    shelves: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.deepEqual(result, { handled: false });
});

test('module surface preview resolves preset storage hover as remove when removal probe is enabled', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_int_drawers', moduleKey: 0, isBottom: false, ts: 2 },
    tool: 'sketch_int_drawers',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'storage', isCustom: false },
    hitLocalX: 0,
    yClamped: 0.22,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: true,
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

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'storage');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'storage');
  assert.equal(result.hoverRecord?.removeKind, 'base');
});

test('module surface preview resolves sketch storage barrier hover as remove when removal probe is enabled', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_int_drawers', moduleKey: 1, isBottom: false, ts: 3 },
    tool: 'sketch_int_drawers',
    hitModuleKey: 1,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true, customData: { storage: false } },
    hitLocalX: 0,
    yClamped: 0.72,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: true,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [{ yNorm: 0.6, heightM: 0.32 }],
    shelves: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'storage');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'storage');
  assert.equal(result.hoverRecord?.removeKind, 'sketch');
  assert.equal(result.hoverRecord?.removeIdx, 0);
});

test('module surface preview resolves base shelf hover remove while sketch external drawers tool is active', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_ext_drawers:3', moduleKey: 1, isBottom: false, ts: 4 },
    tool: 'sketch_ext_drawers:3',
    hitModuleKey: 1,
    intersects: [{ object: { userData: { partId: 'all_shelves' } }, point: { y: 0.4 } }] as any,
    info: { gridDivisions: 3 },
    cfgRef: {
      layout: 'shelves',
      isCustom: true,
      customData: {
        shelves: [true, false],
        rods: [],
        storage: false,
        shelfVariants: ['regular', ''],
      },
    },
    hitLocalX: 0,
    yClamped: 0.4,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: true,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
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

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'shelf');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'shelf');
  assert.equal(result.hoverRecord?.removeKind, 'base');
  assert.equal(result.hoverRecord?.shelfIndex, 1);
});

test('module surface rod remove probe rejects string-encoded custom rod geometry', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_ext_drawers:3', moduleKey: 1, isBottom: false, ts: 4 },
    tool: 'sketch_ext_drawers:3',
    hitModuleKey: 1,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: {
      layout: 'shelves',
      isCustom: true,
      customData: {
        rods: [],
        rodOps: [{ yFactor: '3', gridIndex: '3', yAdd: '0' }],
      },
    },
    hitLocalX: 0,
    yClamped: 0.6,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: true,
    allowExistingStorageRemove: false,
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

test('module surface preview snaps sketch storage above internal drawer stacks after the pointer leaves the stack', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_storage:50', moduleKey: 0, isBottom: false, ts: 5 },
    tool: 'sketch_storage:50',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
    hitLocalX: 0,
    yClamped: 1.21,
    bottomY: 0,
    topY: 2,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: true,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    drawers: [{ id: 'drawers-1', yNormC: 0.5, drawerHeightM: 0.18 }],
    extDrawers: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'storage');
  assert.equal(result.preview?.op, 'add');
  assert.equal(result.preview?.blockedReason, undefined);
  assert.ok(Number(result.preview?.y) > 1.44);
  assert.ok(Number(result.preview?.y) < 1.47);
});

test('module surface preview marks shelf placement blocked over sketch drawer stacks', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 0, isBottom: false, ts: 5 },
    tool: 'sketch_shelf:regular',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
    hitLocalX: 0,
    yClamped: 1,
    bottomY: 0,
    topY: 2,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: true,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    drawers: [{ id: 'drawers-1', yNormC: 0.5, drawerHeightM: 0.18 }],
    extDrawers: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'shelf');
  assert.equal(result.preview?.op, 'blocked');
  assert.equal(result.preview?.blockedReason, 'collision');
});

test('module surface box preview blocks on the pointed shelf and only adjusts inside the pointed slot', () => {
  const blockedOnShelf = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 0, isBottom: false, ts: 6 },
    tool: 'sketch_box:40',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
    hitLocalX: 0,
    yClamped: 1,
    bottomY: 0,
    topY: 2,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: true,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: 0.36,
    boxDepthOverrideM: 0.32,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [{ id: 'shelf-1', yNorm: 0.5, variant: 'regular' }],
    rods: [],
    drawers: [],
    extDrawers: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(blockedOnShelf.handled, true);
  assert.equal(blockedOnShelf.preview?.kind, 'box');
  assert.equal(blockedOnShelf.preview?.op, 'blocked');
  assert.equal(blockedOnShelf.hoverRecord?.kind, 'box');
  assert.equal(blockedOnShelf.hoverRecord?.op, 'add');

  const adjustedAboveShelf = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 0, isBottom: false, ts: 6 },
    tool: 'sketch_box:40',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
    hitLocalX: 0,
    yClamped: 1.02,
    bottomY: 0,
    topY: 2,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: true,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: 0.36,
    boxDepthOverrideM: 0.32,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [{ id: 'shelf-1', yNorm: 0.5, variant: 'regular' }],
    rods: [],
    drawers: [],
    extDrawers: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(adjustedAboveShelf.preview?.op, 'add');
  assert.equal(adjustedAboveShelf.hoverRecord?.op, 'add');
  assert.ok(Number(adjustedAboveShelf.preview?.y) > 1.2);
});

test('module surface box preview marks the box blocked when existing vertical content leaves no room', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 0, isBottom: false, ts: 7 },
    tool: 'sketch_box:40',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
    hitLocalX: 0,
    yClamped: 1,
    bottomY: 0,
    topY: 2,
    spanH: 2,
    pad: 0.02,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: true,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: 0.36,
    boxDepthOverrideM: 0.32,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [
      { id: 'storage-bottom', yNorm: 0.2, heightM: 0.7 },
      { id: 'storage-middle', yNorm: 0.5, heightM: 0.7 },
      { id: 'storage-top', yNorm: 0.8, heightM: 0.7 },
    ],
    shelves: [],
    rods: [],
    drawers: [],
    extDrawers: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'box');
  assert.equal(result.preview?.op, 'blocked');
  assert.equal(result.preview?.blockedReason, 'collision');
  assert.equal(result.hoverRecord?.kind, 'box');
  assert.equal(result.hoverRecord?.op, 'add');
  assert.equal(result.hoverRecord?.__wpBlockedReason, 'collision');
});

test('existing vertical remove probe uses the real pointer Y while a tall box is size-clamped elsewhere', () => {
  const writes: Array<Record<string, unknown> | null> = [];
  const previews: Array<Record<string, unknown>> = [];

  const handled = tryHandleManualLayoutSketchHoverExistingVerticalRemovePreview({
    App: {},
    tool: 'sketch_box:170',
    freeBoxSpec: { heightCm: 170, widthCm: 36, depthCm: 32 },
    hitModuleKey: 0,
    hitSelectorObj: null,
    hitStack: 'top',
    hitY: 2.2,
    hitLocalX: 0,
    intersects: [],
    setPreview: args => {
      previews.push(args as Record<string, unknown>);
    },
    hidePreview: null,
    __hideSketchPreviewAndClearHover: () => {},
    __wp_isCornerKey: () => false,
    __wp_isDefaultCornerCellCfgLike: () => false,
    __wp_resolveSketchBoxGeometry: resolveSketchBoxGeometry,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_readSketchBoxHorizontalDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_resolveSketchBoxVerticalSegments: () => [],
    __wp_pickSketchBoxVerticalSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_findNearestSketchBoxHorizontalDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({ xNorm: 0.5, x: 0, segmentIndex: 0 }),
    __wp_resolveSketchBoxHorizontalDividerPlacement: () => ({ yNorm: 0.5, y: 0, segmentIndex: 0 }),
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: (_App, snap) => {
      writes.push((snap as Record<string, unknown> | null) ?? null);
    },
    isBottom: false,
    info: { gridDivisions: 6 },
    bottomY: 0,
    topY: 2.4,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    spanH: 2.4,
    pad: 0.006,
    yClamped: 1.52,
    isBox: true,
    isStorage: false,
    isShelf: false,
    isRod: false,
    isDrawers: false,
    isExtDrawers: false,
    variant: 'regular',
    shelfDepthM: null,
    shelfDepthOverrideM: null,
    boxSpec: { heightCm: 170, widthCm: 36, depthCm: 32 },
    boxH: 1.7,
    boxWidthOverrideM: 0.36,
    boxDepthOverrideM: 0.32,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [{ id: 'rod-at-clamped-box-center', yNorm: 1.52 / 2.4 }],
    drawers: [],
    extDrawers: [],
    cfgRef: { layout: 'shelves', isCustom: true },
    activeModuleBox: null,
  } as never);

  assert.equal(handled, false);
  assert.deepEqual(writes, []);
  assert.deepEqual(previews, []);
});
