import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCloudSyncServiceMaybe,
  getCloudSyncServiceStateMaybe,
  ensureCloudSyncServiceState,
  getCloudSyncTestHooksMaybe,
} from '../esm/native/runtime/cloud_sync_access.ts';

test('cloud sync access reads canonical services panelApi and ignores legacy root alias', () => {
  const legacyRoot = { legacy: true };
  const panelApi = {
    ping() {
      return 'ok';
    },
  };
  const App = {
    cloudSync: legacyRoot,
    services: {
      cloudSync: {
        panelApi,
      },
    },
  } as any;

  assert.equal(getCloudSyncServiceStateMaybe(App), App.services.cloudSync);
  assert.equal(getCloudSyncServiceMaybe(App), panelApi);
});

test('cloud sync access ensures canonical service state on services root', () => {
  const App = { services: Object.create(null) } as any;
  const state = ensureCloudSyncServiceState(App);
  assert.ok(state);
  assert.equal(state, App.services.cloudSync);
  assert.equal(getCloudSyncServiceStateMaybe(App), state);
});

test('cloud sync access exposes test hooks through canonical service state only', () => {
  const legacyRootHooks = { legacy: true };
  const createSupabaseClient = () => ({ channel() {}, removeChannel() {} });
  const App = {
    cloudSync: { __testHooks: legacyRootHooks },
    services: {
      cloudSync: {
        __testHooks: { createSupabaseClient },
      },
    },
  } as any;

  assert.equal(getCloudSyncTestHooksMaybe(App)?.createSupabaseClient, createSupabaseClient);
  assert.notEqual(getCloudSyncTestHooksMaybe(App), legacyRootHooks);
});
