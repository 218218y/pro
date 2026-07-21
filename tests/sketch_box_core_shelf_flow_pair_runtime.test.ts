import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import {
  applyInternalDrawerExistingFittingRemoval,
  resolveInternalDrawerExistingFittingRemoval,
} from '../esm/native/services/canvas_picking_internal_drawer_existing_fittings.ts';
import { resolveSketchModuleSurfacePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_flow.ts';
import {
  createRodRemoveHoverRecord,
  createShelfRemoveHoverRecord,
  createStorageRemoveHoverRecord,
} from '../esm/native/services/canvas_picking_sketch_module_surface_preview_hover_records.ts';

type RecordMap = Record<string, any>;

const host = { tool: 'sketch_int_drawers', moduleKey: 0, isBottom: false, ts: 1 } as const;

function existingArgs(overrides: Partial<RecordMap> = {}): any {
  return {
    moduleKey: 0,
    isBottom: false,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true, sketchExtras: {} },
    yClamped: 0.6,
    bottomY: 0,
    topY: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    ...overrides,
  };
}

function geometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
}) {
  const outerW = args.widthM ?? args.innerW;
  const outerD = args.depthM ?? args.internalDepth;
  return {
    outerW,
    innerW: outerW - 0.036,
    centerX: args.internalCenterX,
    xNorm: args.xNorm ?? 0.5,
    centered: true,
    outerD,
    innerD: outerD - 0.036,
    centerZ: args.internalZ,
    innerCenterZ: args.internalZ,
    innerBackZ: args.internalZ - outerD / 2 + 0.018,
  };
}

function surfaceArgs(overrides: Partial<RecordMap> = {}): any {
  return {
    host,
    tool: 'sketch_shelf:regular',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true },
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
    allowExistingRodRemove: false,
    allowExistingStorageRemove: false,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    drawers: [],
    extDrawers: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry: geometry,
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
    ...overrides,
  };
}

