import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasPaintClick } from '../esm/native/services/canvas_picking_paint_flow.ts';
import { applyGroupedOrCornerPaintTarget } from '../esm/native/services/canvas_picking_paint_flow_apply_targets.ts';
import { resolvePaintTargetKeys } from '../esm/native/services/canvas_picking_paint_targets.ts';
import {
  applyPaintPartMutation,
  resolveDirectPaintTargetKey,
  resolvePaintPartKey,
} from '../esm/native/services/canvas_picking_paint_flow_apply_special.ts';
import { resolveMirrorLayoutForPaintClick } from '../esm/native/services/canvas_picking_paint_flow_mirror.ts';
import {
  createPaintFlowMutableState,
  summarizePaintFlowChanges,
  type PaintFlowMutableState,
} from '../esm/native/services/canvas_picking_paint_flow_apply_state.ts';
import { buildMirrorLayoutFromHit } from '../esm/native/features/mirror_layout.ts';
import { isSpecialPart, getPaintSourceTag } from '../esm/native/services/canvas_picking_paint_flow_shared.ts';
import {
  resolveDoorStylePaintTargetKey,
  tryHandleDoorStyleOverridePaintClick,
} from '../esm/native/services/canvas_picking_paint_flow_apply_door_style.ts';
import { commitPaintFlowState } from '../esm/native/services/canvas_picking_paint_flow_apply_commit.ts';

function createApp(
  args: {
    ui?: Record<string, unknown>;
    config?: Record<string, unknown>;
    maps?: Record<string, Record<string, unknown>>;
    deps?: Record<string, unknown>;
    builderMaterials?: { applyMaterials?: () => unknown } | null;
  } = {}
): any {
  const state = {
    ui: { ...(args.ui || {}) },
    config: { ...(args.config || {}) },
    runtime: {},
    mode: {},
    meta: { version: 0, updatedAt: 0, dirty: false },
  };
  return {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    maps: {
      getMap(name: string) {
        return args.maps?.[name] || null;
      },
    },
    deps: { ...(args.deps || {}) },
    services: {
      builder: {
        materials: args.builderMaterials || null,
      },
    },
  };
}

class TestVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function createManualState(overrides: Partial<PaintFlowMutableState> = {}): PaintFlowMutableState {
  let colors = { ...(overrides.colors0 || {}) };
  let curtains = { ...(overrides.curtains0 || {}) };
  let special = { ...(overrides.special0 || {}) };
  let style = { ...(overrides.style0 || {}) };
  let mirrorLayout = { ...(overrides.mirror0 || {}) };
  return {
    App: overrides.App || createApp(),
    colors0: overrides.colors0 || {},
    curtains0: overrides.curtains0 || {},
    special0: overrides.special0 || {},
    style0: overrides.style0 || {},
    mirror0: overrides.mirror0 || {},
    get colors() {
      return colors;
    },
    get curtains() {
      return curtains;
    },
    get special() {
      return special;
    },
    get style() {
      return style;
    },
    get mirrorLayout() {
      return mirrorLayout;
    },
    ensureColors: () => colors,
    ensureCurtains: () => curtains,
    ensureSpecial: () => special,
    ensureStyle: () => style,
    ensureMirrorLayout: () => mirrorLayout,
  };
}

test('paint grouped/corner target applies the full scoped shell set for corner wing frame clicks', () => {
  const expected = {
    lower_corner_ceil: 'walnut',
    lower_corner_wing_side_left: 'walnut',
    lower_corner_wing_side_right: 'walnut',
    lower_corner_floor: 'walnut',
  };

  for (const foundPartId of [
    'corner_wing_ceil',
    'corner_cell_top_c2',
    'corner_floor_c2',
    'corner_floor_blind',
    'corner_wing_side_left',
    'corner_wing_side_right',
  ]) {
    const state = createManualState();
    const handled = applyGroupedOrCornerPaintTarget({
      state,
      foundPartId,
      activeStack: 'bottom',
      paintSelection: 'walnut',
    });

    assert.equal(handled, true, foundPartId);
    assert.deepEqual(state.colors, expected, foundPartId);
    assert.deepEqual(resolvePaintTargetKeys(foundPartId, 'bottom'), Object.keys(expected), foundPartId);
  }
});

test('paint grouped/corner target treats the pentagon floor, roof, and attach sides as one frame', () => {
  const expected = {
    corner_pent_ceil: 'walnut',
    corner_pent_floor: 'walnut',
    corner_pent_attach_main: 'walnut',
    corner_pent_attach_wing: 'walnut',
  };

  for (const foundPartId of Object.keys(expected)) {
    const state = createManualState();
    const handled = applyGroupedOrCornerPaintTarget({
      state,
      foundPartId,
      activeStack: 'top',
      paintSelection: 'walnut',
    });

    assert.equal(handled, true, foundPartId);
    assert.deepEqual(state.colors, expected, foundPartId);
    assert.deepEqual(resolvePaintTargetKeys(foundPartId, 'top'), Object.keys(expected), foundPartId);
  }
});

test('paint grouped/corner target scopes the pentagon frame to the lower stack', () => {
  const state = createManualState();
  const handled = applyGroupedOrCornerPaintTarget({
    state,
    foundPartId: 'corner_pent_attach_main',
    activeStack: 'bottom',
    paintSelection: 'walnut',
  });

  assert.equal(handled, true);
  assert.deepEqual(state.colors, {
    lower_corner_pent_ceil: 'walnut',
    lower_corner_pent_floor: 'walnut',
    lower_corner_pent_attach_main: 'walnut',
    lower_corner_pent_attach_wing: 'walnut',
  });
});

