import test from 'node:test';
import assert from 'node:assert/strict';

import { runRebuildDrawerMeta } from '../esm/native/builder/bootstrap_drawer_meta.ts';
import {
  getDrawerRebuildIntentSnapshot,
  setDrawerRebuildIntent,
} from '../esm/native/runtime/doors_access.ts';

type Vec = { x: number; y: number; z: number };

function makePosition(initial: Vec) {
  return {
    ...initial,
    copy(next: Vec) {
      this.x = next.x;
      this.y = next.y;
      this.z = next.z;
    },
  };
}

function createApp(primaryMode: string, initialOpenId: string | number | null = null) {
  const state = {
    mode: { primary: primaryMode, opts: {} },
    runtime: { drawersOpenId: initialOpenId },
    ui: {},
    config: {},
    meta: {},
  };
  const drawer = {
    id: 'int_4',
    group: {
      position: makePosition({ x: 0, y: 0, z: 0 }),
      userData: {},
    },
    closed: { x: 0, y: 0, z: 0 },
    open: { x: 5, y: 0, z: 0 },
    isOpen: false,
    isInternal: true,
  };
  const otherDrawer = {
    id: 'int_8',
    group: {
      position: makePosition({ x: 8, y: 0, z: 0 }),
      userData: {},
    },
    closed: { x: 0, y: 0, z: 0 },
    open: { x: 8, y: 0, z: 0 },
    isOpen: true,
    isInternal: true,
  };
  const setOpenIdCalls: Array<string | number | null> = [];
  let wakeupCalls = 0;

  const App = {
    store: {
      getState: () => state,
      patch: () => undefined,
    },
    services: {
      drawer: {
        rebuildMeta: () => undefined,
      },
      tools: {
        getDrawersOpenId: () => state.runtime.drawersOpenId,
        setDrawersOpenId: (id: string | number | null) => {
          setOpenIdCalls.push(id);
          state.runtime.drawersOpenId = id;
        },
      },
      platform: {
        activity: {},
        ensureRenderLoop: () => {
          wakeupCalls += 1;
          return true;
        },
      },
    },
    render: {
      drawersArray: [drawer, otherDrawer],
    },
  };

  return {
    App: App as never,
    drawer,
    otherDrawer,
    setOpenIdCalls,
    state,
    getWakeupCalls: () => wakeupCalls,
  };
}

function captureDrawerRebuildSnapshot(App: never, state: ReturnType<typeof createApp>['state']) {
  return {
    primaryMode: state.mode.primary,
    forcedOpenDrawerId: state.runtime.drawersOpenId,
    intent: getDrawerRebuildIntentSnapshot(App),
  };
}

test('drawer rebuild intent marks the target drawer open without snapping while divider mode is active', () => {
  const { App, drawer, otherDrawer, setOpenIdCalls, state, getWakeupCalls } = createApp('divider', 'int_4');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App, captureDrawerRebuildSnapshot(App, state));

  assert.equal(drawer.isOpen, true);
  assert.equal(drawer.group.position.x, 0);
  assert.equal(otherDrawer.isOpen, false);
  assert.equal(otherDrawer.group.position.x, 8);
  assert.deepEqual(setOpenIdCalls, ['int_4']);
  assert.equal(state.runtime.drawersOpenId, 'int_4');
  assert.equal(getWakeupCalls(), 1);
});

test('stale drawer rebuild intent is consumed closed after leaving divider mode', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('none');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App, captureDrawerRebuildSnapshot(App, state));

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(state.runtime.drawersOpenId, null);
});

test('stale rebuild intent cannot reopen a previous drawer in a later divider session', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('divider');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App, captureDrawerRebuildSnapshot(App, state));

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(state.runtime.drawersOpenId, null);
});

test('stale rebuild intent does not clear a newer forced-open drawer selection', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('divider', 'int_8');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App, captureDrawerRebuildSnapshot(App, state));

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(state.runtime.drawersOpenId, 'int_8');
});

test('drawer rebuild intent can mark an external drawer open by divider alias after rebuild without snapping', () => {
  const { App, drawer, otherDrawer, setOpenIdCalls, state } = createApp('divider', 'div_ext_1_1');
  drawer.id = 'd1_draw_1';
  drawer.dividerKey = 'div_ext_1_1';
  drawer.isInternal = false;
  drawer.open = { x: 0, y: 0, z: 7 };
  otherDrawer.id = 'd1_draw_2';
  otherDrawer.dividerKey = 'div_ext_1_2';
  otherDrawer.isInternal = false;

  setDrawerRebuildIntent(App, 'div_ext_1_1');
  runRebuildDrawerMeta(App, captureDrawerRebuildSnapshot(App, state));

  assert.equal(drawer.isOpen, true);
  assert.equal(drawer.group.position.z, 0);
  assert.equal(otherDrawer.isOpen, false);
  assert.equal(otherDrawer.group.position.x, 8);
  assert.deepEqual(setOpenIdCalls, ['div_ext_1_1']);
  assert.equal(state.runtime.drawersOpenId, 'div_ext_1_1');
});

test('rapid rebuild finalization cannot consume a newer forced-open intent, including the same drawer id', () => {
  const { App, drawer, setOpenIdCalls, state, getWakeupCalls } = createApp('divider', 'int_4');

  setDrawerRebuildIntent(App, 'int_4');
  const staleSnapshot = captureDrawerRebuildSnapshot(App, state);
  setDrawerRebuildIntent(App, 'int_4');
  const currentSnapshot = captureDrawerRebuildSnapshot(App, state);

  runRebuildDrawerMeta(App, staleSnapshot);
  assert.equal(drawer.isOpen, false);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(getWakeupCalls(), 0);

  runRebuildDrawerMeta(App, currentSnapshot);
  assert.equal(drawer.isOpen, true);
  assert.deepEqual(setOpenIdCalls, ['int_4']);
  assert.equal(getWakeupCalls(), 1);
});

test('drawer rebuild finalization uses its captured mode instead of reading the live store mode', () => {
  const { App, drawer, state } = createApp('divider', 'int_4');

  setDrawerRebuildIntent(App, 'int_4');
  const snapshot = captureDrawerRebuildSnapshot(App, state);
  state.mode.primary = 'none';

  runRebuildDrawerMeta(App, snapshot);
  assert.equal(drawer.isOpen, true);
});
