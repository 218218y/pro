import test from 'node:test';
import assert from 'node:assert/strict';

import { resetAllEditModes, syncWardrobeState } from '../esm/native/services/edit_state.ts';
import { resetAllEditModesWithResult } from '../esm/native/services/edit_state_reset.ts';
import { syncWardrobeStateWithResult } from '../esm/native/services/edit_state_sync.ts';
import { syncDimensionRuntimePatch } from '../esm/native/runtime/dimension_sync_coalescer.ts';
import { createKernelEditStateSystem } from '../esm/native/kernel/kernel_edit_state_system.ts';
import { enterPrimaryMode as enterReactPrimaryMode } from '../esm/native/ui/react/actions/modes_actions.ts';
import { enterPrimaryModeImpl, exitPrimaryModeImpl } from '../esm/native/ui/modes_transition_policy.ts';
import { consumeDrawerRebuildIntent, setDrawerRebuildIntent } from '../esm/native/runtime/doors_access.ts';

function createAppForReset(primary = 'manual_layout') {
  const modePatches: Array<Record<string, unknown>> = [];
  const renders: boolean[] = [];
  const doorsActions: Array<[string, unknown?]> = [];
  const toolActions: Array<[string, unknown?]> = [];
  const notesActions: string[] = [];
  const editToastCalls: Array<[string | null, boolean]> = [];
  const bodyStyle: Record<string, string> = {};
  const doc = {
    body: { style: bodyStyle },
    createElement: () => ({ style: {}, appendChild() {}, classList: { add() {}, remove() {} } }),
    querySelector: () => null,
  };
  const state = {
    ui: {},
    config: {},
    runtime: { globalClickMode: true },
    mode: { primary, opts: {} as Record<string, unknown> },
    meta: {},
  };

  const App = {
    actions: {
      mode: {
        set(nextPrimary: string, opts: Record<string, unknown>) {
          state.mode.primary = nextPrimary;
          state.mode.opts = { ...(opts || {}) };
          modePatches.push({ primary: nextPrimary, opts: { ...(opts || {}) } });
        },
      },
    },
    services: {
      tools: {
        getDrawersOpenId: () => 'drawer-7',
        setDrawersOpenId: (id: unknown) => {
          toolActions.push(['setDrawersOpenId', id]);
        },
        setPaintColor: (color: unknown) => {
          toolActions.push(['setPaintColor', color]);
        },
        setInteriorManualTool: (tool: unknown) => {
          toolActions.push(['setInteriorManualTool', tool]);
        },
      },
      uiNotes: {
        exitScreenDrawMode: () => {
          notesActions.push('exitScreenDrawMode');
        },
      },
      uiFeedback: {
        updateEditStateToast: (message: string | null, sticky: boolean) => {
          editToastCalls.push([message, sticky]);
        },
      },
      doors: {
        setOpen: (open: boolean, meta?: unknown) => {
          doorsActions.push(['setOpen', { open, meta }]);
        },
        releaseEditHold: (opts?: unknown) => {
          doorsActions.push(['releaseEditHold', opts]);
        },
        closeDrawerById: (id: unknown) => {
          doorsActions.push(['closeDrawerById', id]);
        },
      },
      platform: {
        triggerRender: (updateShadows?: boolean) => {
          renders.push(!!updateShadows);
        },
      },
    },
    deps: {
      browser: {
        document: doc,
      },
    },
    store: {
      getState: () => state,
    },
  } as Record<string, unknown>;

  return { App, bodyStyle, doorsActions, editToastCalls, modePatches, notesActions, renders, toolActions };
}

