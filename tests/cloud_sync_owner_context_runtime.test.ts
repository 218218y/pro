import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncOwnerContext } from '../esm/native/services/cloud_sync_owner_context.ts';
import { clearCloudSyncPublishedState } from '../esm/native/services/cloud_sync_install_support.ts';
import {
  buildRuntimeStatusSnapshotKey,
  cloneRuntimeStatus,
} from '../esm/native/services/cloud_sync_support.ts';

type AnyRecord = Record<string, unknown>;

function createStorage(seed?: Record<string, string>) {
  const raw = new Map<string, string>(Object.entries(seed || {}));
  return {
    KEYS: {
      SAVED_MODELS: 'saved-models',
      SAVED_COLORS: 'saved-colors',
    },
    getString(key: unknown): string | null {
      const k = String(key || '');
      return raw.has(k) ? String(raw.get(k)) : null;
    },
    setString(key: unknown, value: unknown): boolean {
      raw.set(String(key || ''), String(value || ''));
      return true;
    },
  };
}

function createBrowserApp(options?: { site2?: boolean; search?: string; diag?: string }) {
  const session = new Map<string, string>();
  const local = new Map<string, string>();
  if (options?.diag) local.set('WP_CLOUDSYNC_DIAG', options.diag);
  const location = {
    search: options?.search || '',
    pathname: options?.site2 ? '/index_site2.html' : '/index_pro.html',
  };
  const doc = {
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  const navigator = { clipboard: { writeText: async () => undefined }, userAgent: 'unit-test' };
  const win = {
    document: doc,
    navigator,
    location,
    sessionStorage: {
      getItem(key: string) {
        return session.has(key) ? String(session.get(key)) : null;
      },
      setItem(key: string, value: string) {
        session.set(key, String(value));
      },
    },
    localStorage: {
      getItem(key: string) {
        return local.has(key) ? String(local.get(key)) : null;
      },
      setItem(key: string, value: string) {
        local.set(key, String(value));
      },
    },
    prompt() {
      return 'prompt-value';
    },
  };
  const app: AnyRecord = {
    deps: {
      browser: {
        window: win,
        document: doc,
        location,
        navigator,
        fetch: async () => ({ ok: true, json: async () => ({}) }),
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
      },
      config: {
        supabaseCloudSync: {
          url: 'https://example.supabase.co',
          anonKey: 'anon',
          publicRoom: 'public-room',
          privateRoom: 'private-room',
        },
      },
    },
    services: {
      storage: createStorage(),
    },
  };
  return { app, session, local };
}

test('cloud sync owner context composes room helpers and per-tab client identity through dedicated seams', () => {
  const { app, session } = createBrowserApp({ site2: true, search: '?room=room-42' });

  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);
  assert.equal(ctx?.room, 'room-42');
  assert.equal(ctx?.currentRoom(), 'room-42');
  assert.equal(ctx?.getGateBaseRoom(), 'room-42');
  assert.equal(ctx?.getSite2TabsRoom(), 'room-42::tabsGate');
  assert.equal(ctx?.getFloatingSyncRoom(), 'room-42::syncPin');
  assert.equal(ctx?.getSketchRoom(), 'room-42::sketch::toSite2');
  assert.match(String(ctx?.clientId || ''), /^client_/);
  assert.equal(session.get('wp_cloud_sync_client_id'), ctx?.clientId);

  ctx?.setPrivateRoom('manual-private');
  assert.equal(ctx?.getPrivateRoom(), 'manual-private');
  assert.equal(ctx?.keyModels, 'saved-models');
  assert.equal(ctx?.keyColors, 'saved-colors');
  assert.equal(ctx?.keyColorOrder, 'saved-colors:order');
});

test('cloud sync owner context uses the public room for gate rows when no room URL is selected', () => {
  const { app } = createBrowserApp();

  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);
  assert.equal(ctx?.currentRoom(), 'public-room');
  assert.equal(ctx?.getPrivateRoom(), 'private-room');
  assert.equal(ctx?.getGateBaseRoom(), 'public-room');
  assert.equal(ctx?.getSite2TabsRoom(), 'public-room::tabsGate');
  assert.equal(ctx?.getFloatingSyncRoom(), 'public-room::syncPin');
});

test('cloud sync owner context starts disabled realtime with an empty channel surface', () => {
  const { app } = createBrowserApp();
  (app.deps as AnyRecord).config.supabaseCloudSync.realtime = false;

  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);
  assert.equal(ctx?.runtimeStatus.realtime.enabled, false);
  assert.equal(ctx?.runtimeStatus.realtime.state, 'disabled');
  assert.equal(ctx?.runtimeStatus.realtime.channel, '');

  const published = (app.services as AnyRecord).cloudSync.status;
  assert.equal(published.realtime.enabled, false);
  assert.equal(published.realtime.state, 'disabled');
  assert.equal(published.realtime.channel, '');
});

