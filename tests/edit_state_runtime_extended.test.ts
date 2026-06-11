import test from 'node:test';
import assert from 'node:assert/strict';

import { resetAllEditModes, syncWardrobeState } from '../esm/native/services/edit_state.ts';

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

  const App = {
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
      getState: () => ({
        ui: {},
        config: {},
        runtime: { globalClickMode: true },
        mode: { primary },
        meta: {},
      }),
      setModePatch: (patch: Record<string, unknown>) => {
        modePatches.push(patch);
      },
    },
  } as Record<string, unknown>;

  return { App, bodyStyle, doorsActions, editToastCalls, modePatches, notesActions, renders, toolActions };
}

function createAppForSync() {
  const runtimePatches: Array<{ patch: Record<string, unknown>; meta?: unknown }> = [];

  const App = {
    services: {
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
    },
    store: {
      getState: () => ({
        ui: {
          raw: { width: 120, height: 240, depth: 60, doors: 4 },
        },
        config: {},
        runtime: {},
        mode: {},
        meta: {},
      }),
      patch: (payload: Record<string, unknown>, meta?: unknown) => {
        runtimePatches.push({ patch: payload, meta });
        return true;
      },
    },
  } as Record<string, unknown>;

  return { App, runtimePatches };
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
        runtime: {
          wardrobeWidthM: 1.2,
          wardrobeHeightM: 2.4,
          wardrobeDepthM: 0.6,
          wardrobeDoorsCount: 4,
        },
      },
      meta: { source: 'runtime:patch', transient: true },
    });
  }
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
        runtime: {
          wardrobeWidthM: 1.2,
          wardrobeHeightM: 2.4,
          wardrobeDepthM: 0.6,
          wardrobeDoorsCount: 4,
        },
      },
      meta: { source: 'runtime:patch', transient: true },
    },
  ]);
});
