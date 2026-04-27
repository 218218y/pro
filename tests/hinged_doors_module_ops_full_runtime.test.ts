import test from 'node:test';
import assert from 'node:assert/strict';

import { appendFullHingedDoorOps } from '../esm/native/builder/hinged_doors_module_ops_full.ts';

function createCtx(overrides: Record<string, unknown> = {}) {
  const base = {
    cfg: {
      wardrobeType: 'hinged',
      isMultiColorMode: true,
      groovesMap: {},
      handlesMap: {},
    },
    index: 0,
    doorBottomY: 0.02,
    totalDoorSpace: 1.98,
    doorFrontZ: 0.25,
    globalHandleAbsY: 0.05,
    isGroovesEnabled: true,
    removeDoorsEnabled: false,
    opsList: [] as any[],
    grooveValSafe: (_doorId: number, _suffix: string, fallback: boolean) => fallback,
    resolveCurtainForPart: (_partId: string, fallback: string | null | undefined) => fallback ?? null,
    resolveSpecialForPart: (_partId: string, _curtain: string | null) => null,
    isDoorRemovedSafe: () => false,
  };
  return {
    ...base,
    ...overrides,
    cfg: {
      ...base.cfg,
      ...((overrides.cfg as Record<string, unknown> | undefined) || {}),
    },
  } as any;
}

function createState(overrides: Record<string, unknown> = {}) {
  return {
    currentDoorId: 7,
    nextGlobalDoorCounter: 8,
    doorLeftEdge: 0,
    pivotX: 0.4,
    meshOffsetX: 0.2,
    isLeftHinge: true,
    doorWidth: 0.45,
    topSplitEnabled: false,
    bottomSplitEnabled: false,
    shouldSplitThisDoor: false,
    sourceKey: 'd7_full',
    topKey: 'd7_top',
    midKey: 'd7_mid',
    botKey: 'd7_bot',
    ...overrides,
  } as any;
}

test('appendFullHingedDoorOps uses grooveValSafe for full doors and clamps long-edge handles canonically', () => {
  const ctx = createCtx({
    cfg: {
      groovesMap: {},
      globalHandleType: 'edge',
      handlesMap: { __wp_edge_handle_variant_global: 'long' },
    },
    globalHandleAbsY: 0.01,
    grooveValSafe: (_doorId: number, suffix: string, fallback: boolean) =>
      suffix === 'full' ? true : fallback,
  });
  const state = createState();

  appendFullHingedDoorOps(ctx, state);

  assert.equal(ctx.opsList.length, 1);
  assert.equal(ctx.opsList[0].partId, 'd7_full');
  assert.equal(ctx.opsList[0].hasGroove, true);
  assert.equal(ctx.opsList[0].handleAbsY, 0.22);
});

test('appendFullHingedDoorOps keeps mirrors groove-free even when full-door groove fallback resolves true', () => {
  const ctx = createCtx({
    grooveValSafe: () => true,
    resolveSpecialForPart: () => 'mirror',
  });
  const state = createState({ sourceKey: 'd8_full' });

  appendFullHingedDoorOps(ctx, state);

  assert.equal(ctx.opsList.length, 1);
  assert.equal(ctx.opsList[0].isMirror, true);
  assert.equal(ctx.opsList[0].hasGroove, false);
});
