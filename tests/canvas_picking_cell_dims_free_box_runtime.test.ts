import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCanvasCellDimsClick } from '../esm/native/services/canvas_picking_cell_dims_flow.ts';

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

function createFreeBoxHarness(boxOverrides: Record<string, unknown> = {}) {
  const freeBox: Record<string, unknown> = {
    id: 'free-1',
    freePlacement: true,
    absX: 0,
    absY: 1,
    widthM: 0.6,
    heightM: 0.8,
    depthM: 0.35,
    doors: [{ id: 'door-1', enabled: true }],
    ...boxOverrides,
  };
  const state = {
    ui: {
      raw: {
        width: 0,
        height: 0,
        depth: 0,
        doors: 0,
        cellDimsWidth: 80,
        cellDimsHeight: 90,
        cellDimsDepth: 40,
        cellDimsHexMode: false,
        cellDimsHexProtrusion: '',
        cellDimsHexDoorWidth: '',
      },
    },
    config: {
      modulesConfiguration: [
        {
          doors: 0,
          sketchExtras: {
            boxes: [freeBox],
          },
        },
      ],
    },
    runtime: {},
  } as Record<string, any>;

  const calls = {
    patches: [] as Array<{ side: string; moduleKey: unknown; meta: unknown }>,
    builds: [] as Array<{ uiOverride: unknown; meta: unknown }>,
    touches: [] as unknown[],
    toasts: [] as Array<{ message: string; sticky?: boolean }>,
    feedbackToasts: [] as Array<{ message: string; type?: string }>,
  };

  const App = {
    store: createStore(state),
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: Record<string, unknown>) => void,
          meta?: unknown
        ) {
          calls.patches.push({ side, moduleKey, meta: cloneJson(meta) });
          patcher(state.config.modulesConfiguration[0]);
        },
      },
      meta: {
        touch(meta?: unknown) {
          calls.touches.push(cloneJson(meta));
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
        },
        toast(message: string, type?: string) {
          calls.feedbackToasts.push({ message, type });
        },
      },
    },
  } as any;

  return { App, state, calls, freeBox };
}

test('[cell-dims/free-box] applies width height and depth to the clicked free-standing box only', () => {
  const { App, state, calls, freeBox } = createFreeBoxHarness();

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-1',
    hitUserData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
    },
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(calls.patches.length, 1);
  assert.deepEqual(calls.patches[0], {
    side: 'top',
    moduleKey: 0,
    meta: { source: 'cellDims.freeBox.apply', immediate: true },
  });
  assert.equal(freeBox.widthM, 0.8);
  assert.equal(freeBox.heightM, 0.9);
  assert.equal(freeBox.depthM, 0.4);
  assert.deepEqual(freeBox.specialDims, {
    baseWidthCm: 60,
    widthCm: 80,
    baseHeightCm: 80,
    heightCm: 90,
    baseDepthCm: 35,
    depthCm: 40,
  });
  assert.equal(state.config.modulesConfiguration[0].specialDims, undefined);
  // The structural write itself is immediate; store reactivity owns the build request.
  // This helper must not add a second explicit build/history refresh.
  assert.equal(calls.builds.length, 0);
  assert.equal(calls.touches.length, 0);
  assert.match(calls.toasts[0]?.message || '', /הוחלו מידות מיוחדות על הקופסא/);
});

test('[cell-dims/free-box] keeps a floor-aligned free-standing box above the room floor when height grows', () => {
  const { App, state, freeBox } = createFreeBoxHarness({
    absY: 0.406,
    heightM: 0.8,
  });
  state.ui.raw.cellDimsWidth = '';
  state.ui.raw.cellDimsDepth = '';
  state.ui.raw.cellDimsHeight = 90;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-1',
    hitUserData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
    },
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(freeBox.heightM, 0.9);
  assert.ok(
    Math.abs(Number(freeBox.absY) - 0.456) <= 1e-9,
    `expected the box bottom to stay on the workspace floor, got center ${freeBox.absY}`
  );
});

test('[cell-dims/free-box] moves stored free-box divider front pins with depth changes', () => {
  const { App, state, freeBox } = createFreeBoxHarness({
    depthM: 0.35,
    dividers: [{ id: 'v1', xNorm: 0.5, frontZ: 0.35 }],
    horizontalDividers: [{ id: 'h1', yNorm: 0.5, frontZ: 0.35 }],
  });
  state.ui.raw.cellDimsWidth = '';
  state.ui.raw.cellDimsHeight = '';
  state.ui.raw.cellDimsDepth = 40;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-1',
    hitUserData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
    },
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(freeBox.depthM, 0.4);
  assert.equal((freeBox.dividers as any[])[0].frontZ, 0.4);
  assert.equal((freeBox.horizontalDividers as any[])[0].frontZ, 0.4);
});

test('[cell-dims/free-box] applies and toggles hex-cell data on the clicked free-standing box', () => {
  const { App, state, calls, freeBox } = createFreeBoxHarness();
  state.ui.raw.cellDimsWidth = '';
  state.ui.raw.cellDimsHeight = '';
  state.ui.raw.cellDimsDepth = '';
  state.ui.raw.cellDimsHexMode = true;
  state.ui.raw.cellDimsHexProtrusion = 12;
  state.ui.raw.cellDimsHexDoorWidth = 50;

  const clickArgs = {
    App,
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-1_hex_diag_left',
    hitUserData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
    },
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  };

  handleCanvasCellDimsClick(clickArgs);

  assert.deepEqual(freeBox.hexCell, {
    enabled: true,
    protrusionCm: 12,
    doorWidthCm: 50,
  });
  assert.match(calls.toasts[0]?.message || '', /תא משושה/);

  handleCanvasCellDimsClick(clickArgs);

  assert.equal(freeBox.hexCell, undefined);
  assert.match(calls.toasts[1]?.message || '', /חזרה לתא רגיל/);
});

test('[cell-dims/free-box] blocks hex-cell conversion when the free-standing box has external drawers', () => {
  const { App, state, calls, freeBox } = createFreeBoxHarness({
    regularExtDrawers: [{ id: 'drawer-1', enabled: true }],
  });
  state.ui.raw.cellDimsWidth = '';
  state.ui.raw.cellDimsHeight = '';
  state.ui.raw.cellDimsDepth = '';
  state.ui.raw.cellDimsHexMode = true;

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-1',
    hitUserData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
    },
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(freeBox.hexCell, undefined);
  assert.equal(calls.toasts.length, 0);
  assert.equal(calls.feedbackToasts.length, 1);
  assert.match(calls.feedbackToasts[0]?.message || '', /אי אפשר לשנות תא עם מגירות/);
});

test('[cell-dims/free-box] applies from an internal drawer hit that only carries the free-box part id', () => {
  const { App, calls, freeBox } = createFreeBoxHarness({
    drawers: [{ id: 'fd1', yNormC: 0.5 }],
  });

  handleCanvasCellDimsClick({
    App,
    foundModuleIndex: 0,
    foundPartId: 'sketch_box_free_0_free-1_int_drawers_fd1_lower',
    hitUserData: {
      partId: 'sketch_box_free_0_free-1_int_drawers_fd1_lower',
      moduleIndex: 0,
    },
    isBottomStack: false,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(calls.patches.length, 1);
  assert.equal(freeBox.widthM, 0.8);
  assert.equal(freeBox.heightM, 0.9);
  assert.equal(freeBox.depthM, 0.4);
  assert.match(calls.toasts[0]?.message || '', /הוחלו מידות מיוחדות על הקופסא/);
});
