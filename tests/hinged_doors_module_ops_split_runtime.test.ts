import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeCustomSplitCutsY,
  mergeSplitCuts,
} from '../esm/native/builder/hinged_doors_module_ops_split_policy.ts';
import { appendSplitHingedDoorOps } from '../esm/native/builder/hinged_doors_module_ops_split.ts';

function createCtx(overrides: Record<string, unknown> = {}) {
  const base = {
    App: {},
    THREE: null,
    cfg: {
      splitDoorsMap: {},
      handlesMap: {},
      groovesMap: {},
      isMultiColorMode: true,
      globalHandleType: 'bar',
    },
    index: 0,
    modulesLength: 1,
    moduleDoors: 1,
    modWidth: 1,
    currentX: 0,
    drawerHeightTotal: 0,
    effectiveBottomY: 0,
    startY: 0,
    woodThick: 0.02,
    cabinetBodyHeight: 2,
    D: 0.6,
    doorFrontZ: 0.1,
    splitLineY: 1.3,
    splitDoors: true,
    stackKey: 'main',
    isBottomStack: false,
    opsList: [] as any[],
    hingedDoorPivotMap: null,
    globalHandleAbsY: 1.05,
    configRecord: {},
    moduleCfgList: [{}],
    isGroovesEnabled: true,
    removeDoorsEnabled: false,
    shadowMat: null,
    externalW: 1,
    externalCenterX: 0.5,
    drawerTopEdgeAbsolute: 0,
    doorBottomY: 0,
    effectiveTopLimit: 2,
    totalDoorSpace: 2,
    singleDoorW: 0.5,
    getHingeDirSafe: () => 'left' as const,
    isDoorSplitSafe: () => true,
    isDoorSplitBottomSafe: () => false,
    getPartColorValueSafe: (partId: string) => `color:${partId}`,
    grooveValSafe: (_doorId: number, suffix: string, fallback: boolean) =>
      suffix === 'full' ? fallback : false,
    isDoorRemovedSafe: () => false,
    reportDoorSoftOnce: () => undefined,
    resolveCurtainForPart: (partId: string, fallback: string | null | undefined) =>
      fallback ?? `curtain:${partId}`,
    resolveSpecialForPart: () => null,
    isDoorSplitExplicitOn: () => false,
  };

  const merged = {
    ...base,
    ...overrides,
    cfg: {
      ...base.cfg,
      ...((overrides.cfg as Record<string, unknown> | undefined) || {}),
    },
  };

  if (!Array.isArray((merged as any).opsList)) {
    (merged as any).opsList = [];
  }
  return merged as any;
}

function createState(overrides: Record<string, unknown> = {}) {
  return {
    currentDoorId: 5,
    nextGlobalDoorCounter: 6,
    doorLeftEdge: 0,
    pivotX: 0.4,
    meshOffsetX: 0,
    isLeftHinge: true,
    doorWidth: 0.48,
    topSplitEnabled: true,
    bottomSplitEnabled: false,
    shouldSplitThisDoor: true,
    sourceKey: 'd5_full',
    topKey: 'd5_top',
    midKey: 'd5_mid',
    botKey: 'd5_bot',
    ...overrides,
  } as any;
}

test('hinged door split policy dedupes nearby custom cuts and merged bottom cuts', () => {
  const ctx = createCtx({
    cfg: {
      splitDoorsMap: {
        splitpos_d5: [0.2, 0.21, 0.5],
      },
    },
  });
  const state = createState();

  const customCuts = computeCustomSplitCutsY(ctx, state);
  assert.equal(customCuts.length, 2);
  assert.ok(Math.abs(customCuts[0] - 0.4) < 1e-9);
  assert.ok(Math.abs(customCuts[1] - 1.0) < 1e-9);

  const mergedCuts = mergeSplitCuts(ctx, customCuts, 0.41, true);
  assert.equal(mergedCuts.length, 2);
  assert.ok(Math.abs(mergedCuts[0] - 0.4) < 1e-9);
  assert.ok(Math.abs(mergedCuts[1] - 1.0) < 1e-9);
});

test('hinged door split append emits canonical multi-cut segment ids and bottom handle policy', () => {
  const ctx = createCtx({
    cfg: {
      splitDoorsMap: {
        splitpos_d5: [0.25, 0.5, 0.75],
      },
      groovesMap: {
        groove_d5_mid1: true,
      },
    },
  });
  const state = createState({ bottomSplitEnabled: true });

  appendSplitHingedDoorOps(ctx, state);

  assert.equal(ctx.opsList.length, 4);
  assert.deepEqual(
    ctx.opsList.map((entry: any) => entry.partId),
    ['d5_bot', 'd5_mid1', 'd5_mid2', 'd5_top']
  );
  assert.deepEqual(
    ctx.opsList.map((entry: any) => entry.allowHandle),
    [false, true, true, true]
  );
  assert.equal(ctx.opsList[1].hasGroove, true);
  assert.ok(Math.abs(ctx.opsList[0].y - 0.2485) < 1e-9);
  assert.ok(Math.abs(ctx.opsList[3].handleAbsY - 1.603) < 1e-9);
});
