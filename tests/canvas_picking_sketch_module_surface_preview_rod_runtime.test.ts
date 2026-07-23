import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERIOR_PRESET_ROD_FACTORS_POLICY,
  INTERIOR_ROD_PLACEMENT_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.js';
import { INTERIOR_STORAGE_GRID_POLICY } from '../esm/shared/dimensions/interior_storage_policy.js';
import { SKETCH_BOX_ROD_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.js';
import { resolveSketchModuleSurfacePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview.js';
import { resolveSketchModuleRodRemovePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_rod.js';
import type { ResolveSketchModuleSurfacePreviewArgs } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_shared.js';

function createSource(
  overrides: Partial<ResolveSketchModuleSurfacePreviewArgs> = {}
): ResolveSketchModuleSurfacePreviewArgs {
  return {
    host: { tool: 'sketch_shelf:regular', moduleKey: 2, isBottom: false, ts: 17 },
    tool: 'sketch_shelf:regular',
    hitModuleKey: 2,
    intersects: [],
    info: { gridDivisions: INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault },
    cfgRef: { layout: 'shelves', isCustom: false },
    hitLocalX: 0,
    yClamped: 0.5,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0.25,
    internalDepth: 0.55,
    internalZ: 0.1,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: true,
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
    resolveSketchBoxGeometry: () => ({
      xNorm: 0.5,
      centered: true,
      centerX: 0,
      centerZ: 0,
      innerCenterZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
      outerW: 1,
      outerD: 0.55,
    }),
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
    ...overrides,
  };
}

function resolveFocusedRodPreview(args: {
  source?: Partial<ResolveSketchModuleSurfacePreviewArgs>;
  removeEpsShelf?: number;
  bottomY?: number;
  topY?: number;
  pad?: number;
  spanH?: number;
  yClamped?: number;
  innerW?: number;
  rods?: Record<string, unknown>[];
}) {
  const bottomY = args.bottomY ?? 0;
  const topY = args.topY ?? 1.2;
  const spanH = args.spanH ?? topY - bottomY;
  const yClamped = args.yClamped ?? 0.5;
  const rods = args.rods ?? [];
  const source = createSource({
    bottomY,
    topY,
    spanH,
    yClamped,
    innerW: args.innerW ?? 1,
    rods,
    ...args.source,
  });
  return resolveSketchModuleRodRemovePreview({
    source,
    removeEpsShelf: args.removeEpsShelf ?? 0.03,
    bottomY,
    topY,
    pad: args.pad ?? 0.003,
    spanH,
    internalCenterX: source.internalCenterX,
    internalZ: source.internalZ,
    innerW: source.innerW,
    woodThick: source.woodThick,
    yClamped,
    rods,
  });
}

test('module surface preview resolves preset rod hover as remove when removal probe is enabled', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 0, isBottom: false },
    tool: 'sketch_shelf:regular',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'hanging_top2', isCustom: false },
    hitLocalX: 0,
    yClamped: 0.76,
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
    resolveSketchBoxGeometry: () => ({
      xNorm: 0.5,
      centered: true,
      centerX: 0,
      centerZ: 0,
      innerCenterZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
      outerW: 1,
      outerD: 0.55,
    }),
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'rod');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'rod');
  assert.equal(result.hoverRecord?.removeKind, 'base');
  assert.equal(result.hoverRecord?.rodIndex, 4);
});

test('module surface preview resolves sketch rod hover as remove when removal probe is enabled', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 1, isBottom: false },
    tool: 'sketch_box:40',
    hitModuleKey: 1,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true, customData: { rods: [] } },
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
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [{ yNorm: 0.5 }],
    isCornerKey: () => false,
    resolveSketchBoxGeometry: () => ({
      xNorm: 0.5,
      centered: true,
      centerX: 0,
      centerZ: 0,
      innerCenterZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
      outerW: 1,
      outerD: 0.55,
    }),
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'rod');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'rod');
  assert.equal(result.hoverRecord?.removeKind, 'sketch');
  assert.equal(result.hoverRecord?.removeIdx, 0);
});