test('cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating', () => {
  const canonical = {
    room: 'public::sketch',
    clientId: 'client_1',
    instanceId: 'instance_1',
    realtime: { enabled: true, mode: 'broadcast', state: 'subscribed', channel: 'wp:public::sketch' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    lastPullAt: 100,
    lastPushAt: 200,
    lastRealtimeEventAt: 300,
    lastError: '',
    diagEnabled: false,
  };
  const drifted = cloneRuntimeStatus(canonical as any) as AnyRecord;
  (drifted.realtime as AnyRecord).mode = 'legacy-drift';
  (drifted.realtime as AnyRecord).extraFlag = true;
  (drifted.polling as AnyRecord).extraFlag = true;
  drifted.extraFlag = true;

  assert.equal(
    buildRuntimeStatusSnapshotKey(drifted as any),
    buildRuntimeStatusSnapshotKey(canonical as any)
  );
});

test('cloud sync owner context memoizes runtime status publishes and keeps the canonical status surface live', () => {
  const { app } = createBrowserApp({ diag: 'yes' });
  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);
  assert.equal(ctx?.diagEnabledRef.value, true);

  const firstStatus = (app.services as AnyRecord).cloudSync.status;
  const firstRealtime = firstStatus.realtime;
  const firstPolling = firstStatus.polling;

  ctx?.publishStatus();
  const secondStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(firstStatus, secondStatus);
  assert.equal(firstRealtime, secondStatus.realtime);
  assert.equal(firstPolling, secondStatus.polling);

  ctx!.runtimeStatus.lastPullAt = 123;
  ctx!.runtimeStatus.realtime.state = 'subscribed';
  ctx!.runtimeStatus.polling.reason = 'after-update';
  ctx?.publishStatus();

  const thirdStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(thirdStatus, secondStatus);
  assert.equal(thirdStatus.realtime, firstRealtime);
  assert.equal(thirdStatus.polling, firstPolling);
  assert.equal(thirdStatus.lastPullAt, 123);
  assert.equal(thirdStatus.realtime.state, 'subscribed');
  assert.equal(thirdStatus.polling.reason, 'after-update');
});

test('cloud sync owner context keeps held status refs alive across owner reinstall', () => {
  const { app } = createBrowserApp();
  const firstCtx = createCloudSyncOwnerContext(app as any);
  assert.ok(firstCtx);

  const heldStatus = (app.services as AnyRecord).cloudSync.status;
  const heldRealtime = heldStatus.realtime;
  const heldPolling = heldStatus.polling;
  const firstInstanceId = String(heldStatus.instanceId || '');

  const secondCtx = createCloudSyncOwnerContext(app as any);
  assert.ok(secondCtx);
  secondCtx!.runtimeStatus.lastError = 'reinstalled-owner';
  secondCtx!.runtimeStatus.realtime.state = 'connecting';
  secondCtx!.runtimeStatus.polling.reason = 'owner-reinstall';
  secondCtx!.publishStatus();

  const currentStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(currentStatus, heldStatus);
  assert.equal(currentStatus.realtime, heldRealtime);
  assert.equal(currentStatus.polling, heldPolling);
  assert.equal(currentStatus.lastError, 'reinstalled-owner');
  assert.equal(currentStatus.realtime.state, 'connecting');
  assert.equal(currentStatus.polling.reason, 'owner-reinstall');
  assert.notEqual(String(currentStatus.instanceId || ''), firstInstanceId);
});

test('cloud sync owner context ignores stale status publishes after a newer owner takes over', () => {
  const { app } = createBrowserApp();
  const firstCtx = createCloudSyncOwnerContext(app as any);
  assert.ok(firstCtx);
  const heldStatus = (app.services as AnyRecord).cloudSync.status;

  const secondCtx = createCloudSyncOwnerContext(app as any);
  assert.ok(secondCtx);
  secondCtx!.runtimeStatus.lastError = 'live-owner';
  secondCtx!.publishStatus();

  firstCtx!.runtimeStatus.lastError = 'stale-owner';
  firstCtx!.publishStatus();

  const currentStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(currentStatus, heldStatus);
  assert.equal(currentStatus.lastError, 'live-owner');
  assert.equal(currentStatus.instanceId, secondCtx!.runtimeStatus.instanceId);
});

test('cloud sync owner context ignores late status publishes after publication teardown', () => {
  const { app } = createBrowserApp();
  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);
  assert.ok((app.services as AnyRecord).cloudSync.status);

  clearCloudSyncPublishedState(app as any, {
    invalidatePublicationEpoch: true,
    publicationEpoch: ctx!.publicationEpoch,
  });

  ctx!.runtimeStatus.lastError = 'late-status';
  ctx!.publishStatus();

  assert.equal('status' in (app.services as AnyRecord).cloudSync, false);
});

