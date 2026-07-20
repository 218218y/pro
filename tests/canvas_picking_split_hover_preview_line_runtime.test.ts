import test from 'node:test';
import assert from 'node:assert/strict';

import { BASE_PLINTH_POLICY } from '../esm/shared/dimensions/base_plinth_policy.ts';
import { CARCASS_INTERIOR_GRID_POLICY } from '../esm/shared/dimensions/carcass_interior_grid_policy.ts';
import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/dimensions/carcass_shell_policy.ts';
import { HINGED_DOOR_SPLIT_GEOMETRY_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';
import {
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
} from '../esm/shared/dimensions/external_drawer_policy.ts';
import { INTERIOR_STORAGE_BARRIER_POLICY } from '../esm/shared/dimensions/interior_storage_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { __wp_getRegularSplitPreviewLineY } from '../esm/native/services/canvas_picking_split_hover_preview_line.ts';

function assertClose(actual: number | null, expected: number, message: string): void {
  assert.notEqual(actual, null, message);
  assert.ok(Math.abs(Number(actual) - expected) < 1e-12, `${message}: expected ${expected}, got ${actual}`);
}

function makeApp(
  args: {
    config?: Record<string, unknown>;
    topGrid?: Record<string, unknown>;
    bottomGrid?: Record<string, unknown>;
  } = {}
): any {
  const state = {
    ui: {},
    config: args.config || {},
    runtime: {},
    mode: {},
    meta: {},
  };
  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    services: {
      runtimeCache: {
        internalGridMap: args.topGrid || Object.create(null),
        internalGridMapSplitBottom: args.bottomGrid || Object.create(null),
      },
    },
  };
}

function hit(userData: Record<string, unknown>): any {
  return { userData };
}

function clamp(bounds: { minY: number; maxY: number }, value: number): number {
  return Math.max(
    bounds.minY + HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM,
    Math.min(bounds.maxY - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM, value)
  );
}

function drawerHeight(config: Record<string, unknown>): number {
  let total = config.hasShoeDrawer ? EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM : 0;
  const count = Number(config.extDrawersCount || 0);
  if (Number.isFinite(count) && count > 0) total += count * EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM;
  return total;
}

test('split-hover preview rejects invalid bounds and preserves sketch-box bounds-local clamps', () => {
  const sketchDoor = hit({ partId: 'sketch_box_0_door_0' });
  assert.equal(
    __wp_getRegularSplitPreviewLineY({
      App: {} as any,
      hitDoorGroup: sketchDoor,
      bounds: { minY: 0, maxY: NaN },
      isBottomRegion: false,
    }),
    null
  );
  assert.equal(
    __wp_getRegularSplitPreviewLineY({
      App: {} as any,
      hitDoorGroup: sketchDoor,
      bounds: { minY: 0, maxY: 0.05 },
      isBottomRegion: true,
    }),
    null
  );

  const bounds = { minY: 0, maxY: 1.2 };
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: {} as any,
      hitDoorGroup: sketchDoor,
      bounds,
      isBottomRegion: true,
    }),
    0.4,
    'sketch bottom uses storage lift bounded by one third of the span'
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: {} as any,
      hitDoorGroup: sketchDoor,
      bounds,
      isBottomRegion: false,
    }),
    (CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex * 1.2) / CARCASS_INTERIOR_GRID_POLICY.divisions,
    'sketch top uses the canonical interior-grid ratio'
  );

  const narrow = { minY: 0, maxY: 0.21 };
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: {} as any,
      hitDoorGroup: sketchDoor,
      bounds: narrow,
      isBottomRegion: true,
    }),
    narrow.minY + HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM,
    'sketch bottom is clamped at the lower offset'
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: {} as any,
      hitDoorGroup: sketchDoor,
      bounds: narrow,
      isBottomRegion: false,
    }),
    narrow.maxY - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM,
    'sketch top is clamped at the upper offset'
  );
});