test('focused rod preview preserves Sketch matching boundaries, clamps, hover fields, and geometry', () => {
  const exactBoundary = resolveFocusedRodPreview({
    topY: 1,
    spanH: 1,
    yClamped: 0.53125,
    removeEpsShelf: 0.03125,
    rods: [{ yNorm: 0.5 }],
  });
  assert.equal(exactBoundary?.handled, true);
  assert.equal(exactBoundary?.hoverRecord?.removeKind, 'sketch');
  assert.equal(exactBoundary?.hoverRecord?.removeIdx, 0);
  assert.equal(exactBoundary?.hoverRecord?.rodIndex, undefined);
  assert.equal(exactBoundary?.preview?.op, 'remove');
  assert.equal(exactBoundary?.preview?.x, 0.25);
  assert.equal(exactBoundary?.preview?.z, 0.1);
  assert.equal(exactBoundary?.preview?.woodThick, 0.018);
  assert.equal(exactBoundary?.preview?.w, 1 - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM);
  assert.equal(exactBoundary?.preview?.h, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM);
  assert.equal(exactBoundary?.preview?.d, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM);

  assert.equal(
    resolveFocusedRodPreview({
      topY: 1,
      spanH: 1,
      yClamped: 0.5312501,
      removeEpsShelf: 0.03125,
      rods: [{ yNorm: 0.5 }],
    }),
    null
  );

  const lowerClamp = resolveFocusedRodPreview({
    topY: 1,
    spanH: 1,
    pad: 0.1,
    yClamped: 0,
    rods: [{ yNorm: 0 }],
  });
  assert.equal(lowerClamp?.preview?.y, 0.1);

  const upperClamp = resolveFocusedRodPreview({
    topY: 1,
    spanH: 1,
    pad: 0.1,
    yClamped: 1,
    rods: [{ yNorm: 1 }],
  });
  assert.equal(upperClamp?.preview?.y, 0.9);

  const minimumWidth = resolveFocusedRodPreview({
    topY: 1,
    spanH: 1,
    yClamped: 0.5,
    innerW: 0.01,
    rods: [{ yNorm: 0.5 }],
  });
  assert.equal(minimumWidth?.preview?.w, SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM);
});

test('focused rod preview preserves every built-in preset factor and grid behavior', () => {
  const cases = [
    ['mixed', INTERIOR_PRESET_ROD_FACTORS_POLICY.mixedRodYFactor, 4],
    ['hanging', INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor, 4],
    ['hanging_top2', INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor, 4],
    ['storage', INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodYFactor, 4],
    ['storage_shelf', INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodYFactor, 4],
  ] as const;
  const step = 1.2 / INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
  for (const [layout, factor, rodIndex] of cases) {
    const y = factor * step;
    const result = resolveFocusedRodPreview({
      yClamped: y,
      source: { cfgRef: { layout, isCustom: false } },
    });
    assert.equal(result?.hoverRecord?.removeKind, 'base', layout);
    assert.equal(result?.hoverRecord?.rodIndex, rodIndex, layout);
    assert.equal(result?.preview?.y, y, layout);
  }

  for (const [factor, rodIndex] of [
    [INTERIOR_PRESET_ROD_FACTORS_POLICY.splitUpperRodYFactor, 5],
    [INTERIOR_PRESET_ROD_FACTORS_POLICY.splitLowerRodYFactor, 2],
  ] as const) {
    const y = factor * step;
    const result = resolveFocusedRodPreview({
      yClamped: y,
      source: { cfgRef: { layout: 'hanging_split', isCustom: false } },
    });
    assert.equal(result?.hoverRecord?.rodIndex, rodIndex);
  }

  const explicitDivisions = 8;
  const explicitY = (INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor * 1.2) / explicitDivisions;
  const explicit = resolveFocusedRodPreview({
    yClamped: explicitY,
    source: {
      info: { gridDivisions: explicitDivisions },
      cfgRef: { layout: 'hanging', isCustom: false },
    },
  });
  assert.equal(explicit?.hoverRecord?.rodIndex, 4);

  const fallbackY =
    (INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor * 1.2) /
    INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
  const fallback = resolveFocusedRodPreview({
    yClamped: fallbackY,
    source: { info: {}, cfgRef: { layout: 'hanging', isCustom: false } },
  });
  assert.equal(fallback?.hoverRecord?.rodIndex, 4);

  const clampedIndex = resolveFocusedRodPreview({
    yClamped: INTERIOR_PRESET_ROD_FACTORS_POLICY.splitUpperRodYFactor * (1.2 / 3),
    removeEpsShelf: 1,
    source: {
      info: { gridDivisions: 3 },
      cfgRef: { layout: 'hanging_split', isCustom: false },
    },
  });
  assert.equal(clampedIndex?.hoverRecord?.rodIndex, 3);
  assert.equal(clampedIndex?.preview?.y, 1.2 - 0.003);

  for (const layout of ['shelves', 'unknown']) {
    assert.equal(resolveFocusedRodPreview({ source: { cfgRef: { layout, isCustom: false } } }), null);
  }
});

test('focused rod preview fails closed for non-positive or non-finite span steps and normalizes invalid grids', () => {
  const fallbackY =
    (INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor * 1.2) /
    INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
  for (const gridDivisions of ['invalid', Number.NaN]) {
    const normalized = resolveFocusedRodPreview({
      yClamped: fallbackY,
      source: {
        info: { gridDivisions },
        cfgRef: { layout: 'hanging', isCustom: false },
      },
    });
    assert.equal(normalized?.hoverRecord?.rodIndex, 4);
    assert.equal(normalized?.preview?.y, fallbackY);
    assert.equal(Number.isFinite(normalized?.preview?.y), true);
  }

  for (const gridDivisions of [0, -3]) {
    assert.equal(
      resolveFocusedRodPreview({
        yClamped: fallbackY,
        source: {
          info: { gridDivisions },
          cfgRef: { layout: 'hanging', isCustom: false },
        },
      }),
      null
    );
  }

  for (const spanH of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = resolveFocusedRodPreview({
      spanH,
      topY: spanH,
      yClamped: 0.5,
      source: { cfgRef: { layout: 'hanging', isCustom: false } },
    });
    assert.equal(result, null);
  }
});

