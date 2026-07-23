import test from 'node:test';
import assert from 'node:assert/strict';

import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.js';
import { INTERIOR_STORAGE_GRID_POLICY } from '../esm/shared/dimensions/interior_storage_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.js';
import {
  SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY,
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.js';
import { resolveSketchModuleShelfRemovePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.js';

type Args = Parameters<typeof resolveSketchModuleShelfRemovePreview>[0];

type Measurement = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z?: number;
  label: string;
  labelX?: number;
  labelY?: number;
  styleKey?: string;
  textScale?: number;
  role?: string;
};

const shelfBoardHit = (y: number, extraUserData: Record<string, unknown> = {}) => ({
  object: { userData: { partId: 'all_shelves', ...extraUserData } },
  point: { y },
});

function baseArgs(overrides: Partial<Args> = {}): Args {
  return {
    host: { tool: 'sketch_shelf:regular', moduleKey: 0, isBottom: false },
    hitModuleKey: 0,
    intersects: [shelfBoardHit(0.6)],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves' },
    yClamped: 0.6,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    shelves: [],
    drawers: [],
    extDrawers: [],
    variant: 'regular',
    shelfDepthOverrideM: null,
    innerW: 1,
    internalDepth: 0.55,
    internalCenterX: 0.1,
    backZ: -0.275,
    woodThick: 0.018,
    regularDepth: 0.45,
    isDrawers: false,
    isCornerKey: () => false,
    removeEpsShelf: 0.02,
    ...overrides,
  };
}

function resolve(overrides: Partial<Args> = {}) {
  return resolveSketchModuleShelfRemovePreview(baseArgs(overrides));
}

function assertBaseRemoval(result: ReturnType<typeof resolve>, shelfIndex: number) {
  assert.equal(result.handled, true);
  assert.equal(result.result?.handled, true);
  assert.equal(result.result?.preview?.op, 'remove');
  assert.equal(result.result?.hoverRecord?.kind, 'shelf');
  assert.equal(result.result?.hoverRecord?.removeKind, 'base');
  assert.equal(result.result?.hoverRecord?.shelfIndex, shelfIndex);
}

test('sketch shelf nearest matching preserves inclusive policy boundaries, overrides, clamps, and hover identity', () => {
  const tolerance = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM;
  assert.equal(tolerance, 0.02);
  const shelf = { yNorm: 0.5, variant: 'glass', depthM: 0.32 };
  const shelves = [shelf, { yNorm: 0.75, variant: 'regular' }];
  const atUpperBoundary = resolve({
    bottomY: 0,
    topY: 1,
    spanH: 1,
    pad: 0.1,
    intersects: [shelfBoardHit(0.5 + tolerance)],
    yClamped: 0.5 + tolerance,
    shelves,
    cfgRef: null,
    removeEpsShelf: tolerance,
  });
  assert.equal(atUpperBoundary.handled, true);
  assert.equal(atUpperBoundary.result?.hoverRecord?.removeKind, 'sketch');
  assert.equal(atUpperBoundary.result?.hoverRecord?.removeIdx, 0);
  assert.equal(atUpperBoundary.result?.preview?.variant, 'glass');
  assert.equal(atUpperBoundary.shelfDepthOverrideM, 0.32);
  assert.equal(atUpperBoundary.yClamped, 0.5);

  const atLowerBoundary = resolve({
    bottomY: 0,
    topY: 1,
    spanH: 1,
    intersects: [shelfBoardHit(0.5 - tolerance)],
    yClamped: 0.5 - tolerance,
    shelves,
    cfgRef: null,
    removeEpsShelf: tolerance,
  });
  assert.equal(atLowerBoundary.handled, true);
  assert.equal(atLowerBoundary.result?.hoverRecord?.removeKind, 'sketch');
  assert.equal(atLowerBoundary.result?.hoverRecord?.removeIdx, 0);

  for (const shelfHitY of [0.5 + tolerance + 1e-9, 0.5 - tolerance - 1e-9]) {
    assert.equal(
      resolve({
        bottomY: 0,
        topY: 1,
        spanH: 1,
        intersects: [shelfBoardHit(shelfHitY)],
        yClamped: shelfHitY,
        shelves,
        cfgRef: null,
        removeEpsShelf: tolerance,
      }).handled,
      false
    );
  }

  const low = resolve({
    bottomY: 0,
    topY: 1,
    spanH: 1,
    pad: 0.1,
    intersects: [shelfBoardHit(0)],
    yClamped: 0,
    shelves: [{ yNorm: 0, variant: 'regular' }],
  });
  assert.equal(low.yClamped, 0.1);

  const high = resolve({
    bottomY: 0,
    topY: 1,
    spanH: 1,
    pad: 0.1,
    intersects: [shelfBoardHit(1)],
    yClamped: 1,
    shelves: [{ yNorm: 1, variant: 'regular' }],
  });
  assert.equal(high.yClamped, 0.9);
});

test('base shelf grid resolution preserves explicit/default divisions, rounding, and internal index clamps', () => {
  assertBaseRemoval(resolve({ info: { gridDivisions: 4 }, intersects: [shelfBoardHit(0.6)] }), 2);
  assertBaseRemoval(resolve({ info: {}, intersects: [shelfBoardHit(0.6)] }), 3);
  assert.equal(INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault, 6);

  const rounded = resolve({ info: { gridDivisions: 6 }, intersects: [shelfBoardHit(0.39)] });
  assertBaseRemoval(rounded, 2);
  assert.ok(Math.abs(rounded.yClamped - 0.4) < 1e-12);

  const lowerClamp = resolve({
    topY: 1,
    spanH: 1,
    info: { gridDivisions: 100 },
    intersects: [shelfBoardHit(0.001)],
    yClamped: 0.001,
  });
  assertBaseRemoval(lowerClamp, 1);
  assert.equal(lowerClamp.yClamped, 0.01);

  const upperClamp = resolve({
    topY: 1,
    spanH: 1,
    info: { gridDivisions: 100 },
    intersects: [shelfBoardHit(0.999)],
    yClamped: 0.999,
  });
  assertBaseRemoval(upperClamp, 99);
  assert.equal(upperClamp.yClamped, 0.99);
});

test('board and no-board tolerance branches preserve exact focused-owner formulas', () => {
  const boardTolerance = SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveBoardToleranceM;
  const boardTargetY = 0.6;
  for (const shelfHitY of [boardTargetY + boardTolerance, boardTargetY - boardTolerance]) {
    assertBaseRemoval(
      resolve({
        intersects: [shelfBoardHit(shelfHitY)],
        yClamped: shelfHitY,
      }),
      3
    );
  }
  for (const shelfHitY of [boardTargetY + boardTolerance + 1e-9, boardTargetY - boardTolerance - 1e-9]) {
    assert.equal(
      resolve({
        intersects: [shelfBoardHit(shelfHitY)],
        yClamped: shelfHitY,
        shelves: [],
      }).handled,
      false
    );
  }

  const cases = [
    {
      spanH: 1,
      divisions: 10,
      index: 5,
      expected: SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveNoBoardToleranceMinM,
    },
    {
      spanH: 1.2,
      divisions: 6,
      index: 3,
      expected: (1.2 / 6) * SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveNoBoardToleranceStepRatio,
    },
    {
      spanH: 1.8,
      divisions: 6,
      index: 3,
      expected: SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveNoBoardToleranceMaxM,
    },
  ];
  for (const item of cases) {
    const step = item.spanH / item.divisions;
    const targetY = item.index * step;
    for (const shelfHitY of [targetY + item.expected, targetY - item.expected]) {
      assertBaseRemoval(
        resolve({
          topY: item.spanH,
          spanH: item.spanH,
          info: { gridDivisions: item.divisions },
          intersects: [],
          yClamped: shelfHitY,
          isCornerKey: () => true,
        }),
        item.index
      );
    }
    for (const shelfHitY of [targetY + item.expected + 1e-9, targetY - item.expected - 1e-9]) {
      assert.equal(
        resolve({
          topY: item.spanH,
          spanH: item.spanH,
          info: { gridDivisions: item.divisions },
          intersects: [],
          yClamped: shelfHitY,
          isCornerKey: () => true,
        }).handled,
        false
      );
    }
  }

  const ratioEps = (1.2 / 6) * SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveNoBoardToleranceStepRatio;
  const extra = SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveCornerDrawerToleranceExtraM;
  const extraBoundary = Math.min(
    SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfRemoveNoBoardToleranceMaxM,
    ratioEps + extra
  );
  assert.equal(
    resolve({
      intersects: [],
      yClamped: 0.6 + extraBoundary,
      isCornerKey: () => true,
      isDrawers: false,
    }).handled,
    false
  );
  assertBaseRemoval(
    resolve({
      intersects: [],
      yClamped: 0.6 + extraBoundary,
      isCornerKey: () => true,
      isDrawers: true,
    }),
    3
  );
  assert.equal(
    resolve({
      intersects: [],
      yClamped: 0.6 + extraBoundary + 1e-9,
      isCornerKey: () => true,
      isDrawers: true,
    }).handled,
    false
  );
});

test('custom and built-in layout interpretation preserves shelf existence and brace variants', () => {
  assertBaseRemoval(
    resolve({
      info: { gridDivisions: 6 },
      cfgRef: { isCustom: true, customData: { shelves: [false, false, true] } },
    }),
    3
  );
  assert.equal(
    resolve({
      cfgRef: { isCustom: true, customData: { shelves: [false, false, false] } },
    }).handled,
    false
  );

  for (const layout of ['shelves', 'mixed']) {
    assertBaseRemoval(resolve({ cfgRef: { layout } }), 3);
  }
  for (const layout of ['hanging', 'hanging_top2', 'storage', 'storage_shelf']) {
    assertBaseRemoval(resolve({ cfgRef: { layout }, intersects: [shelfBoardHit(0.8)], yClamped: 0.8 }), 4);
  }
  assertBaseRemoval(
    resolve({ cfgRef: { layout: 'hanging_split' }, intersects: [shelfBoardHit(0.2)], yClamped: 0.2 }),
    1
  );
  assert.equal(resolve({ cfgRef: { layout: 'unknown' } }).handled, false);

  const brace = resolve({ cfgRef: { layout: 'shelves', braceShelves: [3] } });
  assert.equal(brace.result?.preview?.variant, 'brace');
  const regular = resolve({ cfgRef: { layout: 'shelves', braceShelves: [] } });
  assert.equal(regular.result?.preview?.variant, 'double');
});

test('shelf-board hit filtering and malformed inputs remain resilient', () => {
  const filtered = resolve({
    intersects: [
      shelfBoardHit(0.6, { __kind: 'shelf_pin' }),
      shelfBoardHit(0.6, { __kind: 'brace_seam' }),
      { object: { userData: { partId: 'left_side' } }, point: { y: 0.6 } },
    ],
  });
  assert.equal(filtered.handled, false);

  const cornerFallback = resolve({
    intersects: [shelfBoardHit(0.6, { __kind: 'shelf_pin' })],
    isCornerKey: () => true,
    yClamped: 0.6,
  });
  assertBaseRemoval(cornerFallback, 3);

  const malformedHit = {
    get object() {
      throw new Error('bad hit');
    },
  } as unknown as Args['intersects'][number];
  assert.doesNotThrow(() => resolve({ intersects: [malformedHit], cfgRef: null }));
  assert.equal(resolve({ intersects: [malformedHit], cfgRef: null }).handled, false);

  const malformedCfg = new Proxy(
    {},
    {
      get() {
        throw new Error('bad cfg');
      },
    }
  );
  assert.doesNotThrow(() => resolve({ cfgRef: malformedCfg, shelves: [] }));
  assert.equal(resolve({ cfgRef: malformedCfg, shelves: [] }).handled, false);
});

test('preview geometry and measurement minimum-Z branch preserve focused-owner target dimensions', () => {
  const result = resolve({
    host: { tool: 'sketch_shelf:glass', moduleKey: 0, isBottom: false },
    intersects: [shelfBoardHit(0.4)],
    yClamped: 0.4,
    shelves: [{ yNorm: 1 / 3, variant: 'glass', depthM: 0.04 }],
    cfgRef: { layout: 'hanging' },
  });
  assert.equal(result.handled, true);
  const preview = result.result?.preview;
  assert.ok(preview);
  assert.equal(preview?.x, 0.1);
  assert.ok(Math.abs((preview?.y ?? 0) - 0.4) < 1e-12);
  assert.equal(preview?.w, 1 - INTERIOR_SHELF_GEOMETRY_POLICY.regularWidthClearanceM);
  assert.equal(preview?.h, MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM);
  assert.equal(preview?.d, 0.04);

  const measurements = preview?.clearanceMeasurements as Measurement[];
  assert.ok(Array.isArray(measurements));
  assert.ok(measurements.length >= 2);
  const expectedZ = -0.275 + 0.04 + SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetMinM;
  assert.ok(measurements.every(entry => Math.abs((entry.z ?? 0) - expectedZ) < 1e-12));
  assert.ok(
    measurements
      .filter(entry => entry.role === 'cell')
      .every(entry => entry.textScale === SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale)
  );
  assert.ok(measurements.every(entry => entry.styleKey === 'cell' || entry.styleKey === 'neighbor'));

  const width = preview?.w ?? 0;
  const lineGap = Math.max(0.035, Math.min(0.085, width * 0.045));
  const centeredOffset = Math.min(lineGap * 0.9, Math.max(0.008, width / 2 - 0.008));
  const cell = measurements.find(entry => entry.role === 'cell');
  assert.ok(cell);
  assert.ok(Math.abs((cell?.startX ?? 0) - (0.1 + centeredOffset)) < 1e-12);
  assert.ok(
    Math.abs(
      Math.min(cell?.startY ?? 0, cell?.endY ?? 0) -
        (0.4 + MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM / 2)
    ) < 1e-12 ||
      Math.abs(
        Math.max(cell?.startY ?? 0, cell?.endY ?? 0) -
          (0.4 - MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM / 2)
      ) < 1e-12
  );
});

test('measurement depth-ratio branch and neighbor clearances remain in the remove preview', () => {
  const result = resolve({
    host: { tool: 'sketch_shelf:glass', moduleKey: 0, isBottom: false },
    intersects: [shelfBoardHit(0.4)],
    yClamped: 0.4,
    shelves: [
      { yNorm: 1 / 3, variant: 'glass' },
      { yNorm: 0.65, variant: 'regular' },
    ],
    cfgRef: { layout: 'hanging' },
    regularDepth: 0.45,
  });
  const preview = result.result?.preview;
  const measurements = preview?.clearanceMeasurements as Measurement[];
  assert.ok(Array.isArray(measurements));
  const expectedZ = -0.275 + 0.45 + 0.45 * SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementZOffsetDepthRatio;
  assert.ok(measurements.every(entry => Math.abs((entry.z ?? 0) - expectedZ) < 1e-12));
  assert.ok(measurements.some(entry => entry.role === 'neighbor'));
  assert.equal(result.result?.hoverRecord?.removeKind, 'sketch');
  assert.equal(result.result?.preview?.op, 'remove');
});
