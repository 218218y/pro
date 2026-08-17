import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasLayoutEditClick } from '../esm/native/services/canvas_picking_layout_edit_flow.ts';
import { tryHandleExternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_external.ts';
import { tryCommitSketchModuleStackTool } from '../esm/native/services/canvas_picking_sketch_module_stack_apply.ts';
import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';
import { withSketchBoxContentCommand } from './_sketch_box_content_command_fixture.ts';
import { withSketchStructuralCommand } from './_sketch_structural_command_fixture.ts';

type Toast = { message: string; type: string | undefined };

type GuardAppState = {
  config: Record<string, unknown>;
  ui?: Record<string, unknown>;
  runtime?: Record<string, unknown>;
  runtimeCache?: Record<string, unknown>;
  removedDoorsMap?: Record<string, unknown>;
};

function createGuardApp(state: GuardAppState) {
  const toasts: Toast[] = [];
  const removedDoorsMap =
    state.removedDoorsMap || ((state.config.removedDoorsMap as Record<string, unknown> | undefined) ?? {});
  const App = {
    store: {
      getState() {
        return { config: state.config, ui: state.ui || {}, runtime: state.runtime || {}, mode: {}, meta: {} };
      },
      patch() {
        return undefined;
      },
    },
    maps: {
      getMap(name: string) {
        return name === 'removedDoorsMap' ? removedDoorsMap : {};
      },
    },
    services: {
      runtimeCache: state.runtimeCache || {},
      uiFeedback: {
        toast(message: string, type?: string) {
          toasts.push({ message, type });
        },
      },
    },
  } as any;
  return { App, toasts, removedDoorsMap };
}

function assertRemovedSideBuildToast(toasts: Toast[]) {
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /דופן שלו הוסרה/);
}

test('preset hanging layout is blocked when the target module has a removed frame side', () => {
  const config = {
    removedDoorsMap: { removed_body_left: true },
    modulesConfiguration: [{ layout: 'shelves' }],
  };
  const { App, toasts } = createGuardApp({ config, ui: { currentLayoutType: 'hanging_top2' } });
  let patched = false;

  assert.equal(
    tryHandleCanvasLayoutEditClick({
      App,
      foundModuleIndex: 0,
      __activeModuleKey: 0,
      __isBottomStack: false,
      __isLayoutEditMode: true,
      __isManualLayoutMode: false,
      __isBraceShelvesMode: false,
      moduleHitY: null,
      intersects: [],
      __patchConfigForKey(_mk: unknown, patchFn: (cfg: Record<string, unknown>) => void) {
        patched = true;
        patchFn((config.modulesConfiguration as Record<string, unknown>[])[0]);
      },
      __getActiveConfigRef() {
        return (config.modulesConfiguration as Record<string, unknown>[])[0];
      },
    } as never),
    true
  );

  assert.equal(patched, false);
  assert.equal((config.modulesConfiguration as Record<string, unknown>[])[0]?.layout, 'shelves');
  assertRemovedSideBuildToast(toasts);
});

test('regular external drawers are blocked when the target module has a removed frame side', () => {
  const moduleCfg: Record<string, unknown> = { layout: 'shelves', extDrawersCount: 0 };
  const config = {
    removedDoorsMap: { removed_body_right: true },
    modulesConfiguration: [moduleCfg],
  };
  const { App, toasts } = createGuardApp({
    config,
    ui: { currentExtDrawerType: 'regular', currentExtDrawerCount: 3 },
  });

  assert.equal(
    tryHandleExternalDrawerModeClick({
      App,
      foundModuleIndex: 0,
      activeModuleKey: 0,
      isBottomStack: false,
      isExtDrawerEditMode: true,
      patchConfigForKey(_mk: unknown, patchFn: (cfg: Record<string, unknown>) => void) {
        patchFn(moduleCfg);
      },
      intersects: [],
    } as never),
    true
  );

  assert.equal(moduleCfg.extDrawersCount, 0);
  assertRemovedSideBuildToast(toasts);
});

