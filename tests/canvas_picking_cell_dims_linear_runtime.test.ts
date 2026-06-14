import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCanvasLinearCellDimsClick } from '../esm/native/services/canvas_picking_cell_dims_linear.ts';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createStore(state: Record<string, unknown>) {
  return {
    getState() {
      return state;
    },
  };
}

function createAppHarness() {
  const state = {
    ui: {
      doors: 0,
      isChestMode: false,
      singleDoorPos: 'left',
      raw: {
        width: 160,
        height: 220,
        depth: 55,
        doors: 0,
      },
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ doors: 1 }, { doors: 1 }],
    },
    runtime: {},
    mode: {},
    meta: {},
    build: {
      modulesStructure: [{ doors: 1 }, { doors: 1 }],
    },
  } as Record<string, any>;

  const calls = {
    snapshots: [] as Array<{ snapshot: any; meta: any }>,
    lowerModules: [] as Array<{ next: any; meta: any }>,
    uiPatches: [] as Array<{ patch: any; meta: any }>,
    touches: [] as any[],
    builds: [] as any[],
    toasts: [] as Array<{ message: string; sticky?: boolean }>,
    renders: [] as boolean[],
  };

  const App = {
    store: createStore(state),
    actions: {
      config: {
        applyModulesGeometrySnapshot(snapshot: unknown, meta?: unknown) {
          calls.snapshots.push({ snapshot: cloneJson(snapshot), meta: cloneJson(meta) });
          return snapshot;
        },
      },
      ui: {
        patchSoft(patch: unknown, meta?: unknown) {
          calls.uiPatches.push({ patch: cloneJson(patch), meta: cloneJson(meta) });
          return patch;
        },
      },
      meta: {
        touch(meta?: unknown) {
          calls.touches.push(cloneJson(meta));
          return meta;
        },
      },
      history: {
        batch<T>(fn: () => T, _meta?: unknown): T {
          return fn();
        },
      },
    },
    services: {
      builder: {
        requestBuild(uiOverride?: unknown, meta?: unknown) {
          calls.builds.push({ uiOverride: cloneJson(uiOverride), meta: cloneJson(meta) });
          return true;
        },
      },
      uiFeedback: {
        updateEditStateToast(message: string, sticky?: boolean) {
          calls.toasts.push({ message, sticky });
          return true;
        },
      },
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.renders.push(!!updateShadows);
        return true;
      },
    },
  } as any;

  return { App, state, calls };
}

test('linear cell-dims seam applies manual width through the canonical snapshot/ui/build surfaces', () => {
  const { App, calls } = createAppHarness();

  handleCanvasLinearCellDimsClick({
    App,
    ui: App.store.getState().ui,
    cfg: App.store.getState().config,
    raw: App.store.getState().ui.raw,
    applyW: 90,
    applyH: null,
    applyD: null,
    foundModuleIndex: 1,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.equal(calls.uiPatches.length, 1);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.renders.length, 1);
  assert.equal(calls.touches.length, 1);
  assert.equal(calls.toasts.length, 1);

  const snapshot = calls.snapshots[0].snapshot;
  assert.equal(snapshot.isManualWidth, true);
  assert.equal(snapshot.width, 170);
  assert.equal(snapshot.modulesConfiguration.length, 2);
  assert.equal(snapshot.modulesConfiguration[0].doors, 1);
  assert.equal(snapshot.modulesConfiguration[1].doors, 1);
  assert.deepEqual(snapshot.modulesConfiguration[1].specialDims, {
    baseWidthCm: 80,
    widthCm: 90,
  });

  assert.deepEqual(calls.uiPatches[0].patch, { raw: { width: 170 } });
  assert.deepEqual(calls.builds[0], {
    uiOverride: null,
    meta: { source: 'cellDims.apply', immediate: true, force: true, reason: 'cellDims.apply' },
  });
  assert.match(calls.toasts[0]?.message || '', /הוחל על תא 2/);
});

test('linear cell-dims seam promotes uniform height through the canonical snapshot and raw-ui patch path', () => {
  const { App, state, calls } = createAppHarness();
  state.config.modulesConfiguration = [
    { doors: 1, specialDims: { baseHeightCm: 220, heightCm: 250 } },
    { doors: 1 },
  ];

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    applyW: null,
    applyH: 250,
    applyD: null,
    foundModuleIndex: 1,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.equal(calls.uiPatches.length, 1);

  const snapshot = calls.snapshots[0].snapshot;
  assert.equal(snapshot.height, 250);
  assert.deepEqual(snapshot.modulesConfiguration, [{ doors: 1 }, { doors: 1 }]);
  assert.deepEqual(calls.uiPatches[0].patch, { raw: { height: 250 } });
});

test('linear cell-dims allows a 20cm width target instead of clamping to 40cm', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.doors = 2;
  state.ui.raw = {
    width: 160,
    height: 220,
    depth: 55,
    doors: 2,
  };
  state.config.modulesConfiguration = [{ doors: 2 }];
  state.build.modulesStructure = [{ doors: 2 }];

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    applyW: 20,
    applyH: null,
    applyD: null,
    foundModuleIndex: 0,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.equal(calls.snapshots[0].snapshot.width, 20);
  assert.deepEqual(calls.snapshots[0].snapshot.modulesConfiguration[0].specialDims, {
    baseWidthCm: 160,
    widthCm: 20,
  });
  assert.deepEqual(calls.uiPatches[0].patch, { raw: { width: 20 } });
});

