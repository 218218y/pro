import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CELL_DIMENSION_MATCH_POLICY,
  CELL_DIMENSION_PREVIEW_POLICY,
} from '../esm/shared/dimensions/cell_dimension_policy.ts';
import { WARDROBE_LAYOUT_COMPARISON_POLICY } from '../esm/shared/dimensions/wardrobe_layout_comparison_policy.ts';
import { WARDROBE_DEFAULTS } from '../esm/shared/dimensions/wardrobe_defaults.ts';
import { tryHandleCellDimsHoverPreview } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts';
import {
  __wp_getCellDimsHoverOp,
  __wp_readCellDimsDraft,
} from '../esm/native/services/canvas_picking_local_helpers_cell_dims.ts';
import { resolveCellDimsPreviewState } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts';
import {
  toCellDimsPreviewHeightM,
  toCellDimsPreviewWidthM,
} from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims_inputs.ts';
import { resolveCellDimsFreeBoxPreviewTargetBox } from '../esm/native/services/canvas_picking_cell_dims_free_box_hover.ts';
import { applyLinearCellDimsWidthPolicy } from '../esm/native/services/canvas_picking_cell_dims_linear_width.ts';

function assertNear(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12, `expected ${actual} to equal ${expected}`);
}

const selectorBox = Object.freeze({
  centerX: 0,
  centerY: 0.5,
  centerZ: 0,
  width: 1,
  height: 1,
  depth: 0.5,
});

function createApp(stateOverrides: Record<string, unknown> = {}) {
  const state = {
    ui: {
      raw: {
        height: 200,
        depth: 50,
        cellDimsWidth: '',
        cellDimsHeight: '',
        cellDimsDepth: '',
        cellDimsHexMode: false,
        cellDimsHexProtrusion: '',
        cellDimsHexDoorWidth: '',
      },
    },
    config: {
      modulesConfiguration: [{}],
    },
    runtime: {},
    ...stateOverrides,
  } as Record<string, any>;
  return {
    state,
    App: {
      deps: { THREE: { tag: 'THREE' } },
      store: {
        getState: () => state,
        patch() {},
      },
    } as any,
  };
}

function createTarget(overrides: Record<string, unknown> = {}) {
  return {
    hitModuleKey: 0,
    hitSelectorObj: { id: 'selector' },
    isBottom: false,
    hitY: 0.5,
    info: {},
    bottomY: 0,
    topY: 2,
    spanH: 2,
    woodThick: 0,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0,
    backZ: -0.25,
    regularDepth: 0.5,
    intersects: [],
    ...overrides,
  } as any;
}

function renderPreview(args: {
  applyW?: number | null;
  applyH?: number | null;
  applyD?: number | null;
  woodThick?: number;
  measuredBox?: Record<string, number>;
}) {
  const { App } = createApp();
  const previews: Array<Record<string, any>> = [];
  const hidden: string[] = [];
  const target = createTarget({ woodThick: args.woodThick ?? 0 });
  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {},
    mouse: {},
    isCellDimsMode: true,
    hideLayoutPreview() {
      hidden.push('layout');
    },
    hideSketchPreview() {
      hidden.push('sketch');
    },
    previewRo: {
      setSketchPlacementPreview(payload: Record<string, any>) {
        previews.push(payload);
      },
    },
    resolveInteriorHoverTarget: () => target,
    measureObjectLocalBox: () => args.measuredBox ?? selectorBox,
    readCellDimsDraft: () => ({
      applyW: args.applyW ?? null,
      applyH: args.applyH ?? null,
      applyD: args.applyD ?? null,
    }),
    getCellDimsHoverOp: () => 'remove',
  } as any);
  return { handled, hidden, previews, target };
}

function matchingHarness(args: {
  raw?: Record<string, unknown>;
  module?: Record<string, unknown>;
  config?: Record<string, unknown>;
  target?: Record<string, unknown>;
}) {
  const { App, state } = createApp();
  Object.assign(state.ui.raw, args.raw ?? {});
  state.config = {
    modulesConfiguration: [args.module ?? {}],
    ...(args.config ?? {}),
  };
  return {
    draft: __wp_readCellDimsDraft(App),
    op: __wp_getCellDimsHoverOp(
      App,
      createTarget(args.target),
      selectorBox,
      {
        matchToleranceCm: CELL_DIMENSION_MATCH_POLICY.toleranceCm,
        defaultHingedDepthCm: WARDROBE_DEFAULTS.byType.hinged.depthCm,
      },
      selectorBox
    ),
  };
}

