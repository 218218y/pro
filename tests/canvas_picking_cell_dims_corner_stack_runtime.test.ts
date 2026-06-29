import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCanvasCellDimsClick } from '../esm/native/services/canvas_picking_cell_dims_flow.ts';
import { resolveCornerWingMetrics } from '../esm/native/builder/corner_state_normalize_layout.ts';
import { deriveCornerWingCells } from '../esm/native/builder/corner_wing_extension_cells.ts';

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

function createCornerStackHarness() {
  const state = {
    ui: {
      cornerWidth: 160,
      cornerHeight: 220,
      cornerDepth: 55,
      cornerDoors: 4,
      cornerConnectorActive: true,
      raw: {
        width: 160,
        height: 220,
        depth: 55,
        doors: 2,
        cornerDoors: 4,
        stackSplitLowerHeight: 80,
        stackSplitLowerDepth: 55,
        stackSplitLowerWidth: 160,
        cellDimsWidth: 0,
        cellDimsHeight: 0,
        cellDimsDepth: 0,
      },
    },
    config: {
      wardrobeType: 'hinged',
      cornerConfiguration: {
        layout: 'shelves',
        modulesConfiguration: [{ topOnly: true }, { topOnly: true }],
        stackSplitLower: {
          layout: 'shelves',
          modulesConfiguration: [{ lowerOnly: true }, { lowerOnly: true }],
        },
      },
    },
    runtime: {},
    mode: {},
    meta: {},
    build: {},
  } as Record<string, any>;

  const calls = {
    cornerConfigurations: [] as Array<{ next: any; meta: any }>,
    uiPatches: [] as Array<{ patch: any; meta: any }>,
    touches: [] as any[],
    builds: [] as any[],
    toasts: [] as Array<{ message: string; sticky?: boolean }>,
    renders: [] as boolean[],
  };

  const App = {
    store: createStore(state),
    actions: {
      modules: {
        patchForStack(stack: 'top' | 'bottom', moduleKey: unknown, patch: unknown, meta?: unknown) {
          assert.equal(moduleKey, 'corner');
          const current = state.config.cornerConfiguration;
          const next =
            stack === 'bottom'
              ? { ...current, stackSplitLower: { ...current.stackSplitLower, ...(patch as object) } }
              : { ...current, ...(patch as object) };
          calls.cornerConfigurations.push({ next: cloneJson(next), meta: cloneJson(meta) });
          state.config.cornerConfiguration = cloneJson(next);
          return stack === 'bottom' ? next.stackSplitLower : next;
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

  const ensureTopCornerCellConfigRef = (cellIdx: number) => {
    const top = state.config.cornerConfiguration;
    while (top.modulesConfiguration.length <= cellIdx) top.modulesConfiguration.push({ topOnly: true });
    return top.modulesConfiguration[cellIdx];
  };

  const ensureLowerCornerCellConfigRef = (cellIdx: number) => {
    const lower = state.config.cornerConfiguration.stackSplitLower;
    while (lower.modulesConfiguration.length <= cellIdx) lower.modulesConfiguration.push({ lowerOnly: true });
    return lower.modulesConfiguration[cellIdx];
  };

  return { App, state, calls, ensureTopCornerCellConfigRef, ensureLowerCornerCellConfigRef };
}

test('corner lower-stack cell depth patches only stackSplitLower and ignores height draft', () => {
  const { App, state, calls, ensureLowerCornerCellConfigRef } = createCornerStackHarness();
  state.ui.raw.cellDimsDepth = 45;
  state.ui.raw.cellDimsHeight = 120;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: true,
    ensureCornerCellConfigRef: ensureLowerCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  assert.equal(calls.uiPatches.length, 0);
  assert.equal(calls.builds.length, 1);
  assert.equal(calls.toasts.length, 1);

  const nextCorner = calls.cornerConfigurations[0].next;
  assert.deepEqual(nextCorner.modulesConfiguration, [{ topOnly: true }, { topOnly: true }]);
  assert.equal(nextCorner.specialDims, undefined);

  const lowerCell = nextCorner.stackSplitLower.modulesConfiguration[1];
  assert.deepEqual(lowerCell.specialDims, {
    baseDepthCm: 55,
    depthCm: 45,
  });
  assert.equal(lowerCell.specialDims.heightCm, undefined);
  assert.equal(lowerCell.specialDims.baseHeightCm, undefined);
});

test('corner lower-stack cell width stays scoped to stackSplitLower and does not sync top UI width', () => {
  const { App, state, calls, ensureLowerCornerCellConfigRef } = createCornerStackHarness();
  state.ui.raw.cellDimsWidth = 90;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: true,
    ensureCornerCellConfigRef: ensureLowerCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  assert.equal(calls.uiPatches.length, 0);
  assert.equal(calls.builds.length, 1);

  const nextCorner = calls.cornerConfigurations[0].next;
  assert.deepEqual(nextCorner.modulesConfiguration, [{ topOnly: true }, { topOnly: true }]);
  assert.equal(nextCorner.specialDims, undefined);
  assert.deepEqual(nextCorner.stackSplitLower.specialDims, {
    baseWidthCm: 170,
    widthCm: 170,
  });
  assert.deepEqual(nextCorner.stackSplitLower.modulesConfiguration[0].specialDims, {
    baseWidthCm: 80,
    widthCm: 80,
  });
  assert.deepEqual(nextCorner.stackSplitLower.modulesConfiguration[1].specialDims, {
    baseWidthCm: 80,
    widthCm: 90,
  });
});

test('corner top-stack cell width does not mutate lower stack-split corner state', () => {
  const { App, state, calls, ensureTopCornerCellConfigRef } = createCornerStackHarness();
  state.ui.raw.cellDimsWidth = 90;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: false,
    ensureCornerCellConfigRef: ensureTopCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  assert.equal(calls.uiPatches.length, 1);
  assert.equal(calls.builds.length, 1);

  const nextCorner = calls.cornerConfigurations[0].next;
  assert.equal(nextCorner.stackSplitLower.modulesConfiguration.length, 2);
  assert.equal(nextCorner.stackSplitLower.modulesConfiguration[0].lowerOnly, true);
  assert.equal(nextCorner.stackSplitLower.modulesConfiguration[1].lowerOnly, true);
  assert.equal(nextCorner.stackSplitLower.modulesConfiguration[0].specialDims, undefined);
  assert.equal(nextCorner.stackSplitLower.modulesConfiguration[1].specialDims, undefined);
  assert.equal(nextCorner.stackSplitLower.specialDims, undefined);
  assert.deepEqual(calls.uiPatches[0].patch, { cornerWidth: 170, raw: { cornerWidth: 170 } });
});

test('corner lower-stack cell width toggles back on a second click', () => {
  const { App, state, calls, ensureLowerCornerCellConfigRef } = createCornerStackHarness();
  state.config.cornerConfiguration.stackSplitLower.specialDims = { baseWidthCm: 170, widthCm: 170 };
  state.config.cornerConfiguration.stackSplitLower.modulesConfiguration = [
    { lowerOnly: true, specialDims: { baseWidthCm: 80, widthCm: 80 } },
    { lowerOnly: true, specialDims: { baseWidthCm: 80, widthCm: 90 } },
  ];
  state.ui.raw.cellDimsWidth = 90;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: true,
    ensureCornerCellConfigRef: ensureLowerCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  assert.equal(calls.uiPatches.length, 0);
  assert.equal(calls.builds.length, 1);

  const lower = calls.cornerConfigurations[0].next.stackSplitLower;
  assert.deepEqual(lower.specialDims, { baseWidthCm: 160, widthCm: 160 });
  assert.equal(lower.modulesConfiguration[1].specialDims, undefined);
  assert.deepEqual(lower.modulesConfiguration[0].specialDims, { baseWidthCm: 80, widthCm: 80 });
  assert.match(calls.toasts[0]?.message || '', /בוטלה מידת רוחב/);
});

test('corner lower-stack cell width accepts 20cm without a 40cm clamp', () => {
  const { App, state, calls, ensureLowerCornerCellConfigRef } = createCornerStackHarness();
  state.ui.raw.cellDimsWidth = 20;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: true,
    ensureCornerCellConfigRef: ensureLowerCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  const lower = calls.cornerConfigurations[0].next.stackSplitLower;
  assert.deepEqual(lower.specialDims, { baseWidthCm: 100, widthCm: 100 });
  assert.deepEqual(lower.modulesConfiguration[1].specialDims, { baseWidthCm: 80, widthCm: 20 });
});

test('corner lower-stack default width follows the corner wing, not the linear lower width cache', () => {
  const { App, state, calls, ensureLowerCornerCellConfigRef } = createCornerStackHarness();
  state.ui.cornerWidth = 120;
  state.ui.cornerDoors = 3;
  state.ui.raw.cornerDoors = 3;
  state.ui.raw.stackSplitLowerWidth = 160;
  state.ui.raw.stackSplitLowerWidthManual = false;
  state.ui.raw.cellDimsWidth = 20;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: true,
    ensureCornerCellConfigRef: ensureLowerCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  assert.equal(calls.uiPatches.length, 0);
  const lower = calls.cornerConfigurations[0].next.stackSplitLower;
  assert.deepEqual(lower.specialDims, { baseWidthCm: 100, widthCm: 100 });
  assert.deepEqual(lower.modulesConfiguration[0].specialDims, { baseWidthCm: 80, widthCm: 80 });
  assert.deepEqual(lower.modulesConfiguration[1].specialDims, { baseWidthCm: 40, widthCm: 20 });
});

test('corner lower-stack default width does not inherit top per-cell width changes', () => {
  const { App, state, calls, ensureLowerCornerCellConfigRef } = createCornerStackHarness();
  state.ui.cornerWidth = 170;
  state.ui.cornerDoors = 3;
  state.ui.raw.cornerDoors = 3;
  state.ui.raw.stackSplitLowerWidth = 160;
  state.config.cornerConfiguration.specialDims = { baseWidthCm: 170, widthCm: 170 };
  state.ui.raw.cellDimsWidth = 20;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 'corner:1',
    foundPartId: 'corner_wing_cell_1',
    isBottomStack: true,
    ensureCornerCellConfigRef: ensureLowerCornerCellConfigRef,
  });

  assert.equal(calls.cornerConfigurations.length, 1);
  const lower = calls.cornerConfigurations[0].next.stackSplitLower;
  assert.deepEqual(lower.specialDims, { baseWidthCm: 100, widthCm: 100 });
  assert.deepEqual(lower.modulesConfiguration[0].specialDims, { baseWidthCm: 80, widthCm: 80 });
  assert.deepEqual(lower.modulesConfiguration[1].specialDims, { baseWidthCm: 40, widthCm: 20 });
});

test('corner lower-stack builder metrics link default width to the corner wing and keep lower depth', () => {
  const bottomDefault = resolveCornerWingMetrics({
    uiAny: {
      cornerWidth: 120,
      cornerDepth: 65,
      cornerDoors: 3,
      raw: { stackSplitLowerWidth: 160, stackSplitLowerDepth: 55 },
    },
    config: {},
    rootConfig: {},
    mainH: 0.8,
    mainD: 0.55,
    woodThick: 0.017,
    startY: 0,
    __stackKey: 'bottom',
    __stackSplitEnabled: true,
  } as any);

  assert.equal(bottomDefault.wingW, 1.2);
  assert.equal(bottomDefault.wingD, 0.55);

  const bottomTopSpecial = resolveCornerWingMetrics({
    uiAny: {
      cornerWidth: 170,
      cornerDepth: 65,
      cornerDoors: 3,
      raw: { stackSplitLowerWidth: 160, stackSplitLowerDepth: 55 },
    },
    config: {},
    rootConfig: { cornerConfiguration: { specialDims: { baseWidthCm: 170, widthCm: 170 } } },
    mainH: 0.8,
    mainD: 0.55,
    woodThick: 0.017,
    startY: 0,
    __stackKey: 'bottom',
    __stackSplitEnabled: true,
  } as any);

  assert.equal(bottomTopSpecial.wingW, 1.2);
  assert.equal(bottomTopSpecial.wingD, 0.55);

  const bottomOverride = resolveCornerWingMetrics({
    uiAny: {
      cornerWidth: 120,
      cornerDepth: 65,
      cornerDoors: 3,
      raw: { stackSplitLowerWidth: 160, stackSplitLowerDepth: 55 },
    },
    config: { specialDims: { widthCm: 100, depthCm: 45 } },
    rootConfig: {},
    mainH: 0.8,
    mainD: 0.55,
    woodThick: 0.017,
    startY: 0,
    __stackKey: 'bottom',
    __stackSplitEnabled: true,
  } as any);

  assert.equal(bottomOverride.wingW, 1);
  assert.equal(bottomOverride.wingD, 0.45);

  const top = resolveCornerWingMetrics({
    uiAny: {
      cornerWidth: 190,
      cornerDepth: 65,
      raw: { stackSplitLowerWidth: 160, stackSplitLowerDepth: 55 },
    },
    config: { specialDims: { widthCm: 170, depthCm: 45 } },
    rootConfig: { cornerConfiguration: { specialDims: { widthCm: 170, depthCm: 45 } } },
    mainH: 2.2,
    mainD: 0.55,
    woodThick: 0.017,
    startY: 0,
    __stackKey: 'top',
    __stackSplitEnabled: true,
  } as any);

  assert.equal(top.wingW, 1.9);
  assert.equal(top.wingD, 0.65);
});

test('corner lower-stack runtime metrics reject string-encoded dimensions', () => {
  const metrics = resolveCornerWingMetrics({
    uiAny: {
      cornerWidth: '180',
      cornerDepth: '65',
      raw: {
        stackSplitLowerDepth: '45',
      },
    },
    config: {
      specialDims: {
        widthCm: '100',
        depthCm: '45',
      },
    },
    rootConfig: {},
    mainH: 0.8,
    mainD: 0.55,
    woodThick: 0.018,
    startY: 0,
    __stackKey: 'bottom',
    __stackSplitEnabled: true,
  } as any);

  assert.equal(metrics.wingW, 1.2);
  assert.equal(metrics.wingD, 0.55);
});

test('corner lower-stack builder renders a 20cm stored special cell width', () => {
  const derived = deriveCornerWingCells({
    App: {},
    activeWidth: 1,
    blindWidth: 0,
    cabinetBodyHeight: 0.8,
    config: {
      modulesConfiguration: [
        { specialDims: { baseWidthCm: 80, widthCm: 80 } },
        { specialDims: { baseWidthCm: 40, widthCm: 20 } },
      ],
    },
    startY: 0,
    uiAny: { cornerDoors: 3 },
    wingD: 0.55,
    wingH: 0.8,
    woodThick: 0.017,
    __cfg: {},
    __mirrorX: 1,
    __stackKey: 'bottom',
    __stackSplitEnabled: true,
  } as any);

  assert.equal(derived.cornerCells.length, 2);
  assert.equal(Math.round(derived.cornerCells[0].width * 100), 80);
  assert.equal(Math.round(derived.cornerCells[1].width * 100), 20);
});

test('corner wing cell derivation ignores string cell width overrides from runtime config', () => {
  const derived = deriveCornerWingCells({
    App: {},
    activeWidth: 1,
    blindWidth: 0,
    cabinetBodyHeight: 1.8,
    config: {
      modulesConfiguration: [
        { specialDims: { baseWidthCm: 40, widthCm: '20' } },
        { specialDims: { widthCm: '30' } },
      ],
    },
    startY: 0,
    uiAny: { cornerDoors: 3 },
    wingD: 0.55,
    wingH: 1.8,
    woodThick: 0.018,
    __cfg: {},
    __mirrorX: 1,
    __stackKey: 'top',
    __stackSplitEnabled: false,
  } as any);

  assert.equal(derived.doorCount, 3);
  assert.deepEqual(
    derived.cornerCells.map(cell => Math.round(cell.width * 100)),
    [67, 33]
  );
});