test('linear cell-dims applies lower-stack width/depth through lower configuration and ignores height', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.doors = 2;
  state.ui.raw = {
    width: 160,
    height: 220,
    depth: 55,
    doors: 2,
    stackSplitLowerHeight: 80,
    stackSplitLowerWidth: 160,
    stackSplitLowerWidthManual: false,
    stackSplitLowerDepth: 55,
    stackSplitLowerDepthManual: false,
  };
  state.config.modulesConfiguration = [{ doors: 1 }, { doors: 1 }];
  state.config.stackSplitLowerModulesConfiguration = [{ doors: 1 }, { doors: 1 }];
  calls.lowerModules.length = 0;
  App.actions.config.setLowerModulesConfiguration = function setLowerModulesConfiguration(
    next: unknown,
    meta?: unknown
  ) {
    calls.lowerModules.push({ next: cloneJson(next), meta: cloneJson(meta) });
    state.config.stackSplitLowerModulesConfiguration = cloneJson(next);
    return next;
  };

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    isBottomStack: true,
    applyW: 90,
    applyH: 120,
    applyD: 50,
    foundModuleIndex: 1,
  });

  assert.equal(calls.snapshots.length, 0);
  assert.equal(calls.lowerModules.length, 1);
  assert.equal(calls.uiPatches.length, 1);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.toasts.length, 1);

  const lowerModules = calls.lowerModules[0].next;
  assert.equal(lowerModules.length, 2);
  assert.deepEqual(lowerModules[0], { doors: 1 });
  assert.deepEqual(lowerModules[1].specialDims, {
    baseDepthCm: 55,
    baseWidthCm: 80,
    depthCm: 50,
    widthCm: 90,
  });
  assert.equal(lowerModules[1].specialDims.heightCm, undefined);
  assert.equal(lowerModules[1].specialDims.baseHeightCm, undefined);

  assert.deepEqual(calls.uiPatches[0].patch, {
    raw: {
      stackSplitLowerWidth: 170,
      stackSplitLowerWidthManual: true,
    },
  });
  assert.match(calls.toasts[0]?.message || '', /הוחל על תא 2/);
});

test('linear cell-dims resolves hinged module signature from ui.raw before stale mirrored ui fields', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.doors = 3;
  state.ui.singleDoorPos = 'left';
  state.ui.structureSelect = '[1,1,1]';
  state.ui.raw = {
    width: 300,
    height: 220,
    depth: 55,
    doors: 3,
    singleDoorPos: 'right',
    structureSelect: '[2,1]',
  };
  state.config.wardrobeType = 'hinged';
  state.config.modulesConfiguration = [{ doors: 1 }, { doors: 1 }, { doors: 1 }];
  state.build.modulesStructure = [{ doors: 1 }, { doors: 1 }, { doors: 1 }];

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    applyW: 210,
    applyH: null,
    applyD: null,
    foundModuleIndex: 0,
  });

  assert.equal(calls.snapshots.length, 1);
  const snapshot = calls.snapshots[0].snapshot;
  assert.equal(snapshot.modulesConfiguration.length, 2);
  assert.deepEqual(
    snapshot.modulesConfiguration.map((entry: any) => entry.doors),
    [2, 1]
  );
  assert.deepEqual(snapshot.modulesConfiguration[0].specialDims, {
    baseWidthCm: 200,
    widthCm: 210,
  });
});