test('Cell Dimension preview uses every focused preview limit and preserves its payload contract', () => {
  const minimum = renderPreview({
    applyW: 0.1,
    applyH: 0.1,
    applyD: 0.1,
    woodThick: 0.002,
  });
  assert.equal(minimum.handled, true);
  assert.equal(minimum.previews.length, 1);
  assert.equal(minimum.previews[0].w, CELL_DIMENSION_PREVIEW_POLICY.minWidthM);
  assert.equal(minimum.previews[0].boxH, CELL_DIMENSION_PREVIEW_POLICY.minHeightM);
  assert.equal(minimum.previews[0].d, CELL_DIMENSION_PREVIEW_POLICY.minDepthM);
  assert.equal(minimum.previews[0].woodThick, CELL_DIMENSION_PREVIEW_POLICY.woodThicknessMinM);

  const scaled = renderPreview({
    applyW: 100,
    applyH: 140,
    applyD: 60,
    woodThick: 0.018,
  });
  const projectedWidthM = 1 - 0.018 * 2;
  assertNear(scaled.previews[0].w, projectedWidthM - CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM);
  assertNear(scaled.previews[0].boxH, 1.4 - CELL_DIMENSION_PREVIEW_POLICY.heightClearanceM);
  assert.equal(scaled.previews[0].d, 0.6);
  assert.equal(scaled.previews[0].woodThick, 0.018 * CELL_DIMENSION_PREVIEW_POLICY.woodThicknessScale);
  assert.deepEqual(
    {
      kind: scaled.previews[0].kind,
      fillFront: scaled.previews[0].fillFront,
      overlayThroughScene: scaled.previews[0].overlayThroughScene,
      op: scaled.previews[0].op,
      anchor: scaled.previews[0].anchor,
    },
    {
      kind: 'box',
      fillFront: true,
      overlayThroughScene: true,
      op: 'remove',
      anchor: scaled.target.hitSelectorObj,
    }
  );
  assert.deepEqual(scaled.hidden, ['layout']);

  const maximum = renderPreview({ applyD: 60, woodThick: 0.1 });
  assert.equal(maximum.previews[0].woodThick, CELL_DIMENSION_PREVIEW_POLICY.woodThicknessMaxM);

  const invalid = renderPreview({
    applyW: 100,
    measuredBox: { ...selectorBox, width: 0 },
  });
  assert.equal(invalid.handled, false);
  assert.deepEqual(invalid.previews, []);
  assert.deepEqual(invalid.hidden, ['layout', 'sketch']);
});

test('Cell Dimension matching keeps inclusive tolerance for width, height, and depth independently', () => {
  const tolerance = CELL_DIMENSION_MATCH_POLICY.toleranceCm;
  const dimensions = [
    {
      rawKey: 'cellDimsWidth',
      activeKey: 'widthCm',
      baseKey: 'baseWidthCm',
      current: 110,
      base: 100,
    },
    {
      rawKey: 'cellDimsHeight',
      activeKey: 'heightCm',
      baseKey: 'baseHeightCm',
      current: 110,
      base: 100,
    },
    {
      rawKey: 'cellDimsDepth',
      activeKey: 'depthCm',
      baseKey: 'baseDepthCm',
      current: 55,
      base: 50,
    },
  ];

  for (const dimension of dimensions) {
    const module = {
      specialDims: {
        [dimension.baseKey]: dimension.base,
        [dimension.activeKey]: dimension.current,
      },
    };
    assert.equal(
      matchingHarness({
        module,
        raw: { [dimension.rawKey]: dimension.current + tolerance - 0.001 },
      }).op,
      'remove'
    );
    assert.equal(
      matchingHarness({
        module,
        raw: { [dimension.rawKey]: dimension.current + tolerance },
      }).op,
      'remove'
    );
    assert.equal(
      matchingHarness({
        module,
        raw: { [dimension.rawKey]: dimension.current + tolerance + 0.001 },
      }).op,
      'add'
    );
  }
});

test('Cell Dimension preview-state matching and active/base rollback share the canonical match tolerance', () => {
  const tolerance = CELL_DIMENSION_MATCH_POLICY.toleranceCm;
  const resolveWidth = (applyW: number) =>
    resolveCellDimsPreviewState({
      currentWcm: tolerance,
      currentTopAbsCm: 100,
      currentDcm: 50,
      currentBottomYm: 0,
      widthSd: { baseWidthCm: 1 },
      heightDepthSd: null,
      applyW,
      applyH: null,
      applyD: null,
      matchToleranceCm: tolerance,
    }).targetWcm;

  assert.equal(resolveWidth(0.001), 1);
  assert.equal(resolveWidth(0), 1);
  assert.equal(resolveWidth(-0.001), -0.001);
});

