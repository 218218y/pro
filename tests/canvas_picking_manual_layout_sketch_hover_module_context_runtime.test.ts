import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveManualLayoutSketchHoverModuleBaseContext,
  resolveManualLayoutSketchHoverModuleContext,
} from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_CLAMP_POLICY,
} from '../esm/shared/dimensions/interior_storage_policy.ts';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';
import { cmToM } from '../esm/shared/dimensions/units.ts';

function createApp(config: Record<string, unknown>, gridInfo: Record<string, unknown>, isBottom = false) {
  const runtimeCache = isBottom
    ? { internalGridMapSplitBottom: { 'corner:1': gridInfo } }
    : { internalGridMap: { 'corner:1': gridInfo } };
  return {
    services: { runtimeCache },
    store: {
      getState() {
        return {
          config,
          ui: {},
          mode: {},
          runtime: {},
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
      subscribe() {
        return () => undefined;
      },
    },
  } as any;
}

test('manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides', () => {
  const App = createApp(
    {
      cornerConfiguration: { layout: 'shelves' },
    },
    {
      effectiveBottomY: 0,
      effectiveTopY: 1,
      woodThick: 0.02,
      innerW: 0.8,
      internalCenterX: 0,
      internalDepth: 0.55,
      internalZ: -0.1,
    }
  );

  const ctx = resolveManualLayoutSketchHoverModuleContext({
    App,
    tool: 'sketch_box:80:45:35',
    freeBoxSpec: { heightCm: 80, widthCm: 45, depthCm: 35 },
    hitModuleKey: 'corner:1',
    hitSelectorObj: {
      userData: { isModuleSelector: true },
      geometry: { boundingBox: { min: { x: -0.5, y: 0, z: -0.2 }, max: { x: 0.5, y: 1, z: 0.2 } } },
      updateWorldMatrix() {},
      updateMatrixWorld() {},
      localToWorld(v: any) {
        return v;
      },
    },
    hitStack: 'top',
    hitY: 0.95,
    hitLocalX: 0.1,
    intersects: [],
    setPreview: null,
    hidePreview: null,
    __hideSketchPreviewAndClearHover: () => undefined,
    __wp_isCornerKey: value => typeof value === 'string' && value.startsWith('corner'),
    __wp_isDefaultCornerCellCfgLike: () => false,
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({}) as any,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: () => undefined,
  });

  assert.ok(ctx);
  assert.equal(ctx?.isBox, true);
  assert.equal(ctx?.boxWidthOverrideM, 0.45);
  assert.equal(ctx?.boxDepthOverrideM, 0.35);
  assert.equal(ctx?.boxH, 0.8);
  assert.equal(ctx?.yClamped, 0.596);
});

test('manual-layout hover module context falls back to the corner root config when no cell config exists', () => {
  const App = createApp(
    {
      cornerConfiguration: {
        layout: 'custom_root',
        sketchExtras: {
          shelves: [{ id: 'root-shelf', yNorm: 0.4 }],
        },
      },
    },
    {
      effectiveBottomY: 0,
      effectiveTopY: 2,
      woodThick: 0.02,
      innerW: 1,
      internalCenterX: 0,
      internalDepth: 0.6,
      internalZ: -0.1,
    }
  );

  const ctx = resolveManualLayoutSketchHoverModuleContext({
    App,
    tool: 'sketch_shelf:glass',
    freeBoxSpec: null,
    hitModuleKey: 'corner:1',
    hitSelectorObj: null,
    hitStack: 'top',
    hitY: 1,
    hitLocalX: 0,
    intersects: [],
    setPreview: null,
    hidePreview: null,
    __hideSketchPreviewAndClearHover: () => undefined,
    __wp_isCornerKey: value => typeof value === 'string' && value.startsWith('corner'),
    __wp_isDefaultCornerCellCfgLike: cfg => !cfg || (cfg as any).layout === 'default_root',
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({}) as any,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: () => undefined,
  });

  assert.ok(ctx);
  assert.equal(ctx?.cfgRef?.layout, 'custom_root');
  assert.deepEqual(
    ctx?.shelves.map(entry => entry.id),
    ['root-shelf']
  );
  assert.equal(ctx?.variant, 'glass');
});

function createBaseArgs(overrides: Record<string, unknown> = {}) {
  const gridInfo = {
    effectiveBottomY: 0,
    effectiveTopY: 1,
    woodThick: 0.02,
    innerW: 0.8,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: -0.1,
    ...(overrides.gridInfo as Record<string, unknown> | undefined),
  };
  const App =
    overrides.App ??
    createApp({ cornerConfiguration: { layout: 'shelves' } }, gridInfo, overrides.hitStack === 'bottom');
  let hideCalls = 0;
  const args = {
    App,
    tool: 'sketch_shelf:regular',
    freeBoxSpec: null,
    hitModuleKey: 'corner:1',
    hitSelectorObj: null,
    hitStack: 'top',
    hitY: 0.5,
    hitLocalX: 0,
    intersects: [],
    setPreview: null,
    hidePreview: null,
    __hideSketchPreviewAndClearHover: () => {
      hideCalls += 1;
    },
    __wp_isCornerKey: () => true,
    __wp_isDefaultCornerCellCfgLike: () => false,
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({}) as any,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: () => undefined,
    ...overrides,
  } as any;
  delete args.gridInfo;
  return { args, getHideCalls: () => hideCalls };
}

test('manual-layout hover base context rejects missing or invalid module bounds', () => {
  const missingApp = {
    services: { runtimeCache: { internalGridMap: {} } },
    store: createApp({}, {}).store,
  } as any;
  const missing = createBaseArgs({ App: missingApp });
  assert.equal(resolveManualLayoutSketchHoverModuleBaseContext(missing.args), null);
  assert.equal(missing.getHideCalls(), 1);

  for (const gridInfo of [
    { effectiveBottomY: 1, effectiveTopY: 1 },
    { effectiveBottomY: 2, effectiveTopY: 1 },
    { effectiveBottomY: '0', effectiveTopY: 1 },
  ]) {
    const invalid = createBaseArgs({ gridInfo });
    assert.equal(resolveManualLayoutSketchHoverModuleBaseContext(invalid.args), null);
    assert.equal(invalid.getHideCalls(), 1);
  }
});

test('manual-layout hover base context preserves storage clamp pad and hit-Y bounds', () => {
  const cases = [
    { woodThick: 0.001, expectedPad: INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM },
    { woodThick: 0.02, expectedPad: 0.02 * INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio },
    { woodThick: 1, expectedPad: INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM },
  ];
  for (const { woodThick, expectedPad } of cases) {
    for (const [hitY, expectedY] of [
      [-1, expectedPad],
      [0.5, 0.5],
      [2, 1 - expectedPad],
    ] as const) {
      const { args } = createBaseArgs({ gridInfo: { woodThick }, hitY });
      const ctx = resolveManualLayoutSketchHoverModuleBaseContext(args);
      assert.ok(ctx);
      assert.equal(ctx.pad, expectedPad);
      assert.equal(ctx.yClamped, expectedY);
    }
  }
});

test('manual-layout hover base context preserves box defaults, clamps, and positive overrides', () => {
  const defaultCtx = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({ tool: 'sketch_box:', freeBoxSpec: null }).args
  );
  assert.ok(defaultCtx);
  assert.equal(defaultCtx.boxH, SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM);

  const minimum = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({ tool: 'sketch_box:1', freeBoxSpec: { heightCm: 1 } }).args
  );
  assert.ok(minimum);
  assert.equal(minimum.boxH, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM);

  const capped = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({
      tool: 'sketch_box:500:45:35',
      freeBoxSpec: { heightCm: 500, widthCm: '45', depthCm: 35 },
      hitY: 0.99,
    }).args
  );
  assert.ok(capped);
  assert.equal(capped.boxH, 1);
  assert.equal(capped.boxWidthOverrideM, cmToM(45));
  assert.equal(capped.boxDepthOverrideM, cmToM(35));
  assert.equal(capped.yClamped, 0.99);

  const centerClamped = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({
      tool: 'sketch_box:40',
      freeBoxSpec: { heightCm: 40 },
      hitY: 0.99,
    }).args
  );
  assert.ok(centerClamped);
  assert.equal(centerClamped.yClamped, 1 - centerClamped.pad - centerClamped.boxH / 2);

  for (const freeBoxSpec of [
    { heightCm: Number.NaN, widthCm: 0, depthCm: -1 },
    { heightCm: Number.POSITIVE_INFINITY, widthCm: Number.POSITIVE_INFINITY, depthCm: Number.NaN },
  ]) {
    const ctx = resolveManualLayoutSketchHoverModuleBaseContext(
      createBaseArgs({ tool: 'sketch_box:', freeBoxSpec }).args
    );
    assert.ok(ctx);
    assert.equal(ctx.boxH, SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM);
    assert.equal(ctx.boxWidthOverrideM, null);
    assert.equal(ctx.boxDepthOverrideM, null);
  }
});

