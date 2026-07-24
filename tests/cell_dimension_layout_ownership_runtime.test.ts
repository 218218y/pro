import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CELL_DIMENSION_MATCH_POLICY,
  CELL_DIMENSION_PREVIEW_POLICY,
} from '../esm/shared/dimensions/cell_dimension_policy.ts';
import { tryHandleCellDimsHoverPreview } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts';
import {
  __wp_getCellDimsHoverOp,
  __wp_readCellDimsDraft,
} from '../esm/native/services/canvas_picking_local_helpers_cell_dims.ts';

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
    op: __wp_getCellDimsHoverOp(App, createTarget(args.target), selectorBox),
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