test('regular split-hover uses runtime grid metrics and the canonical material fallback', () => {
  const bounds = { minY: 0, maxY: 3 };
  const app = makeApp({
    config: { modulesConfiguration: [{}] },
    topGrid: {
      0: { effectiveBottomY: 2.5, effectiveTopY: 2.9 },
    },
  });
  const door = hit({ moduleIndex: 0, partId: 'module_0_door' });
  const expectedFallbackWood = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const expected = clamp(
    bounds,
    Math.min(
      2.5 + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
      2.9 + expectedFallbackWood / 2 - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM
    )
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({ App: app, hitDoorGroup: door, bounds, isBottomRegion: true }),
    expected,
    'invalid shell estimate falls back to material thickness'
  );
});

test('regular split-hover accepts a bounded shell-thickness estimate before material fallback', () => {
  const bounds = { minY: 0, maxY: 3 };
  const effectiveTopY = 2.97;
  const estimatedWood = 2 * (bounds.maxY - effectiveTopY);
  assert.ok(estimatedWood > CARCASS_SHELL_DIMENSIONS.boardMinDimensionM);
  assert.ok(estimatedWood < BASE_PLINTH_POLICY.heightM);
  const app = makeApp({
    config: { modulesConfiguration: [{}] },
    topGrid: {
      0: { effectiveBottomY: 2.5, effectiveTopY },
    },
  });
  const expected = clamp(
    bounds,
    Math.min(
      2.5 + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
      effectiveTopY + estimatedWood / 2 - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM
    )
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: app,
      hitDoorGroup: hit({ moduleIndex: 0, partId: 'module_0_door' }),
      bounds,
      isBottomRegion: true,
    }),
    expected,
    'bounded shell estimate is preserved'
  );
});

test('regular split-hover aggregates shoe and external drawers without changing malformed-count semantics', () => {
  const bounds = { minY: 0, maxY: 2 };
  const grid = { 0: { effectiveBottomY: 0.2, effectiveTopY: 1.8, woodThick: 0.02 } };
  const cases = [
    {
      config: { hasShoeDrawer: true, extDrawersCount: 2 },
      expectedConfig: { hasShoeDrawer: true, extDrawersCount: 2 },
    },
    {
      config: { hasShoeDrawer: true, extDrawersCount: 0 },
      expectedConfig: { hasShoeDrawer: true, extDrawersCount: 0 },
    },
    {
      config: { hasShoeDrawer: false, extDrawersCount: -3 },
      expectedConfig: { hasShoeDrawer: false, extDrawersCount: -3 },
    },
    {
      config: { hasShoeDrawer: false, extDrawersCount: 'not-a-number' },
      expectedConfig: { hasShoeDrawer: false, extDrawersCount: 'not-a-number' },
    },
    { config: {}, expectedConfig: {} },
  ];

  for (const { config, expectedConfig } of cases) {
    const app = makeApp({ config: { modulesConfiguration: [config] }, topGrid: grid });
    const total = drawerHeight(expectedConfig);
    const internalStart = 0.2 - total;
    const fullInternalHeight = 1.8 - internalStart;
    const expected = clamp(
      bounds,
      internalStart +
        (CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex * fullInternalHeight) /
          CARCASS_INTERIOR_GRID_POLICY.divisions
    );
    assertClose(
      __wp_getRegularSplitPreviewLineY({
        App: app,
        hitDoorGroup: hit({ moduleIndex: 0, partId: 'module_0_door' }),
        bounds,
        isBottomRegion: false,
      }),
      expected,
      `drawer aggregation parity for ${JSON.stringify(config)}`
    );
  }
});

