import test from 'node:test';
import assert from 'node:assert/strict';

import { getThreeMaybe } from '../esm/native/runtime/three_access.ts';
import { hasStoreReactivityInstalled } from '../esm/native/runtime/store_reactivity_access.ts';
import {
  ensureDoorsService,
  getDoorsRuntime,
  getDrawerRuntime,
  setDoorsOpenViaService,
  toggleDoorsViaService,
  getDoorsLastToggleTime,
  setDrawerMetaEntry,
  getDrawerMetaEntry,
  consumeDrawerRebuildIntent,
  setDrawerRebuildIntent,
} from '../esm/native/runtime/doors_access.ts';

test('runtime access hardening: getThreeMaybe reads only canonical deps.THREE surface', () => {
  const THREE = { Group: class {} } as any;
  assert.equal(getThreeMaybe({ deps: { THREE } }), THREE);
  assert.equal(getThreeMaybe({ deps: { THREE: null } }), null);
  assert.equal(getThreeMaybe({ deps: [] }), null);
  assert.equal(getThreeMaybe({}), null);
});

test('runtime access hardening: hasStoreReactivityInstalled is fail-soft and canonical', () => {
  let installed = false;
  const App: any = {
    actions: {
      store: {
        hasReactivityInstalled: () => installed,
      },
    },
    stateKernel: { _didInstallStoreReactivity: true },
  };

  assert.equal(hasStoreReactivityInstalled(App), false);
  installed = true;
  assert.equal(hasStoreReactivityInstalled(App), true);
  assert.equal(hasStoreReactivityInstalled({ stateKernel: { _didInstallStoreReactivity: true } }), false);
  assert.equal(hasStoreReactivityInstalled(null), false);
});

test('runtime access hardening: doors/drawers helpers keep service routing and runtime state stable', () => {
  const calls: string[] = [];
  const App: any = { services: {} };

  const doors = ensureDoorsService(App);
  doors.setOpen = (open: boolean) => {
    calls.push(`setOpen:${open ? 'open' : 'closed'}`);
  };
  doors.toggle = () => {
    calls.push('toggle');
  };
  doors.getLastToggleTime = () => 1234;

  assert.equal(setDoorsOpenViaService(App, true), true);
  assert.equal(toggleDoorsViaService(App), true);
  assert.equal(getDoorsLastToggleTime(App), 1234);
  assert.deepEqual(calls, ['setOpen:open', 'toggle']);

  const runtime = getDoorsRuntime(App);
  runtime.lastToggleTime = 77;
  assert.equal(getDoorsLastToggleTime({ services: {} }), 0);
  assert.equal(runtime.lastToggleTime, 77);

  assert.equal(setDrawerMetaEntry(App, 'drawer-1', { open: true }), true);
  assert.deepEqual(getDrawerMetaEntry(App, 'drawer-1'), { open: true });

  const drawerRuntime = getDrawerRuntime(App);
  assert.equal(drawerRuntime.snapAfterBuildId, undefined);
  setDrawerRebuildIntent(App, 'drawer-1');
  assert.equal(consumeDrawerRebuildIntent(App), 'drawer-1');
  assert.equal(consumeDrawerRebuildIntent(App), null);
});