test('paint grouped/corner target keeps a unified stack-split corner wing frame as one outer shell', () => {
  const expected = {
    corner_ceil: 'walnut',
    corner_wing_side_left: 'walnut',
    corner_wing_side_right: 'walnut',
    lower_corner_wing_side_left: 'walnut',
    lower_corner_wing_side_right: 'walnut',
    lower_corner_floor: 'walnut',
  };
  const targetScope = { stackSplitUnifiedFrame: true };

  for (const [foundPartId, activeStack] of [
    ['corner_wing_side_left', 'bottom'],
    ['corner_wing_side_right', 'top'],
    ['corner_wing_ceil', 'top'],
    ['corner_floor', 'bottom'],
    ['corner_floor_c1', 'bottom'],
  ] as const) {
    const state = createManualState();
    const handled = applyGroupedOrCornerPaintTarget({
      state,
      foundPartId,
      activeStack,
      paintSelection: 'walnut',
      targetScope,
    });

    assert.equal(handled, true, `${activeStack}:${foundPartId}`);
    assert.deepEqual(state.colors, expected, `${activeStack}:${foundPartId}`);
    assert.deepEqual(
      resolvePaintTargetKeys(foundPartId, activeStack, targetScope),
      Object.keys(expected),
      `${activeStack}:${foundPartId}`
    );
  }

  for (const [foundPartId, activeStack] of [
    ['corner_wing_ceil', 'bottom'],
    ['corner_cell_top_c1', 'bottom'],
    ['corner_floor', 'top'],
    ['corner_floor_c1', 'top'],
  ] as const) {
    const state = createManualState();
    const handled = applyGroupedOrCornerPaintTarget({
      state,
      foundPartId,
      activeStack,
      paintSelection: 'walnut',
      targetScope,
    });

    assert.equal(handled, true, `${activeStack}:${foundPartId}`);
    assert.deepEqual(state.colors, {}, `${activeStack}:${foundPartId}`);
    assert.deepEqual(resolvePaintTargetKeys(foundPartId, activeStack, targetScope), []);
  }
});

test('paint grouped/corner target keeps a unified stack-split pentagon frame as one outer shell', () => {
  const expected = {
    corner_pent_ceil: 'walnut',
    corner_pent_attach_main: 'walnut',
    corner_pent_attach_wing: 'walnut',
    lower_corner_pent_attach_main: 'walnut',
    lower_corner_pent_attach_wing: 'walnut',
    lower_corner_pent_floor: 'walnut',
  };
  const targetScope = { stackSplitUnifiedFrame: true };

  for (const [foundPartId, activeStack] of [
    ['corner_pent_attach_main', 'bottom'],
    ['corner_pent_attach_wing', 'top'],
    ['corner_pent_ceil', 'top'],
    ['corner_pent_floor', 'bottom'],
  ] as const) {
    const state = createManualState();
    const handled = applyGroupedOrCornerPaintTarget({
      state,
      foundPartId,
      activeStack,
      paintSelection: 'walnut',
      targetScope,
    });

    assert.equal(handled, true, `${activeStack}:${foundPartId}`);
    assert.deepEqual(state.colors, expected, `${activeStack}:${foundPartId}`);
    assert.deepEqual(
      resolvePaintTargetKeys(foundPartId, activeStack, targetScope),
      Object.keys(expected),
      `${activeStack}:${foundPartId}`
    );
  }

  for (const [foundPartId, activeStack] of [
    ['corner_pent_ceil', 'bottom'],
    ['corner_pent_floor', 'top'],
  ] as const) {
    const state = createManualState();
    const handled = applyGroupedOrCornerPaintTarget({
      state,
      foundPartId,
      activeStack,
      paintSelection: 'walnut',
      targetScope,
    });

    assert.equal(handled, true, `${activeStack}:${foundPartId}`);
    assert.deepEqual(state.colors, {}, `${activeStack}:${foundPartId}`);
    assert.deepEqual(resolvePaintTargetKeys(foundPartId, activeStack, targetScope), []);
  }
});

test('paint click ignores corner back-panel hit ids because those meshes are not individual-color paint targets', () => {
  const App = createApp({
    maps: {
      individualColors: {},
      curtainMap: {},
      doorSpecialMap: {},
      mirrorLayoutMap: {},
    },
  });
  let applyPaintCalled = false;
  App.services.tools = { getPaintColor: () => 'walnut' };
  App.actions = {
    colors: {
      applyPaint() {
        applyPaintCalled = true;
      },
    },
  };

  const handled = tryHandleCanvasPaintClick({
    App,
    foundPartId: 'corner_wing_back_c0',
    activeStack: 'top',
    isPaintMode: true,
    primaryHitObject: null,
    doorHitObject: null,
    primaryHitPoint: null,
    doorHitPoint: null,
    hitIdentity: null,
  } as never);

  assert.equal(handled, false);
  assert.equal(applyPaintCalled, false);
});

test('paint click replaces glass with a one-sided mirror through the public paint route on the first click', () => {
  const applyPaintCalls: unknown[][] = [];
  const App = createApp({
    ui: { currentCurtainChoice: 'linen' },
    maps: {
      individualColors: {},
      curtainMap: { d12_full: 'linen' },
      doorSpecialMap: {
        d12_full: 'glass',
        '__wp_glass_previous_door_style__:d12_full': 'double_profile',
      },
      doorStyleMap: { d12_full: 'profile' },
      mirrorLayoutMap: {},
    },
  });
  App.services.tools = { getPaintColor: () => 'mirror' };
  App.actions = {
    history: {
      batch(cb: () => unknown) {
        return cb();
      },
    },
    colors: {
      applyPaint(...args: unknown[]) {
        applyPaintCalls.push(args);
      },
    },
  };

  const handled = tryHandleCanvasPaintClick({
    App,
    foundPartId: 'd12_full',
    effectiveDoorId: 'd12_full',
    activeStack: 'top',
    isPaintMode: true,
    hitIdentity: {
      targetKind: 'door',
      partId: 'd12_full',
      doorId: 'd12',
      drawerId: null,
      moduleIndex: null,
      moduleStack: null,
      surfaceId: 'door:d12:inside',
      faceSign: -1,
      faceSide: 'inside',
      splitPart: 'full',
      source: 'click',
    },
  } as never);

  assert.equal(handled, true);
  assert.equal(applyPaintCalls.length, 1);
  assert.deepEqual(applyPaintCalls[0]?.[1], {});
  assert.deepEqual(applyPaintCalls[0]?.[3], { d12_full: 'mirror' });
  assert.deepEqual(applyPaintCalls[0]?.[4], { d12_full: [{ faceSign: -1 }] });
  assert.deepEqual(applyPaintCalls[0]?.[5], { d12_full: 'double_profile' });
});

