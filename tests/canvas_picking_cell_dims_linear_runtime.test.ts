import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCanvasLinearCellDoorCountFromSketch,
  handleCanvasCellDimsClick,
} from '../esm/native/services/canvas_picking_cell_dims_flow.ts';
import { handleCanvasLinearCellDimsClick } from '../esm/native/services/canvas_picking_cell_dims_linear.ts';
import { readLinearCellDimsTotals } from '../esm/native/services/canvas_picking_cell_dims_linear_context_modules.ts';
import { WARDROBE_LAYOUT_COMPARISON_POLICY } from '../esm/shared/dimensions/wardrobe_layout_comparison_policy.ts';
import { createManualLayoutSketchCellDoorCountHoverRecord } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_state.ts';
import { tryApplyManualLayoutSketchHoverClick } from '../esm/native/services/canvas_picking_manual_layout_sketch_click_hover_apply.ts';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createStore(state: Record<string, unknown>) {
  return {
    getState() {
      return state;
    },
    patch(patch: Record<string, unknown>) {
      Object.assign(state, patch);
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
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
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

test('linear cell-dims parses UI draft strings only at click ingress and rejects string runtime totals', () => {
  const totals = readLinearCellDimsTotals({
    isBottomStack: true,
    raw: {
      width: 160,
      height: 220,
      depth: 55,
      stackSplitLowerWidthManual: 'true',
      stackSplitLowerWidth: '120',
      stackSplitLowerHeight: '80',
      stackSplitLowerDepthManual: 'true',
      stackSplitLowerDepth: '45',
    },
  } as any);

  assert.deepEqual(totals, { totalW: 160, totalH: 220, totalD: 55 });

  const { App, state, calls } = createAppHarness();
  state.ui.raw.cellDimsWidth = '90';
  state.ui.raw.cellDimsHeight = '';
  state.ui.raw.cellDimsDepth = '';

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 1,
    foundPartId: null,
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.deepEqual(calls.snapshots[0].snapshot.modulesConfiguration[1].specialDims, {
    baseWidthCm: 80,
    widthCm: 90,
  });
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
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
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
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
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

test('linear cell-dims blocks height/depth special cells while legs-with-stage is active', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.baseType = 'legs';
  state.ui.baseLegPlatformMode = 'stage';

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
    applyW: null,
    applyH: 250,
    applyD: null,
    foundModuleIndex: 1,
  });

  assert.equal(calls.snapshots.length, 0);
  assert.equal(calls.uiPatches.length, 0);
  assert.equal(calls.builds.length, 0);
  assert.equal(calls.touches.length, 0);
  assert.equal(calls.toasts.length, 1);
  assert.match(calls.toasts[0]?.message || '', /רגליים ובמה/);
});

test('linear cell-dims still allows width special cells while legs-with-stage is active', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.baseType = 'legs';
  state.ui.baseLegPlatformMode = 'stage';

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
    applyW: 90,
    applyH: null,
    applyD: null,
    foundModuleIndex: 1,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.deepEqual(calls.snapshots[0].snapshot.modulesConfiguration[1].specialDims, {
    baseWidthCm: 80,
    widthCm: 90,
  });
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
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
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

test('linear cell-dims keeps structure controls in ui while ui.raw owns the canonical doors count', () => {
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
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
    applyW: 210,
    applyH: null,
    applyD: null,
    foundModuleIndex: 0,
  });

  assert.equal(calls.snapshots.length, 1);
  const snapshot = calls.snapshots[0].snapshot;
  assert.equal(snapshot.modulesConfiguration.length, 3);
  assert.deepEqual(
    snapshot.modulesConfiguration.map((entry: any) => entry.doors),
    [1, 1, 1]
  );
  assert.deepEqual(snapshot.modulesConfiguration[0].specialDims, {
    baseWidthCm: 100,
    widthCm: 210,
  });
});

test('cell door-count edit preserves 80-80 compartment widths while changing [2,2] to [1,2]', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.structureSelect = '[2,2]';
  state.ui.raw = { width: 160, height: 220, depth: 55, doors: 4 };
  state.config.modulesConfiguration = [{ doors: 2 }, { doors: 2 }];
  state.build.modulesStructure = [{ doors: 2 }, { doors: 2 }];

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
    applyW: null,
    applyH: null,
    applyD: null,
    cellDoorCount: 1,
    foundModuleIndex: 0,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.touches.length, 1);
  assert.equal(calls.uiPatches.length, 1);
  assert.deepEqual(calls.uiPatches[0].patch, {
    raw: { doors: 3 },
    structureSelect: '[1,2]',
  });

  const snapshot = calls.snapshots[0].snapshot;
  assert.equal(snapshot.isManualWidth, true);
  assert.equal(snapshot.width, undefined);
  assert.deepEqual(
    snapshot.modulesConfiguration.map((mod: any) => mod.doors),
    [1, 2]
  );
  assert.deepEqual(snapshot.modulesConfiguration[0].specialDims, {
    widthCm: 80,
    baseWidthCm: 53.33,
  });
  assert.deepEqual(snapshot.modulesConfiguration[1].specialDims, {
    widthCm: 80,
    baseWidthCm: 106.67,
  });
  assert.match(calls.toasts[0]?.message || '', /תא 1 הוגדר עם דלת אחת/);
});