function createAppForSync(uiOverride?: Record<string, unknown>) {
  const reports: Array<{ error: unknown; context: any }> = [];
  const runtimePatches: Array<{ patch: Record<string, unknown>; meta?: unknown }> = [];
  const ui = uiOverride || {
    raw: { width: 120, height: 240, depth: 60, doors: 4 },
  };

  const App = {
    services: {
      errors: {
        report(error: unknown, context: any) {
          reports.push({ error, context });
        },
      },
      platform: {
        getDimsM: () => ({ w: 1.2, h: 2.4, d: 0.6 }),
      },
      builder: {
        buildUi: { raw: {} as Record<string, unknown> },
      },
    },
    actions: {
      meta: {
        transient: (_meta?: unknown, source?: string) => ({ source, transient: true }),
      },
      runtime: {
        patch: (patch: Record<string, unknown>, meta?: unknown) => {
          runtimePatches.push({ patch, meta });
          return true;
        },
      },
    },
    store: {
      getState: () => ({
        ui,
        config: {},
        runtime: {},
        mode: {},
        meta: {},
      }),
    },
  } as Record<string, unknown>;

  return { App, reports, runtimePatches };
}

function createFakeTimers() {
  type FakeTimer = { callback: () => void; cleared: boolean };
  const timers: FakeTimer[] = [];
  return {
    setTimeout(callback: () => void) {
      const timer = { callback, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(handle: unknown) {
      if (handle && typeof handle === 'object') {
        (handle as FakeTimer).cleared = true;
      }
    },
    flush() {
      for (const timer of [...timers]) {
        if (timer.cleared) continue;
        timer.cleared = true;
        timer.callback();
      }
    },
  };
}

test('resetAllEditModes clears active interior tool state, edit chrome, and routes door closing through canonical services', () => {
  const { App, bodyStyle, modePatches, renders, doorsActions, toolActions, notesActions, editToastCalls } =
    createAppForReset();

  resetAllEditModes(App);

  assert.deepEqual(modePatches, [{ primary: 'none', opts: {} }]);
  assert.deepEqual(renders, [true]);
  assert.deepEqual(notesActions, ['exitScreenDrawMode']);
  assert.deepEqual(editToastCalls, [[null, false]]);
  assert.equal(bodyStyle.cursor, 'default');
  assert.deepEqual(toolActions, [
    ['setInteriorManualTool', null],
    ['setDrawersOpenId', null],
  ]);
  assert.equal(
    doorsActions.some(
      ([name, payload]) => name === 'setOpen' && (payload as { open: boolean }).open === false
    ),
    true
  );
});

test('resetAllEditModes clears stale drawer rebuild intent with drawer open selection', () => {
  const { App } = createAppForReset('divider');

  setDrawerRebuildIntent(App, 'drawer-7');
  resetAllEditModes(App);

  assert.equal(consumeDrawerRebuildIntent(App), null);
});

test('syncWardrobeState refreshes builder buildUi + runtime dims through canonical seams', () => {
  const { App, runtimePatches } = createAppForSync();

  syncWardrobeState(App);

  const buildUi = ((App.services as Record<string, unknown>).builder as Record<string, unknown>).buildUi as {
    width?: number;
    height?: number;
    depth?: number;
    doors?: number;
    raw: Record<string, unknown>;
  };

  assert.deepEqual(
    { width: buildUi.width, height: buildUi.height, depth: buildUi.depth, doors: buildUi.doors },
    { width: 120, height: 240, depth: 60, doors: 4 }
  );
  assert.deepEqual(buildUi.raw, { width: 120, height: 240, depth: 60, doors: 4 });

  assert.equal(runtimePatches.length >= 1, true);
  for (const entry of runtimePatches) {
    assert.deepEqual(entry, {
      patch: {
        wardrobeWidthM: 1.2,
        wardrobeHeightM: 2.4,
        wardrobeDepthM: 0.6,
        wardrobeDoorsCount: 4,
      },
      meta: { source: 'runtime:patch', transient: true },
    });
  }
});

test('syncWardrobeState ignores top-level-only door counts while preserving raw dimensions', () => {
  const { App, runtimePatches } = createAppForSync({
    doors: 9,
    raw: { width: 120, height: 240, depth: 60 },
  });

  syncWardrobeState(App);

  const buildUi = ((App.services as Record<string, unknown>).builder as Record<string, unknown>).buildUi as {
    width?: number;
    height?: number;
    depth?: number;
    doors?: number;
    raw: Record<string, unknown>;
  };

  assert.deepEqual(
    { width: buildUi.width, height: buildUi.height, depth: buildUi.depth, doors: buildUi.doors },
    { width: 120, height: 240, depth: 60, doors: undefined }
  );
  assert.deepEqual(buildUi.raw, { width: 120, height: 240, depth: 60 });
  assert.deepEqual(runtimePatches[0]?.patch, {
    wardrobeWidthM: 1.2,
    wardrobeHeightM: 2.4,
    wardrobeDepthM: 0.6,
  });
});

test('syncWardrobeState coalesces buildUi and runtime dims while a dimension input is active', () => {
  const { App, runtimePatches } = createAppForSync();
  const timers = createFakeTimers();

  Object.assign(App, {
    deps: {
      browser: {
        document: {
          activeElement: {
            getAttribute: (name: string) => (name === 'data-wp-active-id' ? 'width' : null),
          },
          createElement: () => ({}),
          querySelector: () => null,
        },
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
      },
    },
  });

  syncWardrobeState(App);

  const buildUi = ((App.services as Record<string, unknown>).builder as Record<string, unknown>).buildUi as {
    width?: number;
    height?: number;
    depth?: number;
    doors?: number;
    raw: Record<string, unknown>;
  };

  assert.deepEqual(
    { width: buildUi.width, height: buildUi.height, depth: buildUi.depth, doors: buildUi.doors },
    { width: undefined, height: undefined, depth: undefined, doors: undefined }
  );
  assert.deepEqual(buildUi.raw, {});
  assert.equal(runtimePatches.length, 0);

  timers.flush();

  assert.deepEqual(
    { width: buildUi.width, height: buildUi.height, depth: buildUi.depth, doors: buildUi.doors },
    { width: 120, height: 240, depth: 60, doors: 4 }
  );
  assert.deepEqual(buildUi.raw, { width: 120, height: 240, depth: 60, doors: 4 });
  assert.deepEqual(runtimePatches, [
    {
      patch: {
        wardrobeWidthM: 1.2,
        wardrobeHeightM: 2.4,
        wardrobeDepthM: 0.6,
        wardrobeDoorsCount: 4,
      },
      meta: { source: 'runtime:patch', transient: true },
    },
  ]);
});

test('resetAllEditModes reports a rejected required mutation, returns a failed result, and still completes independent cleanup', () => {
  const { App, notesActions, toolActions } = createAppForReset('manual_layout');
  const reports: Array<{ error: unknown; context: any }> = [];
  const app = App as any;
  app.services.errors = {
    report(error: unknown, context: any) {
      reports.push({ error, context });
    },
  };
  app.actions.mode.set = () => {
    throw new Error('mode writer rejected reset');
  };

  const result = resetAllEditModesWithResult(app);

  assert.equal(result.ok, false);
  assert.deepEqual(result.failedOps, ['mode.setPrimaryNone']);
  assert.deepEqual(notesActions, ['exitScreenDrawMode']);
  assert.ok(toolActions.some(([name]) => name === 'setInteriorManualTool'));
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.context?.where, 'native/services/edit_state');
  assert.equal(reports[0]?.context?.op, 'reset.mode.setPrimaryNone');
  assert.equal(reports[0]?.context?.fatal, false);
});

test('syncWardrobeState rolls builder mirrors back when the canonical runtime mutation is rejected', () => {
  const { App, reports, runtimePatches } = createAppForSync();
  const app = App as any;
  app.services.builder.buildUi = {
    width: 777,
    height: 888,
    depth: 999,
    doors: 2,
    raw: { width: 777, height: 888, depth: 999, doors: 2, keep: 'yes' },
  };
  app.actions.runtime.patch = (patch: Record<string, unknown>, meta?: unknown) => {
    runtimePatches.push({ patch, meta });
    return false;
  };

  assert.equal(syncWardrobeStateWithResult(app), false);
  assert.deepEqual(app.services.builder.buildUi, {
    width: 777,
    height: 888,
    depth: 999,
    doors: 2,
    raw: { width: 777, height: 888, depth: 999, doors: 2, keep: 'yes' },
  });
  assert.equal(runtimePatches.length, 1);
  assert.ok(
    reports.some(
      report =>
        report.context?.where === 'native/runtime/dimension_sync_coalescer' &&
        report.context?.op === 'runtimePatch.rejected'
    )
  );
  assert.ok(
    reports.some(
      report =>
        report.context?.where === 'native/services/edit_state' && report.context?.op === 'sync.runtime.apply'
    )
  );
});

test('syncWardrobeState falls through to an immediate coordinated commit when burst timer scheduling fails', () => {
  const { App, reports, runtimePatches } = createAppForSync();
  const app = App as any;
  app.deps = {
    browser: {
      document: {
        activeElement: {
          getAttribute: (name: string) => (name === 'data-wp-active-id' ? 'width' : null),
        },
        createElement: () => ({}),
        querySelector: () => null,
      },
      setTimeout() {
        throw new Error('edit-state timer unavailable');
      },
      clearTimeout() {},
    },
  };

  assert.equal(syncWardrobeStateWithResult(app), true);
  assert.equal(app.services.builder.buildUi.width, 120);
  assert.equal(runtimePatches.length, 1);
  assert.ok(reports.some(report => report.context?.op === 'sync.timer.schedule'));
});

test('dimension runtime coalescer reports rejected writes and immediately flushes when scheduling is unavailable', () => {
  const reports: Array<{ error: unknown; context: any }> = [];
  const patches: Record<string, unknown>[] = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, context: any) {
          reports.push({ error, context });
        },
      },
    },
    actions: {
      meta: {
        transient: (meta?: unknown) => meta || {},
      },
      runtime: {
        patch(patch: Record<string, unknown>) {
          patches.push(patch);
          return patches.length > 1;
        },
      },
    },
    deps: {
      browser: {
        setTimeout() {
          throw new Error('runtime sync timer unavailable');
        },
        clearTimeout() {},
      },
    },
  };
  const patch = {
    wardrobeWidthM: 1.2,
    wardrobeHeightM: 2.4,
    wardrobeDepthM: 0.6,
  };

  assert.deepEqual(syncDimensionRuntimePatch(App, patch), { scheduled: false, flushed: false });
  assert.deepEqual(syncDimensionRuntimePatch(App, patch, undefined, { activeId: 'width' }), {
    scheduled: false,
    flushed: true,
  });
  assert.equal(patches.length, 2);
  assert.ok(reports.some(report => report.context?.op === 'runtimePatch.rejected'));
  assert.ok(reports.some(report => report.context?.op === 'timer.schedule'));
});