test('manual-layout hover base context preserves shelf parsing and centimeter conversion', () => {
  const valid = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({ tool: 'sketch_shelf:glass@35' }).args
  );
  assert.ok(valid);
  assert.equal(valid.variant, 'glass');
  assert.equal(valid.shelfDepthM, cmToM(35));
  assert.equal(valid.shelfDepthOverrideM, cmToM(35));

  for (const tool of [
    'sketch_shelf:regular',
    'sketch_shelf:regular@0',
    'sketch_shelf:regular@-2',
    'sketch_shelf:regular@NaN',
  ]) {
    const ctx = resolveManualLayoutSketchHoverModuleBaseContext(createBaseArgs({ tool }).args);
    assert.ok(ctx);
    assert.equal(ctx.shelfDepthM, null);
    assert.equal(ctx.shelfDepthOverrideM, null);
  }
});

test('manual-layout hover base context preserves storage defaults, minimum, span cap, and center clamp', () => {
  const fallback = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({ tool: 'sketch_storage:not-a-number' }).args
  );
  assert.ok(fallback);
  assert.equal(fallback.storageH, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);

  const minimum = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({ tool: 'sketch_storage:1' }).args
  );
  assert.ok(minimum);
  assert.equal(minimum.storageH, INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMinM);

  const spanCapped = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({
      tool: 'sketch_storage:500',
      gridInfo: { effectiveBottomY: 0, effectiveTopY: 2 },
      hitY: 1.9,
    }).args
  );
  assert.ok(spanCapped);
  assert.equal(spanCapped.storageH, 2);
  assert.ok(spanCapped.storageH > INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMaxM);
  assert.equal(spanCapped.yClamped, 1.9);

  const centered = resolveManualLayoutSketchHoverModuleBaseContext(
    createBaseArgs({ tool: 'sketch_storage:40', hitY: 0.99 }).args
  );
  assert.ok(centered);
  assert.equal(centered.yClamped, 1 - centered.pad - centered.storageH / 2);
  for (const key of ['bottomY', 'topY', 'woodThick', 'innerW', 'spanH', 'pad', 'yClamped', 'storageH']) {
    assert.equal(typeof (centered as any)[key], 'number');
  }
});