test('cell door-count edit can apply a special width and door topology in one click', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.structureSelect = '[2,2]';
  state.ui.raw = { width: 160, height: 220, depth: 55, doors: 4 };
  state.config.modulesConfiguration = [{ doors: 2 }, { doors: 2 }];
  state.build.modulesStructure = [{ doors: 2 }, { doors: 2 }];

  handleCanvasLinearCellDimsClick({
    App,
    ui: state.ui,
    cfg: state.config,
    raw: state.ui.raw,
    autoWidthMatchToleranceCm: WARDROBE_LAYOUT_COMPARISON_POLICY.autoWidthMatchToleranceCm,
    applyW: 90,
    applyH: null,
    applyD: null,
    cellDoorCount: 1,
    foundModuleIndex: 0,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.touches.length, 1);
  assert.equal(calls.uiPatches.length, 2);
  assert.deepEqual(calls.uiPatches[0].patch, {
    raw: { doors: 3 },
    structureSelect: '[1,2]',
  });
  assert.deepEqual(calls.uiPatches[1].patch, { raw: { width: 170 } });

  const snapshot = calls.snapshots[0].snapshot;
  assert.equal(snapshot.isManualWidth, true);
  assert.equal(snapshot.width, 170);
  assert.deepEqual(
    snapshot.modulesConfiguration.map((mod: any) => mod.doors),
    [1, 2]
  );
  assert.deepEqual(snapshot.modulesConfiguration[0].specialDims, {
    baseWidthCm: 56.67,
    widthCm: 90,
  });
  assert.deepEqual(snapshot.modulesConfiguration[1].specialDims, {
    baseWidthCm: 113.33,
    widthCm: 80,
  });
});

test('cell-dims click ingress accepts a door-only edit from canonical mode opts', () => {
  const { App, state, calls } = createAppHarness();
  state.mode = { primary: 'cell_dims', opts: { cellDoorCount: 2 } };
  state.ui.structureSelect = '[1,1]';
  state.ui.raw = { width: 160, height: 220, depth: 55, doors: 2 };
  state.config.modulesConfiguration = [{ doors: 1 }, { doors: 1 }];
  state.build.modulesStructure = [{ doors: 1 }, { doors: 1 }];

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 1,
    foundPartId: null,
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.deepEqual(
    calls.snapshots[0].snapshot.modulesConfiguration.map((mod: any) => mod.doors),
    [1, 2]
  );
  assert.deepEqual(calls.uiPatches[0].patch, {
    raw: { doors: 3 },
    structureSelect: '[1,2]',
  });
});