test('React mode actions fail closed when edit-state reset is unavailable and publish a diagnostic', () => {
  const reports: Array<{ error: unknown; context: any }> = [];
  let modeWrites = 0;
  const App: any = {
    services: {
      errors: {
        report(error: unknown, context: any) {
          reports.push({ error, context });
        },
      },
    },
    actions: {
      mode: {
        set() {
          modeWrites += 1;
        },
      },
    },
  };

  enterReactPrimaryMode(App, 'paint', {});

  assert.equal(modeWrites, 0);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.context?.where, 'native/ui/react/actions/modes_actions');
  assert.equal(reports[0]?.context?.op, 'resetAllEditModes.rejected');
  assert.equal(reports[0]?.context?.fatal, false);
});

test('kernel edit-state apply stops before a new mode write when reset convergence is rejected', () => {
  const diagnostics: Array<{ op: string; error: unknown }> = [];
  let modeWrites = 0;
  const App: any = {
    services: {
      editState: {
        resetAllEditModes() {
          return false;
        },
      },
    },
    actions: {
      mode: {
        set() {
          modeWrites += 1;
        },
      },
    },
  };
  const system = createKernelEditStateSystem({
    App,
    reportNonFatal(op, error) {
      diagnostics.push({ op, error });
    },
  });

  system.applyEditState({ primary: 'paint', opts: { paintColor: '#fff' } });

  assert.equal(modeWrites, 0);
  assert.deepEqual(
    diagnostics.map(entry => entry.op),
    ['applyEditState.resetAllEditModes']
  );
});