test('bottom split adds the external-drawer top gap only for a positive drawer stack', () => {
  const bounds = { minY: 0, maxY: 2 };
  const grid = { 0: { effectiveBottomY: 0.2, effectiveTopY: 1.8, woodThick: 0.02 } };
  for (const config of [{}, { extDrawersCount: -1 }, { extDrawersCount: 1 }]) {
    const app = makeApp({ config: { modulesConfiguration: [config] }, topGrid: grid });
    const hasDrawers = drawerHeight(config) > 0;
    let expected = 0.2 + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
    if (hasDrawers) {
      expected +=
        EXTERNAL_DRAWER_FRONT_RENDER_POLICY.doorTopGapM + HINGED_DOOR_SPLIT_GEOMETRY_POLICY.splitGapM / 2;
    }
    expected = Math.max(
      expected,
      0.2 +
        (hasDrawers ? EXTERNAL_DRAWER_FRONT_RENDER_POLICY.doorTopGapM : 0) +
        HINGED_DOOR_SPLIT_GEOMETRY_POLICY.bottomClampOffsetM
    );
    expected = Math.min(expected, 1.8 + 0.02 / 2 - HINGED_DOOR_SPLIT_GEOMETRY_POLICY.topClampOffsetM);
    assertClose(
      __wp_getRegularSplitPreviewLineY({
        App: app,
        hitDoorGroup: hit({ moduleIndex: 0, partId: 'module_0_door' }),
        bounds,
        isBottomRegion: true,
      }),
      clamp(bounds, expected),
      `bottom drawer gap parity for ${JSON.stringify(config)}`
    );
  }
});

test('regular split-hover falls back to door bounds when the runtime internal height is too small', () => {
  const bounds = { minY: 0, maxY: 2 };
  const app = makeApp({
    config: { modulesConfiguration: [{}] },
    topGrid: { 0: { effectiveBottomY: 0.9, effectiveTopY: 1, woodThick: 0.02 } },
  });
  const expected = clamp(
    bounds,
    (CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex * 2) / CARCASS_INTERIOR_GRID_POLICY.divisions
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: app,
      hitDoorGroup: hit({ moduleIndex: 0, partId: 'module_0_door' }),
      bounds,
      isBottomRegion: false,
    }),
    expected,
    'insufficient runtime internal height uses the bounds-local grid ratio'
  );
});

test('split-hover reads bottom-stack runtime/config maps and Corner configuration best-effort', () => {
  const bounds = { minY: 0, maxY: 2 };
  const bottomConfig = { hasShoeDrawer: true, extDrawersCount: 1 };
  const bottomApp = makeApp({
    config: { stackSplitLowerModulesConfiguration: [bottomConfig] },
    topGrid: { 0: { effectiveBottomY: 0.1, effectiveTopY: 1.9, woodThick: 0.02 } },
    bottomGrid: { 0: { effectiveBottomY: 0.3, effectiveTopY: 1.7, woodThick: 0.02 } },
  });
  const total = drawerHeight(bottomConfig);
  const internalStart = 0.3 - total;
  const expectedBottomStack = clamp(
    bounds,
    internalStart +
      (CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex * (1.7 - internalStart)) /
        CARCASS_INTERIOR_GRID_POLICY.divisions
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: bottomApp,
      hitDoorGroup: hit({ moduleIndex: 0, __wpStack: 'bottom', partId: 'module_0_door' }),
      bounds,
      isBottomRegion: false,
    }),
    expectedBottomStack,
    'bottom stack uses the lower grid and lower module configuration'
  );

  const cornerConfig = { hasShoeDrawer: true, extDrawersCount: 1 };
  const cornerApp = makeApp({
    config: { cornerConfiguration: { modulesConfiguration: [cornerConfig] } },
    topGrid: { 'corner:0': { effectiveBottomY: 0.25, effectiveTopY: 1.75, woodThick: 0.02 } },
  });
  const cornerTotal = drawerHeight(cornerConfig);
  const cornerStart = 0.25 - cornerTotal;
  const expectedCorner = clamp(
    bounds,
    cornerStart +
      (CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex * (1.75 - cornerStart)) /
        CARCASS_INTERIOR_GRID_POLICY.divisions
  );
  assertClose(
    __wp_getRegularSplitPreviewLineY({
      App: cornerApp,
      hitDoorGroup: hit({ moduleIndex: 'corner:0', partId: 'corner_door' }),
      bounds,
      isBottomRegion: false,
    }),
    expectedCorner,
    'Corner configuration uses the same drawer aggregation semantics'
  );

  assert.doesNotThrow(() =>
    __wp_getRegularSplitPreviewLineY({
      App: makeApp(),
      hitDoorGroup: hit({ moduleIndex: 'corner:9', partId: 'corner_door' }),
      bounds,
      isBottomRegion: false,
    })
  );
});