test('cloud sync owner context ignores stale publication cleanup after a newer owner takes over', () => {
  const { app } = createBrowserApp();
  const firstCtx = createCloudSyncOwnerContext(app as any);
  assert.ok(firstCtx);

  const secondCtx = createCloudSyncOwnerContext(app as any);
  assert.ok(secondCtx);
  secondCtx!.runtimeStatus.lastError = 'live-owner';
  secondCtx!.publishStatus();

  const heldStatus = (app.services as AnyRecord).cloudSync.status;
  clearCloudSyncPublishedState(app as any, {
    invalidatePublicationEpoch: true,
    publicationEpoch: firstCtx!.publicationEpoch,
  });

  const currentStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(currentStatus, heldStatus);
  assert.equal(currentStatus.lastError, 'live-owner');
  assert.equal(currentStatus.instanceId, secondCtx!.runtimeStatus.instanceId);
});

test('cloud sync owner context tombstones held status refs after published-state cleanup', () => {
  const { app } = createBrowserApp();
  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);

  const heldStatus = (app.services as AnyRecord).cloudSync.status;
  const heldRealtime = heldStatus.realtime;
  const heldPolling = heldStatus.polling;

  clearCloudSyncPublishedState(app as any);

  assert.equal('status' in (app.services as AnyRecord).cloudSync, false);
  assert.equal(heldStatus.realtime, heldRealtime);
  assert.equal(heldStatus.polling, heldPolling);
  assert.equal(heldStatus.room, '');
  assert.equal(heldStatus.clientId, '');
  assert.equal(heldStatus.instanceId, '');
  assert.equal(heldStatus.realtime.state, 'unavailable');
  assert.equal(heldStatus.polling.reason, 'unavailable');
  assert.equal(heldStatus.lastError, 'unavailable');
});

test('cloud sync owner context self-heals leaked enumerable status markers even when the runtime snapshot is unchanged', () => {
  const { app } = createBrowserApp({ diag: 'yes' });
  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);

  const heldStatus = (app.services as AnyRecord).cloudSync.status;
  const installedValue = heldStatus.__wpCloudSyncStatusInstalled;
  const activeValue = heldStatus.__wpCloudSyncStatusActive;
  delete heldStatus.__wpCloudSyncStatusInstalled;
  delete heldStatus.__wpCloudSyncStatusActive;
  heldStatus.__wpCloudSyncStatusInstalled = installedValue;
  heldStatus.__wpCloudSyncStatusActive = activeValue;

  assert.equal(Object.getOwnPropertyDescriptor(heldStatus, '__wpCloudSyncStatusInstalled')?.enumerable, true);
  assert.equal(Object.getOwnPropertyDescriptor(heldStatus, '__wpCloudSyncStatusActive')?.enumerable, true);

  ctx!.publishStatus();

  const healedStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(healedStatus, heldStatus);
  assert.equal(
    Object.getOwnPropertyDescriptor(healedStatus, '__wpCloudSyncStatusInstalled')?.enumerable,
    false
  );
  assert.equal(Object.getOwnPropertyDescriptor(healedStatus, '__wpCloudSyncStatusActive')?.enumerable, false);
  assert.equal(Object.keys(healedStatus).includes('__wpCloudSyncStatusInstalled'), false);
  assert.equal(Object.keys(healedStatus).includes('__wpCloudSyncStatusActive'), false);
});

test('cloud sync owner context self-heals drifted canonical status surfaces even when runtime snapshot is unchanged', () => {
  const { app } = createBrowserApp({ diag: 'yes' });
  const ctx = createCloudSyncOwnerContext(app as any);
  assert.ok(ctx);

  const heldStatus = (app.services as AnyRecord).cloudSync.status;
  const heldRealtime = heldStatus.realtime;
  const heldPolling = heldStatus.polling;

  heldStatus.room = 'drifted-room';
  heldStatus.clientId = 'drifted-client';
  delete heldStatus.instanceId;
  heldStatus.realtime.state = 'drifted-state';
  delete heldStatus.realtime.channel;
  heldStatus.polling.reason = 'drifted-reason';
  (heldStatus as AnyRecord).extraFlag = true;

  ctx!.publishStatus();

  const healedStatus = (app.services as AnyRecord).cloudSync.status;
  assert.equal(healedStatus, heldStatus);
  assert.equal(healedStatus.realtime, heldRealtime);
  assert.equal(healedStatus.polling, heldPolling);
  assert.equal(healedStatus.room, ctx!.runtimeStatus.room);
  assert.equal(healedStatus.clientId, ctx!.runtimeStatus.clientId);
  assert.equal(healedStatus.instanceId, ctx!.runtimeStatus.instanceId);
  assert.equal(healedStatus.realtime.state, ctx!.runtimeStatus.realtime.state);
  assert.equal(healedStatus.realtime.channel, ctx!.runtimeStatus.realtime.channel);
  assert.equal(healedStatus.polling.reason, ctx!.runtimeStatus.polling.reason);
  assert.equal('extraFlag' in healedStatus, false);
});
