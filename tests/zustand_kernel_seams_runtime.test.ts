import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getHistorySystemMaybe,
  flushHistoryPendingPushMaybe,
  scheduleHistoryPushMaybe,
  pushHistoryStateMaybe,
  flushOrPushHistoryStateMaybe,
} from '../esm/native/runtime/history_system_access.ts';
import { hasStoreReactivityInstalled } from '../esm/native/runtime/store_reactivity_access.ts';
import { installStateApi } from '../esm/native/kernel/state_api.ts';

const mkStore = (state?: any) => {
  const root =
    state ||
    ({
      ui: {},
      config: {},
      runtime: {},
      meta: { version: 0 },
    } as any);

  return {
    getState: () => root,
    patch: (_payload: any, _meta?: any) => undefined,
    subscribe: (_fn?: any) => () => undefined,
  };
};

test('kernel seams runtime: getHistorySystemMaybe uses actions.history seam (services-backed) and ignores removed kernel/deps fallbacks', () => {
  const hsSk = { id: 'sk' };
  const hsSvc = { id: 'svc' };
  const hsDeps = { id: 'deps' };

  const App: any = {
    actions: {},
    store: mkStore(),
    stateKernel: { historySystem: hsSk },
    services: { history: { system: hsSvc } },
    deps: { historySystem: hsDeps },
  };

  installStateApi(App);

  // Delete-pass: history system is canonical via services.history.system only.
  assert.equal((App.actions as any).history.getSystem(), hsSvc);
  assert.equal(getHistorySystemMaybe(App), hsSvc);

  const kernelOnly: any = {
    actions: {},
    store: mkStore(),
    stateKernel: { historySystem: hsSk },
    deps: { historySystem: hsDeps },
  };
  installStateApi(kernelOnly);
  assert.equal((kernelOnly.actions as any).history.getSystem(), null);
  assert.equal(getHistorySystemMaybe(kernelOnly), null);

  // Runtime helper ignores raw kernel/deps probes.
  assert.equal(getHistorySystemMaybe({ stateKernel: { historySystem: hsSk } }), null);
  assert.equal(
    getHistorySystemMaybe({ services: { history: { system: hsSvc } }, deps: { historySystem: hsDeps } }),
    hsSvc
  );
  assert.equal(getHistorySystemMaybe({ deps: { historySystem: hsDeps } }), null);
});

test('kernel seams runtime: history flush/schedule/push helpers prefer actions.history canonical routers and avoid duplicate service probing', () => {
  const calls: string[] = [];
  const App: any = {
    actions: {},
    store: mkStore(),
    services: {
      history: {
        system: {
          pushState: () => {
            calls.push('services.history.system.pushState');
          },
        },
        flushPendingPush: () => {
          calls.push('services.history.flushPendingPush');
        },
        schedulePush: () => {
          calls.push('services.history.schedulePush');
        },
      },
    },
  };

  installStateApi(App);

  (App.actions as any).history.flushPendingPush = (opts: any) => {
    calls.push(`actions.history.flushPendingPush:${opts?.from || ''}`);
    return undefined; // commit-style void; should still be treated as authoritative.
  };
  (App.actions as any).history.schedulePush = (meta: any) => {
    calls.push(`actions.history.schedulePush:${meta?.source || ''}`);
    return true;
  };
  (App.actions as any).history.pushState = (opts: any) => {
    calls.push(`actions.history.pushState:${opts?.kind || ''}`);
    return undefined;
  };
  (App.actions as any).history.flushOrPush = (opts: any) => {
    calls.push(`actions.history.flushOrPush:${opts?.via || ''}`);
    return true;
  };

  assert.equal(flushHistoryPendingPushMaybe(App, { from: 'test' }), true);
  assert.equal(scheduleHistoryPushMaybe(App, { source: 'test:schedule' }), true);
  assert.equal(pushHistoryStateMaybe(App, { kind: 'test-push' }), true);
  assert.equal(flushOrPushHistoryStateMaybe(App, { via: 'test-flushOrPush' }), true);

  assert.deepEqual(calls, [
    'actions.history.flushPendingPush:test',
    'actions.history.schedulePush:test:schedule',
    'actions.history.pushState:test-push',
    'actions.history.flushOrPush:test-flushOrPush',
  ]);
});

test('kernel seams runtime: getHistorySystemMaybe + hasStoreReactivityInstalled are fail-soft', () => {
  assert.equal(getHistorySystemMaybe(null), null);
  assert.equal(getHistorySystemMaybe({}), null);
  assert.equal(hasStoreReactivityInstalled(null), false);
  assert.equal(hasStoreReactivityInstalled({}), false);

  // Delete-pass: no raw kernel flags are consulted anymore.
  assert.equal(hasStoreReactivityInstalled({ stateKernel: { _didInstallStoreReactivity: 1 } }), false);

  const storeOk = {
    getState: () => ({ ui: {}, config: {}, runtime: {}, meta: { version: 0 } }),
    patch: () => undefined,
    subscribe: () => () => undefined,
  };

  const app1: any = { actions: {}, store: storeOk };
  installStateApi(app1);
  assert.equal(app1.actions.store.hasReactivityInstalled(), false);
  assert.equal(app1.actions.store.installReactivity(), true);
  assert.equal(hasStoreReactivityInstalled(app1), true);

  // Valid for assertStore (getState+patch), but missing subscribe => installReactivity should not be considered installed.
  const storeBad = { getState: () => ({}), patch: () => undefined, subscribe: null };
  const app0: any = { actions: {}, store: storeBad };
  installStateApi(app0);
  assert.equal(hasStoreReactivityInstalled(app0), false);
});