test('native mode entry stops before door and chrome side effects when the canonical mode write is rejected', () => {
  const reports: Array<{ error: unknown; context: unknown }> = [];
  const doorOps: string[] = [];
  const toastOps: unknown[] = [];
  const bodyStyle: Record<string, string> = {};
  const App: any = {
    services: {
      errors: {
        report(error: unknown, context: unknown) {
          reports.push({ error, context });
        },
      },
      doors: {
        setOpen() {
          doorOps.push('setOpen');
          return true;
        },
      },
      uiFeedback: {
        updateEditStateToast(...args: unknown[]) {
          toastOps.push(args);
          return true;
        },
      },
    },
    actions: {
      mode: {
        set() {
          return false;
        },
      },
    },
    deps: {
      browser: {
        document: { body: { style: bodyStyle }, activeElement: null },
      },
    },
    store: {
      getState: () => ({
        ui: {},
        config: {},
        runtime: { globalClickMode: true },
        mode: { primary: 'none', opts: {} },
        meta: {},
      }),
    },
  };

  enterPrimaryModeImpl(App, 'paint', { openDoors: true, cursor: 'crosshair', toast: 'Paint' });

  assert.equal(reports.length, 1);
  assert.deepEqual(doorOps, []);
  assert.deepEqual(toastOps, []);
  assert.equal(bodyStyle.cursor, undefined);
});