test('module sketch drawer stacks are blocked when the module frame side was removed', () => {
  const config = {
    removedDoorsMap: { removed_body_left: true },
    modulesConfiguration: [{ layout: 'shelves' }],
  };
  const cfg: Record<string, unknown> = { layout: 'shelves' };
  const { App, toasts } = createGuardApp({ config });
  const hoverWrites: unknown[] = [];

  assert.equal(
    tryCommitSketchModuleStackTool({
      App,
      cfg,
      tool: 'sketch_int_drawers',
      hoverOk: false,
      hoverRec: {},
      bottomY: 0,
      topY: 2,
      totalHeight: 2,
      pad: 0.02,
      woodThick: 0.017,
      hitYClamped: 1,
      hoverHost: { tool: 'sketch_int_drawers', moduleKey: 0, isBottom: false },
      writeSketchHover(_App: unknown, nextHover: unknown) {
        hoverWrites.push(nextHover);
      },
    }),
    true
  );

  assert.equal(cfg.sketchExtras, undefined);
  assert.deepEqual(hoverWrites, [null]);
  assertRemovedSideBuildToast(toasts);
});

test('sketch-box rod content is blocked when the same box side was removed', () => {
  const box: Record<string, unknown> = { id: 'box-1' };
  const cfg: Record<string, unknown> = { sketchExtras: { boxes: [box] } };
  const config = {
    removedDoorsMap: { 'removed_sketch_box_0_box-1_side_left': true },
    modulesConfiguration: [{ layout: 'shelves', sketchExtras: { boxes: [box] } }],
  };
  const { App, toasts } = createGuardApp({ config });

  const nextHover = commitSketchModuleBoxContent({
    App,
    cfg,
    box,
    boxId: 'box-1',
    contentKind: 'rod',
    hoverRec: withSketchStructuralCommand(
      {
        kind: 'add-rod',
        op: 'add',
        boxId: 'box-1',
        freePlacement: false,
        blockedReason: null,
        boxYNorm: 0.5,
        contentXNorm: 0.5,
      },
      { tool: 'sketch_rod', moduleKey: 0, isBottom: false }
    ),
    hoverHost: { tool: 'sketch_rod', moduleKey: 0, isBottom: false },
  });

  assert.equal(nextHover, null);
  assert.equal(box.rods, undefined);
  assertRemovedSideBuildToast(toasts);
});

test('drawer build is blocked with a clear toast when the room column cuts the target cell', () => {
  const cfg: Record<string, unknown> = { layout: 'shelves' };
  const roomArchitecture = {
    backWall: { enabled: true, widthCm: 200, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    column: {
      enabled: true,
      offsetLeftCm: 42.5,
      widthCm: 15,
      depthCm: 20,
      heightCm: 200,
      bottomOffsetCm: 0,
    },
    surfacesHidden: false,
  };
  const { App, toasts } = createGuardApp({
    config: { roomArchitecture, modulesConfiguration: [cfg] },
    runtime: { wardrobeWidthM: 1, wardrobeHeightM: 2, wardrobeDepthM: 0.6 },
    runtimeCache: {
      internalGridMap: {
        0: {
          effectiveBottomY: 0.02,
          effectiveTopY: 1.98,
          innerW: 0.96,
          internalCenterX: 0,
          internalDepth: 0.55,
          internalZ: 0,
          woodThick: 0.02,
          startY: 0,
        },
      },
    },
  });
  const hoverWrites: unknown[] = [];

  assert.equal(
    tryCommitSketchModuleStackTool({
      App,
      cfg,
      tool: 'sketch_int_drawers',
      hoverOk: false,
      hoverRec: {},
      bottomY: 0.02,
      topY: 1.98,
      totalHeight: 1.96,
      pad: 0.02,
      woodThick: 0.02,
      hitYClamped: 1,
      hoverHost: { tool: 'sketch_int_drawers', moduleKey: 0, isBottom: false },
      writeSketchHover(_App: unknown, nextHover: unknown) {
        hoverWrites.push(nextHover);
      },
    }),
    true
  );

  assert.equal(cfg.sketchExtras, undefined);
  assert.deepEqual(hoverWrites, [null]);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /העמוד חודר לתוך התא/);
});

