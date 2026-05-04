import test from 'node:test';
import assert from 'node:assert/strict';

import { applyGroupedOrCornerPaintTarget } from '../esm/native/services/canvas_picking_paint_flow_apply_targets.ts';
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
import { resolveDoorStylePaintTargetKey } from '../esm/native/services/canvas_picking_paint_flow_apply_door_style.ts';
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

test('paint grouped/corner target applies the full scoped shell set for corner wing ceil clicks', () => {
  const state = createManualState();
  const handled = applyGroupedOrCornerPaintTarget({
    state,
    foundPartId: 'corner_wing_ceil',
    activeStack: 'bottom',
    paintSelection: 'walnut',
  });

  assert.equal(handled, true);
  assert.deepEqual(state.colors, {
    lower_corner_ceil: 'walnut',
    lower_corner_wing_side_left: 'walnut',
    lower_corner_wing_side_right: 'walnut',
    lower_corner_floor: 'walnut',
  });
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

test('paint glass mutation defaults every clicked glass front to regular profile glass and supports explicit glass variants', () => {
  const state = createManualState({
    App: createApp({ ui: { currentCurtainChoice: 'none' } }),
    style0: { d5_full: 'tom' },
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
    paintSelection: '__wp_glass_style__:tom',
    clickArgs: {
      App: state.App,
      foundPartId: 'd6_full',
      activeStack: 'top',
      isPaintMode: true,
    },
  });

  assert.equal(state.special.d6_full, 'glass');
  assert.equal(state.style.d6_full, 'tom');

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

test('paint special target detection includes corner and sketch external drawer fronts so mirror/glass clicks rebuild as door specials', () => {
  assert.equal(isSpecialPart('corner_c0_draw_1'), true);
  assert.equal(isSpecialPart('corner_c1_draw_shoe'), true);
  assert.equal(isSpecialPart('lower_corner_c0_draw_2'), true);
  assert.equal(isSpecialPart('sketch_ext_drawers_2_main_1'), true);
  assert.equal(isSpecialPart('sketch_box_free_a_ext_drawers_3_1'), true);
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