test('native mode exit does not publish a false transition when both canonical exit and reset are rejected', () => {
  const reports: Array<{ error: unknown; context: unknown }> = [];
  const changes: Array<[string, string]> = [];
  const doorOps: string[] = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, context: unknown) {
          reports.push({ error, context });
        },
      },
      editState: {
        resetAllEditModes() {
          return false;
        },
      },
      doors: {
        setOpen() {
          doorOps.push('setOpen');
          return true;
        },
      },
    },
    actions: {
      mode: {
        set() {
          return false;
        },
      },
    },
    deps: {
      browser: {
        document: { body: { style: {} }, activeElement: null },
      },
    },
    store: {
      getState: () => ({
        ui: {},
        config: {},
        runtime: { globalClickMode: true },
        mode: { primary: 'paint', opts: {} },
        meta: {},
      }),
    },
  };

  exitPrimaryModeImpl(App, 'paint', {}, (_app, previous, next) => {
    changes.push([previous, next]);
  });

  assert.ok(reports.length >= 1);
  assert.deepEqual(changes, []);
  assert.deepEqual(doorOps, []);
});

test('native mode exit applies its UI cleanup when the expected mode was already cleared', () => {
  const uiPatches: Array<{ patch: Record<string, unknown>; meta: Record<string, unknown> | undefined }> = [];
  const modeWrites: Array<{ primary: string; opts: Record<string, unknown> }> = [];
  const state = {
    ui: {
      raw: { cellDimsHexMode: true },
      cellDimsPanelOpen: true,
      cellDimsHexPanelOpen: true,
    },
    config: {},
    runtime: { globalClickMode: true },
    mode: { primary: 'none', opts: {} as Record<string, unknown> },
    meta: {},
  };
  const App: any = {
    actions: {
      ui: {
        patch(patch: Record<string, unknown>, meta?: Record<string, unknown>) {
          const rawPatch = (patch.raw || {}) as Record<string, unknown>;
          state.ui = {
            ...state.ui,
            ...patch,
            raw: { ...state.ui.raw, ...rawPatch },
          };
          uiPatches.push({ patch, meta });
          return true;
        },
      },
      mode: {
        set(primary: string, opts: Record<string, unknown>) {
          modeWrites.push({ primary, opts });
          state.mode = { primary, opts };
          return true;
        },
      },
    },
    services: {
      doors: {
        setOpen() {
          return true;
        },
      },
    },
    deps: {
      browser: {
        document: { body: { style: {} }, activeElement: null },
      },
    },
    store: {
      getState: () => state,
    },
  };
  const changes: Array<[string, string]> = [];

  exitPrimaryModeImpl(
    App,
    'cell_dims',
    {
      source: 'test:cellDims:closeAfterReset',
      immediate: true,
      uiPatch: {
        cellDimsPanelOpen: false,
        cellDimsHexPanelOpen: false,
        raw: { cellDimsHexMode: false },
      },
    },
    (_app, previous, next) => {
      changes.push([previous, next]);
    }
  );

  assert.equal(state.mode.primary, 'none');
  assert.deepEqual(modeWrites, []);
  assert.deepEqual(changes, []);
  assert.equal(state.ui.cellDimsPanelOpen, false);
  assert.equal(state.ui.cellDimsHexPanelOpen, false);
  assert.equal(state.ui.raw.cellDimsHexMode, false);
  assert.deepEqual(uiPatches, [
    {
      patch: {
        cellDimsPanelOpen: false,
        cellDimsHexPanelOpen: false,
        raw: { cellDimsHexMode: false },
      },
      meta: {
        source: 'test:cellDims:closeAfterReset',
        noBuild: true,
        noHistory: true,
        noAutosave: true,
        noPersist: true,
        noCapture: true,
        immediate: true,
      },
    },
  ]);
});