test('focused rod preview preserves custom rod-op normalization, clamps, yAdd, covered, and fallback rods', () => {
  const lowClamp = resolveFocusedRodPreview({
    yClamped: 0.45,
    source: {
      cfgRef: {
        isCustom: true,
        customData: { rods: [], rodOps: [{ yFactor: 2, gridIndex: -10, yAdd: 0.05 }] },
      },
    },
  });
  assert.equal(lowClamp?.hoverRecord?.rodIndex, 1);
  assert.ok(Math.abs(Number(lowClamp?.preview?.y) - 0.45) < 1e-12);

  const highClamp = resolveFocusedRodPreview({
    yClamped: 0.8,
    source: {
      cfgRef: {
        isCustom: true,
        customData: { rods: [], rodOps: [{ yFactor: 4, gridIndex: 99 }] },
      },
    },
  });
  assert.equal(highClamp?.hoverRecord?.rodIndex, INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault);

  const normalized = resolveFocusedRodPreview({
    yClamped: 0.3,
    source: {
      info: { gridDivisions: 12 },
      cfgRef: {
        isCustom: true,
        customData: { rods: [], rodOps: [{ yFactor: 3 }] },
      },
    },
  });
  assert.equal(normalized?.hoverRecord?.rodIndex, 6);

  const fallbackY =
    1.2 / INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM;
  const fallback = resolveFocusedRodPreview({
    yClamped: fallbackY,
    source: {
      cfgRef: { isCustom: true, customData: { rods: [{}], rodOps: [] } },
    },
  });
  assert.equal(fallback?.hoverRecord?.rodIndex, 1);
  assert.equal(fallback?.preview?.y, fallbackY);

  const covered = resolveFocusedRodPreview({
    yClamped: fallbackY,
    removeEpsShelf: 0.01,
    source: {
      cfgRef: {
        isCustom: true,
        customData: { rods: [{}], rodOps: [{ yFactor: 2, gridIndex: 1 }] },
      },
    },
  });
  assert.equal(covered, null);

  const nearest = resolveFocusedRodPreview({
    yClamped: 0.79,
    source: {
      cfgRef: {
        isCustom: true,
        customData: {
          rods: [],
          rodOps: [null, {}, { yFactor: 'bad' }, { yFactor: 1, gridIndex: 1 }, { yFactor: 4, gridIndex: 4 }],
        },
      },
    },
  });
  assert.equal(nearest?.hoverRecord?.rodIndex, 4);

  assert.equal(
    resolveFocusedRodPreview({
      source: {
        cfgRef: {
          isCustom: true,
          customData: { rods: [], rodOps: [null, {}, { yFactor: 'bad' }] },
        },
      },
    }),
    null
  );
});

test('focused rod preview preserves Sketch versus Preset nearest-match and strict tie precedence', () => {
  const common = {
    topY: 1.2,
    spanH: 1.2,
    rods: [{ yNorm: 0.5 }],
    source: { cfgRef: { layout: 'mixed', isCustom: false } },
    removeEpsShelf: 0.2,
  };
  const presetWins = resolveFocusedRodPreview({ ...common, yClamped: 0.69 });
  assert.equal(presetWins?.hoverRecord?.removeKind, 'base');

  const sketchWins = resolveFocusedRodPreview({ ...common, yClamped: 0.61 });
  assert.equal(sketchWins?.hoverRecord?.removeKind, 'sketch');
  assert.equal(sketchWins?.hoverRecord?.removeIdx, 0);

  const exactTie = resolveFocusedRodPreview({
    topY: 6,
    spanH: 6,
    yClamped: 3.25,
    removeEpsShelf: 0.3,
    rods: [{ yNorm: 0.5 }],
    source: {
      info: { gridDivisions: 6 },
      cfgRef: { layout: 'mixed', isCustom: false },
    },
  });
  assert.equal(exactTie?.hoverRecord?.removeKind, 'sketch');
  assert.equal(exactTie?.hoverRecord?.removeIdx, 0);
});

test('focused rod preview returns null without a match and preserves handled base return shape', () => {
  assert.equal(resolveFocusedRodPreview({}), null);

  const y =
    (INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodYFactor * 1.2) /
    INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
  const result = resolveFocusedRodPreview({
    yClamped: y,
    source: { cfgRef: { layout: 'storage', isCustom: false } },
  });
  assert.equal(result?.handled, true);
  assert.equal(result?.hoverRecord?.kind, 'rod');
  assert.equal(result?.hoverRecord?.op, 'remove');
  assert.equal(result?.hoverRecord?.removeKind, 'base');
  assert.equal(result?.hoverRecord?.removeIdx, undefined);
  assert.equal(result?.preview?.kind, 'rod');
  assert.equal(result?.preview?.op, 'remove');
});
