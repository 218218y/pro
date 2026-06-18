import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasLayoutEditClick } from '../esm/native/services/canvas_picking_layout_edit_flow.ts';
import { tryHandleExternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_external.ts';
import { tryCommitSketchModuleStackTool } from '../esm/native/services/canvas_picking_sketch_module_stack_apply.ts';
import { commitSketchModuleBoxContent } from '../esm/native/services/canvas_picking_sketch_box_content_commit.ts';

type Toast = { message: string; type: string | undefined };

type GuardAppState = {
  config: Record<string, unknown>;
  ui?: Record<string, unknown>;
  removedDoorsMap?: Record<string, unknown>;
};

function createGuardApp(state: GuardAppState) {
  const toasts: Toast[] = [];
  const removedDoorsMap =
    state.removedDoorsMap || ((state.config.removedDoorsMap as Record<string, unknown> | undefined) ?? {});
  const App = {
    store: {
      getState() {
        return { config: state.config, ui: state.ui || {}, runtime: {}, mode: {}, meta: {} };
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
    hoverRec: {
      kind: 'box_content',
      contentKind: 'rod',
      boxId: 'box-1',
      op: 'add',
      boxYNorm: 0.5,
      tool: 'sketch_rod',
    },
    hoverHost: { tool: 'sketch_rod', moduleKey: 0, isBottom: false },
  });

  assert.equal(nextHover, null);
  assert.equal(box.rods, undefined);
  assertRemovedSideBuildToast(toasts);
});