test('linear and free-box preview floors receive all three canonical preview minimums', () => {
  const { App } = createApp();
  const nonLinearTarget = createTarget({ hitModuleKey: 'corner' });
  assert.equal(
    toCellDimsPreviewWidthM(App, nonLinearTarget, 0.1, CELL_DIMENSION_PREVIEW_POLICY.minWidthM),
    CELL_DIMENSION_PREVIEW_POLICY.minWidthM
  );
  assert.equal(
    toCellDimsPreviewHeightM(0, 0.1, CELL_DIMENSION_PREVIEW_POLICY.minHeightM),
    CELL_DIMENSION_PREVIEW_POLICY.minHeightM
  );

  const freeBoxTarget = createTarget({
    info: {
      __wpCellDimsFreeBox: true,
      __wpCellDimsFreeBoxRecord: {},
    },
  });
  const freeBoxPreview = resolveCellDimsFreeBoxPreviewTargetBox(
    freeBoxTarget,
    { ...selectorBox, width: 0.01, height: 0.01, depth: 0.01 },
    null,
    null,
    null,
    CELL_DIMENSION_PREVIEW_POLICY.minWidthM,
    CELL_DIMENSION_PREVIEW_POLICY.minHeightM,
    CELL_DIMENSION_PREVIEW_POLICY.minDepthM
  );
  assert.ok(freeBoxPreview);
  assert.equal(freeBoxPreview.width, CELL_DIMENSION_PREVIEW_POLICY.minWidthM);
  assert.equal(freeBoxPreview.height, CELL_DIMENSION_PREVIEW_POLICY.minHeightM);
  assert.equal(freeBoxPreview.depth, CELL_DIMENSION_PREVIEW_POLICY.minDepthM);
});

test('linear auto-width detection keeps an inclusive owner-provided boundary', () => {
  const tolerance = WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm;
  const run = (storedWidthCm: number) => {
    const previous = [{ specialDims: { widthCm: storedWidthCm, baseWidthCm: storedWidthCm } }];
    const next = [{ ...previous[0], specialDims: { ...previous[0].specialDims } }];
    return applyLinearCellDimsWidthPolicy(
      {
        cfg: { isManualWidth: true },
        raw: {},
        idx: 0,
        applyW: null,
        moduleCount: 1,
        doorsPerModule: [1],
        defaultWidths: [tolerance],
        prevModsCfg: previous,
        widthsCurr: [tolerance],
        baseW: [tolerance],
        tgtW: tolerance,
        toggledBackW: false,
        totalW: tolerance,
        autoWidthMatchToleranceCm: tolerance,
      } as any,
      next,
      () => next[0]
    );
  };

  assert.equal(run(0).unsetManualWidth, true);
  assert.equal(run(-0.001).unsetManualWidth, false);
});

test('Cell Dimension matching preserves bottom, custom, Hex Cell, corner, stack, and numeric-input semantics', () => {
  const customWidth = {
    specialDims: { baseWidthCm: 100, widthCm: 110 },
  };
  assert.equal(matchingHarness({ module: customWidth, raw: { cellDimsWidth: 110 } }).op, 'remove');
  assert.equal(matchingHarness({ raw: { cellDimsWidth: 100 } }).op, 'add');

  const bottom = matchingHarness({
    module: { specialDims: { baseHeightCm: 200, heightCm: 210 } },
    raw: { cellDimsHeight: 210 },
    target: { isBottom: true },
  });
  assert.equal(bottom.op, 'add');

  const stack = matchingHarness({
    config: {
      stackSplitLowerModulesConfiguration: [{ specialDims: { baseDepthCm: 50, depthCm: 55 } }],
    },
    raw: { cellDimsDepth: 55, cellDimsHeight: 210 },
    target: { isBottom: true },
  });
  assert.equal(stack.op, 'remove');

  const corner = matchingHarness({
    config: {
      cornerConfiguration: {
        connectorSpecialDims: { baseWidthCm: 100, widthCm: 110 },
      },
    },
    raw: { cellDimsWidth: 110 },
    target: { hitModuleKey: 'corner' },
  });
  assert.equal(corner.op, 'remove');

  const tolerance = CELL_DIMENSION_MATCH_POLICY.toleranceCm;
  const hexModule = { hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 60 } };
  assert.equal(
    matchingHarness({
      module: hexModule,
      raw: {
        cellDimsHexMode: true,
        cellDimsHexProtrusion: 10 + tolerance,
        cellDimsHexDoorWidth: 60,
      },
    }).op,
    'remove'
  );
  assert.equal(
    matchingHarness({
      module: hexModule,
      raw: {
        cellDimsHexMode: true,
        cellDimsHexProtrusion: 10 + tolerance + 0.001,
        cellDimsHexDoorWidth: 60,
      },
    }).op,
    'add'
  );

  const numericStringConfig = matchingHarness({
    module: { specialDims: { baseWidthCm: '100', widthCm: '110' } },
    raw: { cellDimsWidth: 110 },
  });
  assert.equal(numericStringConfig.draft.applyW, 110);
  assert.equal(numericStringConfig.op, 'add');
});