test('paint grouped target treats the stack-split lower carcass frame as one shell', () => {
  assert.deepEqual(resolvePaintTargetKeys('lower_body_ceil', 'bottom'), [
    'lower_body_left',
    'lower_body_right',
    'lower_body_ceil',
    'lower_body_floor',
  ]);

  const state = createManualState();
  const handled = applyGroupedOrCornerPaintTarget({
    state,
    foundPartId: 'lower_body_left',
    activeStack: 'bottom',
    paintSelection: 'walnut',
  });

  assert.equal(handled, true);
  assert.deepEqual(state.colors, {
    lower_body_left: 'walnut',
    lower_body_right: 'walnut',
    lower_body_ceil: 'walnut',
    lower_body_floor: 'walnut',
  });
  assert.equal(getPaintSourceTag('walnut', 'lower_body_left'), 'paint.apply:group');
});

test('paint special mutation removes only the matched mirror layout while preserving unrelated placements', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: { d1_left: 'mirror' },
    mirror0: {
      d1_left: [
        { widthCm: 50, heightCm: 70, centerXNorm: 0.45, faceSign: 1 },
        { widthCm: 40, heightCm: 40, centerXNorm: 0.7, centerYNorm: 0.6, faceSign: -1 },
      ],
    },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd1_left',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd1_left',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({ nextLayout: null, removeMatch: { index: 0 }, canApplyMirror: true }),
  });

  assert.equal(state.special.d1_left, 'mirror');
  assert.equal(state.curtains.d1_left, undefined);
  assert.deepEqual(state.mirrorLayout.d1_left, [
    { widthCm: 40, heightCm: 40, centerXNorm: 0.7, centerYNorm: 0.6, faceSign: -1 },
  ]);
});

test('paint special mutation applies a canonical full mirror on the first click even when no explicit layout payload is needed', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd3_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd3_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({ nextLayout: null, removeMatch: null, canApplyMirror: true }),
  });

  assert.equal(state.special.d3_full, 'mirror');
  assert.equal(state.curtains.d3_full, undefined);
  assert.equal(state.mirrorLayout.d3_full, undefined);
});

test('paint special mutation replaces glass with mirror on the first click and clears glass-only style state', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: {
      d3_full: 'glass',
      '__wp_glass_previous_door_style__:d3_full': '__wp_none__',
    },
    curtains0: { d3_full: 'linen' },
    style0: { d3_full: 'profile' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd3_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd3_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({ nextLayout: null, removeMatch: null, canApplyMirror: true }),
  });

  assert.equal(state.special.d3_full, 'mirror');
  assert.equal(state.special['__wp_glass_previous_door_style__:d3_full'], undefined);
  assert.equal(state.curtains.d3_full, undefined);
  assert.equal(state.style.d3_full, undefined);
  assert.equal(state.mirrorLayout.d3_full, undefined);
});

test('paint special mutation cancels full-door library glass without leaving base fallback glass', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'none' } }),
    special0: { d8: 'glass', d8_full: 'glass' },
    curtains0: { d8: 'none', d8_full: 'none' },
    style0: { d8_full: 'profile' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd8_full',
    paintSelection: 'glass',
    clickArgs: {
      App: state.App,
      foundPartId: 'd8_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.d8, undefined);
  assert.equal(state.special.d8_full, undefined);
  assert.equal(state.curtains.d8, undefined);
  assert.equal(state.curtains.d8_full, undefined);
  assert.equal(state.style.d8_full, undefined);
});

test('paint special mutation restores the pre-glass door style when glass is replaced by mirror', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: {
      d4_full: 'glass',
      '__wp_glass_previous_door_style__:d4_full': 'double_profile',
    },
    curtains0: { d4_full: 'linen' },
    style0: { d4_full: 'profile' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd4_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd4_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({ nextLayout: null, removeMatch: null, canApplyMirror: true }),
  });

  assert.equal(state.special.d4_full, 'mirror');
  assert.equal(state.special['__wp_glass_previous_door_style__:d4_full'], undefined);
  assert.equal(state.curtains.d4_full, undefined);
  assert.equal(state.style.d4_full, 'double_profile');
  assert.equal(state.mirrorLayout.d4_full, undefined);
});

test('paint special mutation replaces glass with a one-sided full mirror on the first click', () => {
  const outsideState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: {
      d10_full: 'glass',
      '__wp_glass_previous_door_style__:d10_full': 'profile',
    },
    curtains0: { d10_full: 'linen' },
    style0: { d10_full: 'double_profile' },
  });

  applyPaintPartMutation({
    state: outsideState,
    paintPartKey: 'd10_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: outsideState.App,
      foundPartId: 'd10_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(outsideState.special.d10_full, 'mirror');
  assert.equal(outsideState.curtains.d10_full, undefined);
  assert.equal(outsideState.style.d10_full, 'profile');
  assert.equal(outsideState.mirrorLayout.d10_full, undefined);

  const insideState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: {
      d11_full: 'glass',
      '__wp_glass_previous_door_style__:d11_full': 'double_profile',
    },
    curtains0: { d11_full: 'linen' },
    style0: { d11_full: 'profile' },
  });

  applyPaintPartMutation({
    state: insideState,
    paintPartKey: 'd11_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: insideState.App,
      foundPartId: 'd11_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: -1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(insideState.special.d11_full, 'mirror');
  assert.equal(insideState.curtains.d11_full, undefined);
  assert.equal(insideState.style.d11_full, 'double_profile');
  assert.deepEqual(insideState.mirrorLayout.d11_full, [{ faceSign: -1 }]);
});

