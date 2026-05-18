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

function createApp(primaryMode: string) {
  const state = {
    mode: { primary: primaryMode, opts: {} },
    runtime: { drawersOpenId: null as string | number | null },
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
      drawersArray: [drawer],
    },
  };

  return { App: App as never, drawer, setOpenIdCalls, state };
}

test('drawer rebuild intent keeps the target drawer open only while divider mode is active', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('divider');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App);

  assert.equal(drawer.isOpen, true);
  assert.equal(drawer.group.position.x, 5);
  assert.deepEqual(setOpenIdCalls, ['int_4']);
  assert.equal(state.runtime.drawersOpenId, 'int_4');
});

test('stale drawer rebuild intent is consumed closed after leaving divider mode', () => {
  const { App, drawer, setOpenIdCalls, state } = createApp('none');

  setDrawerRebuildIntent(App, 'int_4');
  runRebuildDrawerMeta(App);

  assert.equal(drawer.isOpen, false);
  assert.equal(drawer.group.position.x, 0);
  assert.deepEqual(setOpenIdCalls, [null]);
  assert.equal(state.runtime.drawersOpenId, null);
});