test('leaving remove-door mode schedules a structural rebuild so temporary stack-split interaction frames can converge', () => {
  const timers = createFakeTimers();
  const buildRequests: Array<Record<string, unknown>> = [];
  const state = {
    ui: { removeDoorsEnabled: true },
    config: {},
    runtime: { globalClickMode: true },
    mode: { primary: 'remove_door', opts: {} as Record<string, unknown> },
    meta: {},
  };
  const App: any = {
    actions: {
      mode: {
        set(nextPrimary: string, opts: Record<string, unknown>) {
          state.mode.primary = nextPrimary;
          state.mode.opts = { ...(opts || {}) };
          return true;
        },
      },
    },
    services: {
      builder: {
        requestBuild(_uiOverride: unknown, meta: Record<string, unknown>) {
          buildRequests.push({ ...(meta || {}) });
          return true;
        },
      },
      platform: {
        triggerRender() {
          return true;
        },
      },
      uiFeedback: {
        updateEditStateToast() {
          return true;
        },
      },
    },
    deps: {
      browser: {
        document: { body: { style: {} }, activeElement: null },
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
      },
    },
    store: {
      getState: () => state,
    },
  };

  exitPrimaryModeImpl(App, 'remove_door', {}, () => undefined);

  assert.equal(state.mode.primary, 'none');
  assert.equal(buildRequests.length, 0);
  timers.flush();

  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0]?.source, 'ui.exitPrimaryMode:removeDoor');
  assert.equal(buildRequests[0]?.reason, 'removeDoor:restoreStackFrameTopology');
  assert.equal(buildRequests[0]?.immediate, true);
  assert.equal(buildRequests[0]?.force, true);
});

test('resetting edit state from remove-door mode schedules the same topology-convergence rebuild', () => {
  const { App } = createAppForReset('remove_door');
  const timers = createFakeTimers();
  const buildRequests: Array<Record<string, unknown>> = [];
  const app = App as any;

  app.deps.browser.setTimeout = timers.setTimeout;
  app.deps.browser.clearTimeout = timers.clearTimeout;
  app.services.builder = {
    requestBuild(_uiOverride: unknown, meta: Record<string, unknown>) {
      buildRequests.push({ ...(meta || {}) });
      return true;
    },
  };

  const result = resetAllEditModesWithResult(app);

  assert.equal(result.ok, true);
  assert.equal(buildRequests.length, 0);
  timers.flush();

  assert.equal(buildRequests.length, 1);
  assert.equal(buildRequests[0]?.source, 'services/edit_state:resetRemoveDoor');
  assert.equal(buildRequests[0]?.reason, 'removeDoor:restoreStackFrameTopology');
  assert.equal(buildRequests[0]?.immediate, true);
  assert.equal(buildRequests[0]?.force, true);
});
