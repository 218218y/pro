import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleExternalDrawerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_external.ts';
import { tryCommitSketchBoxRegularExternalDrawersHover } from '../esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts';
import {
  SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE,
  applyShoeDrawerBaseAutoNoneIfNeeded,
} from '../esm/native/services/canvas_picking_shoe_drawer_base_auto_none.ts';

function createAppHarness(baseType = 'plinth') {
  const state: Record<string, any> = {
    ui: {
      baseType,
      currentExtDrawerType: 'shoe',
      currentExtDrawerCount: 1,
    },
    config: {},
    runtime: {},
    mode: {},
    meta: {},
  };
  const calls: {
    setBaseType: Array<{ value: string; meta: any }>;
    uiPatches: Array<{ patch: any; meta: any }>;
    toasts: Array<{ message: string; type?: string }>;
    modulePatches: Array<{ side: string; moduleKey: unknown; meta: any }>;
  } = {
    setBaseType: [],
    uiPatches: [],
    toasts: [],
    modulePatches: [],
  };
  const App = {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    render: {
      cache: {},
    },
    actions: {
      ui: {
        setBaseType(value: string, meta?: any) {
          calls.setBaseType.push({ value, meta });
          state.ui.baseType = value;
        },
        patch(patch: any, meta?: any) {
          calls.uiPatches.push({ patch, meta });
          Object.assign(state.ui, patch);
        },
      },
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: Record<string, unknown>) => void,
          meta?: any
        ) {
          calls.modulePatches.push({ side, moduleKey, meta });
          patcher(state.config);
        },
      },
    },
    services: {
      uiFeedback: {
        toast(message: string, type?: string) {
          calls.toasts.push({ message, type });
        },
      },
    },
  } as any;
  return { App, state, calls };
}

test('shoe drawer auto-base helper switches cabinet base to none and notifies once', () => {
  const { App, state, calls } = createAppHarness('legs');

  assert.equal(applyShoeDrawerBaseAutoNoneIfNeeded(App, 'test.shoe'), true);

  assert.equal(state.ui.baseType, 'none');
  assert.deepEqual(calls.setBaseType, [{ value: 'none', meta: { source: 'test.shoe', immediate: true } }]);
  assert.equal(calls.toasts.length, 1);
  assert.equal(calls.toasts[0]?.message, SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE);
  assert.equal(calls.toasts[0]?.type, 'info');

  assert.equal(applyShoeDrawerBaseAutoNoneIfNeeded(App, 'test.shoe.again'), false);
  assert.equal(calls.setBaseType.length, 1);
  assert.equal(calls.toasts.length, 1);
});

test('module shoe drawer click applies hasShoeDrawer and auto-selects base none', () => {
  const { App, state, calls } = createAppHarness('plinth');
  const patchCalls: any[] = [];

  const handled = tryHandleExternalDrawerModeClick({
    App,
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isExtDrawerEditMode: true,
    patchConfigForKey: (mk, patcher, meta) => {
      patchCalls.push({ mk, meta });
      patcher(state.config as never);
    },
  });

  assert.equal(handled, true);
  assert.equal(state.config.hasShoeDrawer, true);
  assert.equal(state.ui.baseType, 'none');
  assert.deepEqual(patchCalls[0], { mk: 1, meta: { source: 'extDrawers.toggle', immediate: true } });
  assert.equal(calls.setBaseType[0]?.value, 'none');
  assert.equal(calls.setBaseType[0]?.meta?.source, 'extDrawers.shoe:autoBaseNone');
  assert.equal(calls.toasts[0]?.message, SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE);
});

test('removing an existing module shoe drawer does not auto-change or notify base', () => {
  const { App, state, calls } = createAppHarness('legs');
  state.config.hasShoeDrawer = true;

  const handled = tryHandleExternalDrawerModeClick({
    App,
    foundModuleIndex: 1,
    activeModuleKey: 1,
    isExtDrawerEditMode: true,
    patchConfigForKey: (_mk, patcher) => patcher(state.config as never),
  });

  assert.equal(handled, true);
  assert.equal(state.config.hasShoeDrawer, false);
  assert.equal(state.ui.baseType, 'legs');
  assert.equal(calls.setBaseType.length, 0);
  assert.equal(calls.toasts.length, 0);
});

test('free-box regular external shoe drawer commit also auto-selects base none', () => {
  const { App, state, calls } = createAppHarness('plinth');
  state.config.sketchExtras = {
    boxes: [
      {
        id: 'free-shoe-box',
        freePlacement: true,
        absX: 0,
        absY: 1,
        widthM: 0.8,
        depthM: 0.4,
        heightM: 1,
        regularExtDrawers: [],
      },
    ],
  };
  App.render.cache.__lastSketchHover = {
    ts: Date.now(),
    tool: 'ext_drawers_regular_free_box',
    moduleKey: 2,
    isBottom: false,
    hostModuleKey: 2,
    hostIsBottom: false,
    kind: 'box_content',
    contentKind: 'regular_ext_drawers',
    freePlacement: true,
    boxId: 'free-shoe-box',
    op: 'add',
    contentXNorm: 0.5,
    boxYNorm: 0.5,
    boxBaseYNorm: 0,
    drawerCount: 0,
    hasShoeDrawer: true,
    drawerHeightM: 0.2,
  };

  const handled = tryCommitSketchBoxRegularExternalDrawersHover(App);

  assert.equal(handled, true);
  assert.equal(state.ui.baseType, 'none');
  assert.equal(calls.modulePatches[0]?.side, 'top');
  assert.equal(calls.modulePatches[0]?.moduleKey, 2);
  assert.equal(calls.setBaseType[0]?.meta?.source, 'extDrawers.freeBoxRegular.shoe:autoBaseNone');
  assert.equal(calls.toasts[0]?.message, SHOE_DRAWER_BASE_AUTO_NONE_MESSAGE);
  const boxes = (state.config.sketchExtras.boxes || []) as Array<Record<string, any>>;
  assert.equal(boxes[0]?.regularExtDrawers?.[0]?.hasShoeDrawer, true);
});