test('existing-fitting resolver preserves span validation and all three removal probes', () => {
  assert.equal(resolveInternalDrawerExistingFittingRemoval(existingArgs({ topY: 0.4, bottomY: 0.4 })), null);

  const storage = resolveInternalDrawerExistingFittingRemoval(
    existingArgs({
      cfgRef: {
        layout: 'shelves',
        isCustom: true,
        sketchExtras: { storageBarriers: [{ yNorm: 0.5 }] },
      },
    })
  );
  assert.equal(storage?.preview.kind, 'storage');
  assert.equal(storage?.preview.op, 'remove');
  assert.equal(storage?.preview.h, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
  assert.equal(storage?.hoverRecord.removeKind, 'sketch');

  const rod = resolveInternalDrawerExistingFittingRemoval(
    existingArgs({
      cfgRef: { layout: 'shelves', isCustom: true, sketchExtras: { rods: [{ yNorm: 0.5 }] } },
    })
  );
  assert.equal(rod?.preview.kind, 'rod');
  assert.equal(rod?.preview.op, 'remove');

  const shelf = resolveInternalDrawerExistingFittingRemoval(
    existingArgs({
      intersects: [{ object: { userData: { partId: 'all_shelves' } }, point: { y: 0.6 } }],
      cfgRef: {
        layout: 'shelves',
        isCustom: true,
        sketchExtras: { shelves: [{ yNorm: 0.5, variant: 'glass', depthM: 0.32 }] },
      },
    })
  );
  assert.equal(shelf?.preview.kind, 'shelf');
  assert.equal(shelf?.preview.op, 'remove');
  assert.equal(shelf?.preview.variant, 'glass');
  assert.equal(shelf?.preview.d, 0.32);
});

test('existing-fitting apply flow preserves grid normalization and base removal dispatch', () => {
  const storageCfg: RecordMap = { layout: 'storage', isCustom: false };
  assert.equal(
    applyInternalDrawerExistingFittingRemoval(
      storageCfg,
      createStorageRemoveHoverRecord({ host, removeKind: 'base', removeIdx: null }),
      { gridDivisions: 7.2 },
      0,
      1.2
    ),
    true
  );
  assert.equal(storageCfg.gridDivisions, 7);
  assert.equal(storageCfg.customData.storage, false);

  const rodCfg: RecordMap = { layout: 'hanging', isCustom: false };
  assert.equal(
    applyInternalDrawerExistingFittingRemoval(
      rodCfg,
      createRodRemoveHoverRecord({ host, removeKind: 'base', removeIdx: null, rodIndex: 2 }),
      { gridDivisions: '5.6' },
      0,
      1.2
    ),
    true
  );
  assert.equal(rodCfg.gridDivisions, 6);
  assert.equal(rodCfg.customData.rods[1], false);

  const shelfCfg: RecordMap = { layout: 'shelves', isCustom: false };
  assert.equal(
    applyInternalDrawerExistingFittingRemoval(
      shelfCfg,
      createShelfRemoveHoverRecord({ host, removeKind: 'base', removeIdx: null, shelfIndex: 2 }),
      { gridDivisions: 0 },
      0,
      1.2
    ),
    true
  );
  assert.equal(shelfCfg.gridDivisions, INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault);
  assert.equal(shelfCfg.customData.shelves[1], false);
});

test('existing-fitting apply flow preserves sketch removal and rejects invalid intent', () => {
  const storageCfg: RecordMap = {
    sketchExtras: { storageBarriers: [{ id: 'a' }, { id: 'b' }] },
  };
  assert.equal(
    applyInternalDrawerExistingFittingRemoval(
      storageCfg,
      createStorageRemoveHoverRecord({ host, removeKind: 'sketch', removeIdx: 0 }),
      { gridDivisions: 6 },
      0,
      1.2
    ),
    true
  );
  assert.deepEqual(storageCfg.sketchExtras.storageBarriers, [{ id: 'b' }]);

  const rodCfg: RecordMap = { sketchExtras: { rods: [{ id: 'a' }, { id: 'b' }] } };
  assert.equal(
    applyInternalDrawerExistingFittingRemoval(
      rodCfg,
      createRodRemoveHoverRecord({ host, removeKind: 'sketch', removeIdx: 1, rodIndex: null }),
      { gridDivisions: 6 },
      0,
      1.2
    ),
    true
  );
  assert.deepEqual(rodCfg.sketchExtras.rods, [{ id: 'a' }]);

  const shelfCfg: RecordMap = { sketchExtras: { shelves: [{ id: 'a' }, { id: 'b' }] } };
  assert.equal(
    applyInternalDrawerExistingFittingRemoval(
      shelfCfg,
      createShelfRemoveHoverRecord({ host, removeKind: 'sketch', removeIdx: 0, shelfIndex: null }),
      { gridDivisions: 6 },
      0,
      1.2
    ),
    true
  );
  assert.deepEqual(shelfCfg.sketchExtras.shelves, [{ id: 'b' }]);
  assert.equal(applyInternalDrawerExistingFittingRemoval({}, {}, null, 0, 1.2), false);
});

test('surface flow preserves no-tool early return and regular shelf-depth branches', () => {
  assert.deepEqual(resolveSketchModuleSurfacePreview(surfaceArgs()), { handled: false });

  const shallow = resolveSketchModuleSurfacePreview(surfaceArgs({ isShelf: true, internalDepth: 0.3 }));
  assert.equal(shallow.handled, true);
  assert.equal(shallow.preview?.kind, 'shelf');
  assert.equal(shallow.preview?.d, Math.min(0.3, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM));

  for (const internalDepth of [0, -0.2]) {
    const fallback = resolveSketchModuleSurfacePreview(surfaceArgs({ isShelf: true, internalDepth }));
    assert.equal(fallback.preview?.d, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);
  }
});

test('surface flow preserves Shelf then Storage then Rod removal precedence', () => {
  const all = resolveSketchModuleSurfacePreview(
    surfaceArgs({
      intersects: [{ object: { userData: { partId: 'all_shelves' } }, point: { y: 0.6 } }],
      allowExistingShelfRemove: true,
      allowExistingStorageRemove: true,
      allowExistingRodRemove: true,
      shelves: [{ yNorm: 0.5, variant: 'glass', depthM: 0.31 }],
      storageBarriers: [{ yNorm: 0.5, heightM: 0.4 }],
      rods: [{ yNorm: 0.5 }],
    })
  );
  assert.equal(all.preview?.kind, 'shelf');
  assert.equal(all.hoverRecord?.kind, 'shelf');

  const storageBeforeRod = resolveSketchModuleSurfacePreview(
    surfaceArgs({
      allowExistingStorageRemove: true,
      allowExistingRodRemove: true,
      storageBarriers: [{ yNorm: 0.5, heightM: 0.4 }],
      rods: [{ yNorm: 0.5 }],
    })
  );
  assert.equal(storageBeforeRod.preview?.kind, 'storage');
  assert.equal(storageBeforeRod.hoverRecord?.kind, 'storage');
});

test('surface flow preserves remove-epsilon boundary, y clamp, variant, and depth precedence', () => {
  const shelfY = 0;
  const atBoundary = resolveSketchModuleSurfacePreview(
    surfaceArgs({
      intersects: [
        {
          object: { userData: { partId: 'all_shelves' } },
          point: { y: shelfY + SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM },
        },
      ],
      allowExistingShelfRemove: true,
      shelves: [{ yNorm: 0, variant: 'glass', depthM: 0.32 }],
    })
  );
  assert.equal(atBoundary.preview?.kind, 'shelf');
  assert.equal(atBoundary.preview?.op, 'remove');
  assert.equal(atBoundary.preview?.variant, 'glass');
  assert.equal(atBoundary.preview?.d, 0.32);
  assert.equal(atBoundary.preview?.y, 0.003);

  const outsideBoundary = resolveSketchModuleSurfacePreview(
    surfaceArgs({
      intersects: [
        {
          object: { userData: { partId: 'all_shelves' } },
          point: {
            y: shelfY + SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM + 0.000001,
          },
        },
      ],
      allowExistingShelfRemove: true,
      shelves: [{ yNorm: 0, variant: 'glass', depthM: 0.32 }],
    })
  );
  assert.deepEqual(outsideBoundary, { handled: false });
});

test('surface flow preserves minimum shelf width and box/content return shapes', () => {
  const shelf = resolveSketchModuleSurfacePreview(
    surfaceArgs({ isShelf: true, innerW: 0.01, internalDepth: 0.3 })
  );
  assert.equal(shelf.handled, true);
  assert.equal(shelf.preview?.kind, 'shelf');
  assert.ok(Number(shelf.preview?.w) <= SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM);
  assert.equal(shelf.hoverRecord?.kind, 'shelf');
  assert.equal(shelf.hoverRecord?.op, 'add');

  const box = resolveSketchModuleSurfacePreview(
    surfaceArgs({
      tool: 'sketch_box:40',
      isBox: true,
      boxH: 0.4,
      boxWidthOverrideM: 0.36,
      boxDepthOverrideM: 0.32,
    })
  );
  assert.equal(box.handled, true);
  assert.equal(box.preview?.kind, 'box');
  assert.equal(box.hoverRecord?.kind, 'box');
});