test('free-box internal and external drawers are blocked when the room column cuts the free box itself', () => {
  const box: Record<string, unknown> = {
    id: 'free-column-box',
    freePlacement: true,
    absX: 0,
    absY: 1,
    widthM: 0.8,
    heightM: 1,
    depthM: 0.5,
  };
  const cfg: Record<string, unknown> = { sketchExtras: { boxes: [box] } };
  const roomArchitecture = {
    backWall: { enabled: true, widthCm: 240, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    column: {
      enabled: true,
      offsetLeftCm: 115,
      widthCm: 10,
      depthCm: 25,
      heightCm: 180,
      bottomOffsetCm: 10,
    },
    surfacesHidden: false,
  };
  const { App, toasts } = createGuardApp({
    config: { roomArchitecture, modulesConfiguration: [cfg] },
    runtime: { wardrobeWidthM: 2.4, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
    // Deliberately keep the host module clear of the center column. The guard
    // must use the free-box envelope, not the host module's grid cell.
    runtimeCache: {
      internalGridMap: {
        0: {
          effectiveBottomY: 0.02,
          effectiveTopY: 2.38,
          innerW: 0.5,
          internalCenterX: -0.9,
          internalDepth: 0.55,
          internalZ: 0,
        },
      },
    },
  });

  commitSketchModuleBoxContent({
    App,
    cfg,
    box,
    boxId: 'free-column-box',
    contentKind: 'drawers',
    hoverMode: 'free-toggle',
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 0, isBottom: false },
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'internal-drawers',
        boxId: 'free-column-box',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0.4,
        drawerHeightM: 0.18,
        drawerH: 0.18,
        stackH: 0.38,
        drawerGap: 0.02,
      }
    ),
  });

  commitSketchModuleBoxContent({
    App,
    cfg,
    box,
    boxId: 'free-column-box',
    contentKind: 'ext_drawers',
    hoverMode: 'free-toggle',
    hoverHost: { tool: 'sketch_ext_drawers:3', moduleKey: 0, isBottom: false },
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'sketch-external-drawers',
        boxId: 'free-column-box',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0.35,
        drawerHeightM: 0.2,
        drawerH: 0.2,
        stackH: 0.6,
        drawerCount: 3,
      }
    ),
  });

  commitSketchModuleBoxContent({
    App,
    cfg,
    box,
    boxId: 'free-column-box',
    contentKind: 'regular_ext_drawers',
    hoverMode: 'free-toggle',
    hoverHost: { tool: 'sketch_regular_ext_drawers:3', moduleKey: 0, isBottom: false },
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'regular-external-drawers',
        boxId: 'free-column-box',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0.35,
        drawerCount: 3,
        hasShoeDrawer: false,
        drawerHeightM: 0.2,
      }
    ),
  });

  assert.equal(box.drawers, undefined);
  assert.equal(box.extDrawers, undefined);
  assert.equal(toasts.length, 3);
  assert.ok(toasts.every(toast => toast.type === 'error'));
  assert.ok(toasts.every(toast => /העמוד חודר לתוך התא/.test(toast.message)));
});

test('free-box drawer guard follows builder ui.raw dimension fallback when runtime dimensions are not populated', () => {
  const box: Record<string, unknown> = {
    id: 'free-column-ui-raw',
    freePlacement: true,
    absX: 0,
    absY: 1,
    widthM: 0.8,
    heightM: 1,
    depthM: 0.5,
  };
  const cfg: Record<string, unknown> = { sketchExtras: { boxes: [box] } };
  const roomArchitecture = {
    backWall: { enabled: true, widthCm: 240, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    column: {
      enabled: true,
      offsetLeftCm: 115,
      widthCm: 10,
      depthCm: 25,
      heightCm: 180,
      bottomOffsetCm: 10,
    },
    surfacesHidden: false,
  };
  const { App, toasts } = createGuardApp({
    config: { roomArchitecture, modulesConfiguration: [cfg] },
    ui: { raw: { width: 240, height: 240, depth: 60 } },
    runtime: { wardrobeWidthM: null, wardrobeHeightM: null, wardrobeDepthM: null },
  });
  commitSketchModuleBoxContent({
    App,
    cfg,
    box,
    boxId: 'free-column-ui-raw',
    contentKind: 'drawers',
    hoverMode: 'free-toggle',
    hoverHost: { tool: 'sketch_int_drawers', moduleKey: 0, isBottom: false },
    hoverRec: withSketchBoxContentCommand(
      {},
      {
        kind: 'internal-drawers',
        boxId: 'free-column-ui-raw',
        freePlacement: true,
        blockedReason: null,
        op: 'add',
        removeId: null,
        contentXNorm: 0.5,
        boxYNorm: 0.5,
        boxBaseYNorm: 0.4,
        drawerHeightM: 0.18,
        drawerH: 0.18,
        stackH: 0.38,
        drawerGap: 0.02,
      }
    ),
  });

  assert.equal(box.drawers, undefined);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /העמוד חודר לתוך התא/);
});
