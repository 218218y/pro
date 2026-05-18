import test from 'node:test';
import assert from 'node:assert/strict';

import { runRebuildDrawerMeta } from '../esm/native/builder/bootstrap_drawer_meta.ts';
import { setDrawerRebuildIntent } from '../esm/native/runtime/doors_access.ts';

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
        ensureRenderLoop: () => true,
      },
    },
    render: {
      drawersArray: [drawer, otherDrawer],
    },
  };

  return { App: App as never, drawer, otherDrawer, setOpenIdCalls, state };
}

test('drawer rebuild intent keeps the target drawer open only while divider mode is active', () => {
  const { App, drawer, otherDrawer, setOpenIdCalls, state } = createApp('divider', 'int_4');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App);

  assert.equal(drawer.isOpen, true);
  assert.equal(drawer.group.position.x, 5);
  assert.equal(otherDrawer.isOpen, false);
  assert.equal(otherDrawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, ['int_4']);
  assert.equal(state.runtime.drawersOpenId, 'int_4');
});

test('stale drawer rebuild intent is consumed closed after leaving divider mode', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('none');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App);

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(state.runtime.drawersOpenId, null);
});

test('stale rebuild intent cannot reopen a previous drawer in a later divider session', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('divider');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App);

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(state.runtime.drawersOpenId, null);
});

test('stale rebuild intent does not clear a newer forced-open drawer selection', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('divider', 'int_8');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App);

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, []);
  assert.equal(state.runtime.drawersOpenId, 'int_8');
});