test('paint special mutation treats chest drawer fronts like regular drawer fronts for mirror and glass', () => {
  const mirrorState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
  });

  applyPaintPartMutation({
    state: mirrorState,
    paintPartKey: 'chest_drawer_0',
    paintSelection: 'mirror',
    clickArgs: {
      App: mirrorState.App,
      foundPartId: 'chest_drawer_0',
      foundDrawerId: 'chest_drawer_0',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({ nextLayout: null, removeMatch: null, canApplyMirror: true }),
  });

  assert.equal(mirrorState.special.chest_drawer_0, 'mirror');
  assert.equal(mirrorState.colors.chest_drawer_0, undefined);

  const glassState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
  });

  applyPaintPartMutation({
    state: glassState,
    paintPartKey: 'chest_drawer_1',
    paintSelection: '__wp_glass_style__:double_profile',
    clickArgs: {
      App: glassState.App,
      foundPartId: 'chest_drawer_1',
      foundDrawerId: 'chest_drawer_1',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(glassState.special.chest_drawer_1, 'glass');
  assert.equal(glassState.curtains.chest_drawer_1, 'linen');
  assert.equal(glassState.style.chest_drawer_1, 'double_profile');
  assert.equal(glassState.colors.chest_drawer_1, undefined);
});

test('paint special mutation toggles off a canonical full mirror when the same mirror target is clicked again', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: { d3_full: 'mirror' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd3_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd3_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({ nextLayout: null, removeMatch: null, canApplyMirror: true }),
  });

  assert.equal(state.special.d3_full, undefined);
  assert.equal(state.curtains.d3_full, undefined);
  assert.equal(state.mirrorLayout.d3_full, undefined);
});

test('paint special mutation materializes an inherited full-door mirror before removing the clicked split segment', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: { d3_full: 'mirror' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd3_top',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd3_top',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d3_full, undefined);
  assert.equal(state.special.d3_top, undefined);
  assert.equal(state.special.d3_bot, 'mirror');
  assert.equal(state.mirrorLayout.d3_full, undefined);
});

test('paint special mutation materializes inherited corner full-door mirror before removing only the clicked segment', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: { corner_door_1_full: 'mirror' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'corner_door_1_bot',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'corner_door_1_bot',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.corner_door_1_full, undefined);
  assert.equal(state.special.corner_door_1_bot, undefined);
  assert.equal(state.special.corner_door_1_top, 'mirror');
});

test('paint special mutation materializes inherited free-box full-door mirror before removing only the clicked segment', () => {
  const partId = 'sketch_box_free_0_boxVisual_door_main';
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'linen' } }),
    special0: { [partId]: 'mirror' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: `${partId}_bot`,
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: `${partId}_bot`,
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special[partId], undefined);
  assert.equal(state.special[`${partId}_bot`], undefined);
  assert.equal(state.special[`${partId}_top`], 'mirror');
});