test('sketch door-count adapter reuses the canonical linear cell-door mutation', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.structureSelect = '[2,2]';
  state.ui.raw = { width: 160, height: 220, depth: 55, doors: 4 };
  state.config.modulesConfiguration = [{ doors: 2 }, { doors: 2 }];
  state.build.modulesStructure = [{ doors: 2 }, { doors: 2 }];

  applyCanvasLinearCellDoorCountFromSketch({
    App,
    foundModuleIndex: 0,
    isBottomStack: false,
    doorCount: 1,
  });

  assert.equal(calls.snapshots.length, 1);
  assert.deepEqual(
    calls.snapshots[0].snapshot.modulesConfiguration.map((mod: any) => mod.doors),
    [1, 2]
  );
  assert.deepEqual(calls.uiPatches[0].patch, {
    raw: { doors: 3 },
    structureSelect: '[1,2]',
  });
  assert.equal(calls.snapshots[0].snapshot.modulesConfiguration[0].specialDims.widthCm, 80);
  assert.equal(calls.snapshots[0].snapshot.modulesConfiguration[1].specialDims.widthCm, 80);
});

test('manual sketch door hover click reaches the existing cell-door owner without a parallel config patch', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.structureSelect = '[1,1]';
  state.ui.raw = { width: 160, height: 220, depth: 55, doors: 2 };
  state.config.modulesConfiguration = [{ doors: 1 }, { doors: 1 }];
  state.build.modulesStructure = [{ doors: 1 }, { doors: 1 }];
  let cleared = 0;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App,
    __activeModuleKey: 1,
    __isBottomStack: false,
    topY: 2.2,
    bottomY: 0,
    __gridInfo: null,
    __hoverRec: createManualLayoutSketchCellDoorCountHoverRecord({
      host: { tool: 'sketch_box_double_door', moduleKey: 1, isBottom: false, ts: 1 },
      doorCount: 2,
    }),
    __hoverOk: true,
    __patchConfigForKey: () => {
      throw new Error('cell door count must use the canonical CELL_DIMS owner');
    },
    __wp_clearSketchHover: () => {
      cleared += 1;
    },
  });

  assert.equal(applied, true);
  assert.equal(cleared, 1);
  assert.equal(calls.snapshots.length, 1);
  assert.deepEqual(
    calls.snapshots[0].snapshot.modulesConfiguration.map((mod: any) => mod.doors),
    [1, 2]
  );
  assert.deepEqual(calls.uiPatches[0].patch, { raw: { doors: 3 }, structureSelect: '[1,2]' });
});

test('manual sketch door hover stores a per-leaf override for a partitioned regular module', () => {
  const { App, state, calls } = createAppHarness();
  state.ui.structureSelect = '[2]';
  state.ui.raw = { width: 160, height: 220, depth: 55, doors: 2 };
  state.config.modulesConfiguration = [
    {
      doors: 2,
      sketchExtras: {
        dividers: [{ id: 'v1', xNorm: 0.5, yNorm: 0.5, order: 1 }],
      },
    },
  ];
  state.build.modulesStructure = [{ doors: 2 }];
  let cleared = 0;
  let patchCalls = 0;

  const applied = tryApplyManualLayoutSketchHoverClick({
    App,
    __activeModuleKey: 0,
    __isBottomStack: false,
    topY: 2.2,
    bottomY: 0,
    __gridInfo: null,
    __hoverRec: createManualLayoutSketchCellDoorCountHoverRecord({
      host: { tool: 'sketch_box_double_door', moduleKey: 0, isBottom: false, ts: 2 },
      doorCount: 2,
      xNorm: 0.25,
      yNorm: 0.5,
      scopeOrder: 1,
    }),
    __hoverOk: true,
    __patchConfigForKey: (moduleKey: number, patchFn: (cfg: Record<string, unknown>) => void) => {
      patchCalls += 1;
      assert.equal(moduleKey, 0);
      patchFn(state.config.modulesConfiguration[0]);
      return true;
    },
    __wp_clearSketchHover: () => {
      cleared += 1;
    },
  });

  assert.equal(applied, true);
  assert.equal(cleared, 1);
  assert.equal(patchCalls, 1);
  assert.equal(calls.snapshots.length, 0, 'partitioned cell must not rewrite the module door topology');
  assert.equal(state.config.modulesConfiguration[0].doors, 2);
  const cellDoors = state.config.modulesConfiguration[0].sketchExtras.cellDoors;
  assert.equal(cellDoors.length, 1);
  assert.equal(cellDoors[0].count, 2);
  assert.equal(cellDoors[0].xNorm, 0.25);
  assert.equal(cellDoors[0].yNorm, 0.5);
  assert.equal(cellDoors[0].scopeOrder, 1);
});