test('paint glass mutation defaults every clicked glass front to regular profile glass and supports explicit glass variants', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'none' } }),
    style0: { d5_full: 'double_profile' },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd5_full',
    paintSelection: 'glass',
    clickArgs: {
      App: state.App,
      foundPartId: 'd5_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.d5_full, 'glass');
  assert.equal(state.curtains.d5_full, 'none');
  assert.equal(state.style.d5_full, 'profile');

  applyPaintPartMutation({
    state,
    paintPartKey: 'd6_full',
    paintSelection: '__wp_glass_style__:double_profile',
    clickArgs: {
      App: state.App,
      foundPartId: 'd6_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.d6_full, 'glass');
  assert.equal(state.style.d6_full, 'double_profile');

  applyPaintPartMutation({
    state,
    paintPartKey: 'corner_c0_draw_1',
    paintSelection: 'glass',
    clickArgs: {
      App: state.App,
      foundPartId: 'corner_c0_draw_1',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.corner_c0_draw_1, 'glass');
  assert.equal(state.curtains.corner_c0_draw_1, 'none');
  assert.equal(state.style.corner_c0_draw_1, 'profile');

  applyPaintPartMutation({
    state,
    paintPartKey: 'hex_cell_2_diag_left',
    paintSelection: '__wp_glass_style__:flat',
    clickArgs: {
      App: state.App,
      foundPartId: 'hex_cell_2_diag_left',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.hex_cell_2_diag_left, 'glass');
  assert.equal(state.curtains.hex_cell_2_diag_left, 'none');
  assert.equal(state.style.hex_cell_2_diag_left, 'flat');

  applyPaintPartMutation({
    state,
    paintPartKey: 'lower_corner_hex_cell_c3_diag_right',
    paintSelection: '__wp_glass_style__:double_profile',
    clickArgs: {
      App: state.App,
      foundPartId: 'corner_hex_cell_c3_diag_right',
      activeStack: 'bottom',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.lower_corner_hex_cell_c3_diag_right, 'glass');
  assert.equal(state.style.lower_corner_hex_cell_c3_diag_right, 'double_profile');
});

test('paint glass mutation restores the exact previous door style override after removing glass', () => {
  const addState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'white' } }),
    style0: { d5_full: 'double_profile' },
  });

  applyPaintPartMutation({
    state: addState,
    paintPartKey: 'd5_full',
    paintSelection: 'glass',
    clickArgs: {
      App: addState.App,
      foundPartId: 'd5_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(addState.special.d5_full, 'glass');
  assert.equal(addState.curtains.d5_full, 'white');
  assert.equal(addState.style.d5_full, 'profile');

  const removeState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'white' } }),
    special0: { ...addState.special },
    curtains0: { ...addState.curtains },
    style0: { ...addState.style },
  });

  applyPaintPartMutation({
    state: removeState,
    paintPartKey: 'd5_full',
    paintSelection: 'glass',
    clickArgs: {
      App: removeState.App,
      foundPartId: 'd5_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.deepEqual(removeState.special, {});
  assert.equal(removeState.curtains.d5_full, undefined);
  assert.equal(removeState.style.d5_full, 'double_profile');
});

test('paint glass mutation materializes inherited full-door glass before removing the clicked split segment', () => {
  const addState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'white' } }),
    style0: { d8_full: 'double_profile' },
  });

  applyPaintPartMutation({
    state: addState,
    paintPartKey: 'd8_full',
    paintSelection: 'glass',
    clickArgs: {
      App: addState.App,
      foundPartId: 'd8_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  const removeState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'white' } }),
    special0: { ...addState.special },
    curtains0: { ...addState.curtains },
    style0: { ...addState.style },
  });

  applyPaintPartMutation({
    state: removeState,
    paintPartKey: 'd8_top',
    paintSelection: 'glass',
    clickArgs: {
      App: removeState.App,
      foundPartId: 'd8_top',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(removeState.special.d8_full, undefined);
  assert.equal(removeState.special.d8_top, undefined);
  assert.equal(removeState.special.d8_bot, 'glass');
  assert.equal(removeState.special['__wp_glass_previous_door_style__:d8_full'], undefined);
  assert.equal(removeState.special['__wp_glass_previous_door_style__:d8_bot'], 'double_profile');
  assert.equal(removeState.curtains.d8_full, undefined);
  assert.equal(removeState.curtains.d8_top, undefined);
  assert.equal(removeState.curtains.d8_bot, 'white');
  assert.equal(removeState.style.d8_full, undefined);
  assert.equal(removeState.style.d8_top, 'double_profile');
  assert.equal(removeState.style.d8_bot, 'profile');
});

test('paint glass mutation removes the temporary glass frame style when the door had no prior override', () => {
  const addState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'none' } }),
  });

  applyPaintPartMutation({
    state: addState,
    paintPartKey: 'd6_full',
    paintSelection: '__wp_glass_style__:double_profile',
    clickArgs: {
      App: addState.App,
      foundPartId: 'd6_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(addState.special.d6_full, 'glass');
  assert.equal(addState.style.d6_full, 'double_profile');

  const removeState = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'none' } }),
    special0: { ...addState.special },
    curtains0: { ...addState.curtains },
    style0: { ...addState.style },
  });

  applyPaintPartMutation({
    state: removeState,
    paintPartKey: 'd6_full',
    paintSelection: '__wp_glass_style__:double_profile',
    clickArgs: {
      App: removeState.App,
      foundPartId: 'd6_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.deepEqual(removeState.special, {});
  assert.equal(removeState.style.d6_full, undefined);
});

test('paint color mutation clears stale curtains but preserves mirror layouts for mirror-special doors', () => {
  const state = createManualState({
    special0: { d1_right: 'mirror' },
    curtains0: { d1_right: 'linen' },
    mirror0: {
      d1_right: [{ widthCm: 30, heightCm: 60 }],
    },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd1_right',
    paintSelection: 'oak',
    clickArgs: {
      App: state.App,
      foundPartId: 'd1_right',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.colors.d1_right, 'oak');
  assert.equal(state.curtains.d1_right, undefined);
  assert.deepEqual(state.mirrorLayout.d1_right, [{ widthCm: 30, heightCm: 60 }]);
});

test('paint color mutation materializes an inherited full-door color before removing the clicked split segment', () => {
  const state = createManualState({ colors0: { d7_full: 'oak' } });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd7_top',
    paintSelection: 'oak',
    clickArgs: {
      App: state.App,
      foundPartId: 'd7_top',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.colors.d7_full, undefined);
  assert.equal(state.colors.d7_top, undefined);
  assert.equal(state.colors.d7_bot, 'oak');
});

test('paint color mutation materializes inherited corner full-door color before removing only the clicked segment', () => {
  const state = createManualState({ colors0: { corner_door_1_full: 'oak' } });

  applyPaintPartMutation({
    state,
    paintPartKey: 'corner_door_1_bot',
    paintSelection: 'oak',
    clickArgs: {
      App: state.App,
      foundPartId: 'corner_door_1_bot',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.colors.corner_door_1_full, undefined);
  assert.equal(state.colors.corner_door_1_bot, undefined);
  assert.equal(state.colors.corner_door_1_top, 'oak');
});

test('paint color mutation materializes inherited free-box full-door color before removing only the clicked segment', () => {
  const partId = 'sketch_box_free_0_boxColor_door_main';
  const state = createManualState({ colors0: { [partId]: 'oak' } });

  applyPaintPartMutation({
    state,
    paintPartKey: `${partId}_bot`,
    paintSelection: 'oak',
    clickArgs: {
      App: state.App,
      foundPartId: `${partId}_bot`,
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.colors[partId], undefined);
  assert.equal(state.colors[`${partId}_bot`], undefined);
  assert.equal(state.colors[`${partId}_top`], 'oak');
});

test('paint color mutation writes a split-segment override without erasing the inherited full-door color', () => {
  const state = createManualState({ colors0: { d7_full: 'oak' } });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd7_top',
    paintSelection: 'walnut',
    clickArgs: {
      App: state.App,
      foundPartId: 'd7_top',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.colors.d7_full, 'oak');
  assert.equal(state.colors.d7_top, 'walnut');
});

test('paint flow summary enables no-build material refresh only for color-only diffs when live materials are available', () => {
  const App = createApp({
    maps: {
      individualColors: { body_left: 'white' },
      curtainMap: {},
      doorSpecialMap: {},
      mirrorLayoutMap: {},
    },
    builderMaterials: { applyMaterials: () => undefined },
  });
  const state = createPaintFlowMutableState(App as never);

  state.ensureColors().body_left = 'black';
  const summary = summarizePaintFlowChanges(state);

  assert.equal(summary.colorsChanged, true);
  assert.equal(summary.curtainsChanged, false);
  assert.equal(summary.specialChanged, false);
  assert.equal(summary.styleChanged, false);
  assert.equal(summary.mirrorLayoutChanged, false);
  assert.equal(summary.useNoBuildMaterialRefresh, true);
});

test('paint flow helpers resolve scoped door-style and paint-part keys without leaking raw corner ids', () => {
  assert.equal(
    resolveDoorStylePaintTargetKey({
      foundPartId: 'corner_door_left',
      effectiveDoorId: 'corner_door_left',
      foundDrawerId: null,
      activeStack: 'bottom',
    }),
    'lower_corner_door_left'
  );
  assert.equal(resolvePaintPartKey('corner_plinth_panel', 'bottom'), 'lower_corner_plinth_panel');
  assert.equal(
    resolveDirectPaintTargetKey({
      foundPartId: 'door_profile_inner_top',
      effectiveDoorId: 'd2_left',
      foundDrawerId: null,
      activeStack: 'top',
    }),
    'd2_left'
  );
  assert.equal(
    resolveDirectPaintTargetKey({
      foundPartId: 'drawer_front_inner_face',
      effectiveDoorId: null,
      foundDrawerId: 'sketch_ext_drawers_2_main_1',
      activeStack: 'top',
    }),
    'sketch_ext_drawers_2_main_1'
  );
  assert.equal(
    resolveDirectPaintTargetKey({
      foundPartId: 'sketch_box_free_alpha_door_sbdr_1',
      effectiveDoorId: 'sbdr_1',
      foundDrawerId: null,
      activeStack: 'top',
    }),
    'sketch_box_free_alpha_door_sbdr_1'
  );
});

test('door style paint click clears full-door library glass aliases before applying post style', () => {
  const writtenMaps: Record<string, Record<string, unknown>> = {};
  const App = createApp({
    maps: {
      doorSpecialMap: { d9: 'glass', d9_full: 'glass' },
      curtainMap: { d9: 'none', d9_full: 'none' },
      doorStyleMap: { d9_full: 'profile' },
      mirrorLayoutMap: {},
    },
  });
  App.actions = {
    history: {
      batch(cb: () => unknown) {
        return cb();
      },
    },
    config: {
      setMap(name: string, next: Record<string, unknown>) {
        writtenMaps[name] = { ...next };
        return next;
      },
    },
  };

  const handled = tryHandleDoorStyleOverridePaintClick({
    App: App as never,
    foundPartId: 'd9_full',
    effectiveDoorId: 'd9_full',
    foundDrawerId: null,
    activeStack: 'top',
    paintSelection: '__wp_door_style__:flat',
    paintSource: 'paint.apply:doorStyle',
  });

  assert.equal(handled, true);
  assert.deepEqual(writtenMaps.doorSpecialMap, {});
  assert.deepEqual(writtenMaps.curtainMap, {});
  assert.deepEqual(writtenMaps.doorStyleMap, { d9_full: 'flat' });
});

test('door style paint click keeps requested profile when it clears existing glass', () => {
  const writtenMaps: Record<string, Record<string, unknown>> = {};
  const App = createApp({
    maps: {
      doorSpecialMap: { d10: 'glass', d10_full: 'glass' },
      curtainMap: { d10_full: 'none' },
      doorStyleMap: { d10_full: 'profile' },
      mirrorLayoutMap: {},
    },
  });
  App.actions = {
    history: {
      batch(cb: () => unknown) {
        return cb();
      },
    },
    config: {
      setMap(name: string, next: Record<string, unknown>) {
        writtenMaps[name] = { ...next };
        return next;
      },
    },
  };

  const handled = tryHandleDoorStyleOverridePaintClick({
    App: App as never,
    foundPartId: 'd10_full',
    effectiveDoorId: 'd10_full',
    foundDrawerId: null,
    activeStack: 'top',
    paintSelection: '__wp_door_style__:profile',
    paintSource: 'paint.apply:doorStyle',
  });

  assert.equal(handled, true);
  assert.deepEqual(writtenMaps.doorSpecialMap, {});
  assert.equal(
    writtenMaps.doorStyleMap,
    undefined,
    'the existing requested profile style should remain untouched while glass is cleared'
  );
});

test('door style paint click materializes an inherited full-door style before removing the clicked split segment', () => {
  const writtenMaps: Record<string, unknown>[] = [];
  const App = createApp({
    maps: {
      doorStyleMap: { d9_full: 'profile' },
    },
  });
  App.actions = {
    history: {
      batch(cb: () => unknown) {
        return cb();
      },
    },
    config: {
      setMap(name: string, next: Record<string, unknown>) {
        if (name === 'doorStyleMap') writtenMaps.push({ ...next });
        return next;
      },
    },
  };

  const handled = tryHandleDoorStyleOverridePaintClick({
    App: App as never,
    foundPartId: 'd9_top',
    effectiveDoorId: 'd9_top',
    foundDrawerId: null,
    activeStack: 'top',
    paintSelection: '__wp_door_style__:profile',
    paintSource: 'paint.apply:doorStyle',
  });

  assert.equal(handled, true);
  assert.deepEqual(writtenMaps[0], { d9_bot: 'profile' });
});

test('door style paint click materializes inherited free-box full-door style before removing only the clicked segment', () => {
  const partId = 'sketch_box_free_0_boxStyle_door_main';
  const writtenMaps: Record<string, unknown>[] = [];
  const App = createApp({
    maps: {
      doorStyleMap: { [partId]: 'profile' },
    },
  });
  App.actions = {
    history: {
      batch(cb: () => unknown) {
        return cb();
      },
    },
    config: {
      setMap(name: string, next: Record<string, unknown>) {
        if (name === 'doorStyleMap') writtenMaps.push({ ...next });
        return next;
      },
    },
  };

  const handled = tryHandleDoorStyleOverridePaintClick({
    App: App as never,
    foundPartId: `${partId}_bot`,
    effectiveDoorId: `${partId}_bot`,
    foundDrawerId: null,
    activeStack: 'top',
    paintSelection: '__wp_door_style__:profile',
    paintSource: 'paint.apply:doorStyle',
  });

  assert.equal(handled, true);
  assert.deepEqual(writtenMaps[0], { [`${partId}_top`]: 'profile' });
});

test('paint special target detection includes corner and sketch external drawer fronts so mirror/glass clicks rebuild as door specials', () => {
  assert.equal(isSpecialPart('corner_c0_draw_1'), true);
  assert.equal(isSpecialPart('corner_c1_draw_shoe'), true);
  assert.equal(isSpecialPart('lower_corner_c0_draw_2'), true);
  assert.equal(isSpecialPart('chest_drawer_0'), true);
  assert.equal(isSpecialPart('sketch_ext_drawers_2_main_1'), true);
  assert.equal(isSpecialPart('sketch_box_free_a_ext_drawers_3_1'), true);
  assert.equal(isSpecialPart('hex_cell_2_diag_left'), true);
  assert.equal(isSpecialPart('lower_hex_cell_2_diag_right'), true);
  assert.equal(isSpecialPart('corner_hex_cell_c3_diag_left'), true);
  assert.equal(isSpecialPart('lower_corner_hex_cell_c3_diag_right'), true);
});

test('mirror paint click resolves sized layouts against styled-center mirror metadata instead of the full door slab', () => {
  const App = createApp({
    ui: { currentMirrorDraftWidthCm: 20, currentMirrorDraftHeightCm: 40 },
    deps: {
      THREE: {
        Box3: class {},
        Vector3: TestVector3,
      },
    },
  });
  const mirrorOwner = {
    userData: {
      partId: 'd8_full',
      __mirrorRectMinX: -0.2,
      __mirrorRectMaxX: 0.2,
      __mirrorRectMinY: -0.6,
      __mirrorRectMaxY: 0.6,
    },
    worldToLocal(target: { x: number; y: number; z: number }) {
      return target;
    },
    parent: {
      userData: {
        partId: 'd8_full',
        __doorWidth: 1,
        __doorHeight: 2,
      },
      worldToLocal(target: { x: number; y: number; z: number }) {
        return target;
      },
    },
  };

  const result = resolveMirrorLayoutForPaintClick({
    App: App as never,
    foundPartId: 'd8_full',
    effectiveDoorId: 'd8_full',
    activeStack: 'top',
    isPaintMode: true,
    doorHitObject: mirrorOwner as never,
    doorHitPoint: { x: 0.16, y: 0.25, z: 0.1 } as never,
  });

  const expected = buildMirrorLayoutFromHit({
    rect: { minX: -0.2, maxX: 0.2, minY: -0.6, maxY: 0.6 },
    hitX: 0.16,
    hitY: 0.25,
    draft: { widthCm: 20, heightCm: 40 },
    faceSign: 1,
  });

  assert.deepEqual(result.nextLayout, expected);
});

test('mirror paint click removes an existing styled mirror through the wood center panel even when the raw hit lands on the shifted mirror mesh', () => {
  const App = createApp({
    ui: { currentMirrorDraftWidthCm: 20, currentMirrorDraftHeightCm: 40 },
    deps: {
      THREE: {
        Box3: class {},
        Vector3: TestVector3,
      },
    },
  });
  const layouts = [
    buildMirrorLayoutFromHit({
      rect: { minX: -0.2, maxX: 0.2, minY: -0.6, maxY: 0.6 },
      hitX: 0.16,
      hitY: 0.25,
      draft: { widthCm: 20, heightCm: 40 },
      faceSign: 1,
    }),
  ];
  const centerPanel = {
    userData: {
      partId: 'd8_full',
      __doorVisualRole: 'door_profile_center_panel',
      __mirrorRectMinX: -0.2,
      __mirrorRectMaxX: 0.2,
      __mirrorRectMinY: -0.6,
      __mirrorRectMaxY: 0.6,
    },
    worldToLocal(target: { x: number; y: number; z: number }) {
      return target;
    },
    parent: {
      userData: {
        partId: 'd8_full',
        __doorWidth: 1,
        __doorHeight: 2,
      },
      worldToLocal(target: { x: number; y: number; z: number }) {
        return target;
      },
    },
  };
  const shiftedMirrorMesh = {
    userData: {
      __doorVisualRole: 'door_mirror_center_panel',
      __wpMirrorSurface: true,
    },
    worldToLocal(target: { x: number; y: number; z: number }) {
      target.x -= 0.16;
      target.y -= 0.25;
      return target;
    },
    parent: centerPanel,
  };

  const result = resolveMirrorLayoutForPaintClick(
    {
      App: App as never,
      foundPartId: 'd8_full',
      effectiveDoorId: 'd8_full',
      activeStack: 'top',
      isPaintMode: true,
      doorHitObject: shiftedMirrorMesh as never,
      doorHitPoint: { x: 0.16, y: 0.25, z: 0.1 } as never,
    },
    layouts as never
  );

  assert.equal(result.removeMatch?.index, 0);
  assert.deepEqual(result.nextLayout, layouts[0]);
});

test('mirror paint click treats blank mirror dimensions as a full-door mirror instead of storing an off-center layout', () => {
  const App = createApp({
    ui: { currentMirrorDraftWidthCm: '', currentMirrorDraftHeightCm: '' },
    deps: {
      THREE: {
        Box3: class {},
        Vector3: TestVector3,
      },
    },
  });
  const doorOwner = {
    userData: {
      partId: 'd9_full',
      __doorWidth: 1,
      __doorHeight: 2,
    },
    worldToLocal(target: { x: number; y: number; z: number }) {
      return target;
    },
  };

  const result = resolveMirrorLayoutForPaintClick({
    App: App as never,
    foundPartId: 'd9_full',
    effectiveDoorId: 'd9_full',
    activeStack: 'top',
    isPaintMode: true,
    doorHitObject: doorOwner as never,
    doorHitPoint: { x: 0.4, y: 0.7, z: 0.1 } as never,
  });

  assert.equal(result.canApplyMirror, true);
  assert.equal(result.removeMatch, null);
  assert.equal(result.nextLayout, null);
});

test('mirror paint click falls back to canonical hit identity for full-door face selection', () => {
  const App = createApp({
    ui: { currentMirrorDraftWidthCm: '', currentMirrorDraftHeightCm: '' },
  });

  const result = resolveMirrorLayoutForPaintClick({
    App: App as never,
    foundPartId: 'd9_full',
    effectiveDoorId: 'd9_full',
    activeStack: 'top',
    isPaintMode: true,
    hitIdentity: {
      targetKind: 'door',
      partId: 'd9_full',
      doorId: 'd9',
      drawerId: null,
      moduleIndex: null,
      moduleStack: null,
      surfaceId: 'door:d9:inside',
      faceSign: -1,
      faceSide: 'inside',
      splitPart: 'full',
      source: 'click',
    },
  });

  assert.equal(result.canApplyMirror, true);
  assert.equal(result.hitFaceSign, -1);
  assert.equal(result.isFullDoorMirror, true);
  assert.equal(result.removeMatch, null);
  assert.equal(result.nextLayout, null);
});

test('mirror paint click uses hit identity to remove an existing full-face mirror without geometry', () => {
  const App = createApp({
    ui: { currentMirrorDraftWidthCm: '', currentMirrorDraftHeightCm: '' },
  });

  const result = resolveMirrorLayoutForPaintClick(
    {
      App: App as never,
      foundPartId: 'd9_full',
      effectiveDoorId: 'd9_full',
      activeStack: 'top',
      isPaintMode: true,
      hitIdentity: {
        targetKind: 'door',
        partId: 'd9_full',
        doorId: 'd9',
        drawerId: null,
        moduleIndex: null,
        moduleStack: null,
        surfaceId: 'door:d9:inside',
        faceSign: -1,
        faceSide: 'inside',
        splitPart: 'full',
        source: 'click',
      },
    },
    [{ faceSign: -1 }, { faceSign: 1 }] as never
  );

  assert.equal(result.canApplyMirror, true);
  assert.equal(result.hitFaceSign, -1);
  assert.equal(result.isFullDoorMirror, true);
  assert.equal(result.removeMatch?.index, 0);
  assert.equal(result.nextLayout, null);
});

test('paint flow commit skips no-op writes and tags canonical source families for mirror/glass/group/corner/color clicks', () => {
  const noOpApp = createApp();
  const noOpState = createPaintFlowMutableState(noOpApp as never);
  const noOpSummary = commitPaintFlowState({
    App: noOpApp as never,
    state: noOpState,
    paintSource: 'paint.apply:color',
  });

  assert.equal(noOpSummary.didChange, false);
  assert.equal(getPaintSourceTag('mirror', 'd1_left'), 'paint.apply:mirror');
  assert.equal(getPaintSourceTag('glass', 'd1_left'), 'paint.apply:glass');
  assert.equal(getPaintSourceTag('oak', 'body_left'), 'paint.apply:group');
  assert.equal(getPaintSourceTag('oak', 'corner_left_side'), 'paint.apply:corner');
  assert.equal(getPaintSourceTag('oak', 'd1_left'), 'paint.apply:color');
});

test('paint flow commit uses no-build refresh only for color-only diffs and batches the canonical meta/source once', () => {
  const applyPaintCalls: unknown[] = [];
  const historyMeta: unknown[] = [];
  const renderCalls: boolean[] = [];
  let materialRefreshes = 0;
  const App = createApp({
    maps: {
      individualColors: { body_left: 'white' },
      curtainMap: {},
      doorSpecialMap: {},
      mirrorLayoutMap: {},
    },
    builderMaterials: {
      applyMaterials: () => {
        materialRefreshes += 1;
      },
    },
  });
  App.actions = {
    history: {
      batch(cb: () => unknown, meta?: unknown) {
        historyMeta.push(meta);
        return cb();
      },
    },
    colors: {
      applyPaint(
        colors: unknown,
        curtains: unknown,
        meta?: unknown,
        doorSpecialMap?: unknown,
        mirrorLayoutMap?: unknown
      ) {
        applyPaintCalls.push({ colors, curtains, meta, doorSpecialMap, mirrorLayoutMap });
      },
    },
  };
  App.platform = {
    triggerRender(updateShadows?: boolean) {
      renderCalls.push(!!updateShadows);
    },
  };

  const state = createPaintFlowMutableState(App as never);
  state.ensureColors().body_left = 'black';

  const summary = commitPaintFlowState({
    App: App as never,
    state,
    paintSource: 'paint.apply:group',
  });

  assert.equal(summary.didChange, true);
  assert.equal(summary.useNoBuildMaterialRefresh, true);
  assert.equal(materialRefreshes, 1);
  assert.deepEqual(renderCalls, [false]);
  assert.equal(historyMeta.length, 1);
  assert.deepEqual(historyMeta[0], { source: 'paint.apply:group', immediate: true });
  assert.equal(applyPaintCalls.length, 1);
  assert.deepEqual(applyPaintCalls[0], {
    colors: { body_left: 'black' },
    curtains: {},
    meta: { source: 'paint.apply:group', immediate: true, noBuild: true },
    doorSpecialMap: {},
    mirrorLayoutMap: {},
  });
});

test('paint special mutation stores a full-door inside mirror as a face-specific layout', () => {
  const state = createManualState();

  applyPaintPartMutation({
    state,
    paintPartKey: 'd5_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd5_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: -1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d5_full, 'mirror');
  assert.deepEqual(state.mirrorLayout.d5_full, [{ faceSign: -1 }]);
});

test('paint special mutation adds a full-door outside mirror without erasing an existing inside mirror', () => {
  const state = createManualState({
    special0: { d5_full: 'mirror' },
    mirror0: { d5_full: [{ faceSign: -1 }] },
  });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd5_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd5_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: 1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d5_full, 'mirror');
  assert.deepEqual(state.mirrorLayout.d5_full, [{ faceSign: -1 }, { faceSign: 1 }]);
});

test('paint special mutation preserves a legacy outside full mirror when adding a full-door inside mirror', () => {
  const state = createManualState({ special0: { d5_full: 'mirror' } });

  applyPaintPartMutation({
    state,
    paintPartKey: 'd5_full',
    paintSelection: 'mirror',
    clickArgs: {
      App: state.App,
      foundPartId: 'd5_full',
      activeStack: 'top',
      isPaintMode: true,
    },
    resolveMirrorLayout: () => ({
      nextLayout: null,
      removeMatch: null,
      canApplyMirror: true,
      hitFaceSign: -1,
      isFullDoorMirror: true,
    }),
  });

  assert.equal(state.special.d5_full, 'mirror');
  assert.deepEqual(state.mirrorLayout.d5_full, [{ faceSign: 1 }, { faceSign: -1 }]);
});
