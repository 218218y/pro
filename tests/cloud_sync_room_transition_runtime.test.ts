import test from 'node:test';
import assert from 'node:assert/strict';

import { installCloudSyncService } from '../esm/native/services/cloud_sync.ts';
import { createCloudCollectionsRepository } from '../esm/native/services/cloud_sync_collections_repository.ts';
import {
  getCloudSyncServiceMaybe,
  getCloudSyncServiceStateMaybe,
} from '../esm/native/runtime/cloud_sync_access.ts';

type GatewayRequest = {
  action: string;
  room: string;
  payload: Record<string, unknown>;
};

type JsonRecord = Record<string, unknown>;

function createStorage() {
  const values = new Map<string, string>();
  return {
    KEYS: {
      SAVED_MODELS: 'saved-models',
      SAVED_COLORS: 'saved-colors',
      PRIVATE_ROOM_CREDENTIAL: 'private-room-credential',
    },
    getString(key: unknown): string | null {
      const normalized = String(key || '');
      return values.has(normalized) ? String(values.get(normalized)) : null;
    },
    setString(key: unknown, value: unknown): boolean {
      values.set(String(key || ''), String(value || ''));
      return true;
    },
    getJSON<T>(key: unknown, defaultValue: T): T {
      const raw = values.get(String(key || ''));
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    },
    setJSON(key: unknown, value: unknown): boolean {
      values.set(String(key || ''), JSON.stringify(value));
      return true;
    },
    remove(key: unknown): boolean {
      return values.delete(String(key || ''));
    },
  };
}

function createWebStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return values.has(key) ? String(values.get(key)) : null;
    },
    setItem(key: string, value: string): void {
      values.set(key, String(value));
    },
    removeItem(key: string): void {
      values.delete(key);
    },
  };
}

function makeRoomToken(expiresAt = '2099-01-01T00:00:00.000Z'): string {
  const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: Date.parse(expiresAt) / 1000 })}.signature`;
}

function jsonResponse(status: number, body: JsonRecord): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createCloudSyncRoomTransitionRig() {
  const requests: GatewayRequest[] = [];
  const rows = new Map<string, JsonRecord>();
  const privateToken = makeRoomToken();
  const storage = createStorage();
  const location = {
    href: 'https://main.example.test/index_pro.html',
    search: '',
    pathname: '/index_pro.html',
  };
  const localStorage = createWebStorage();
  const sessionStorage = createWebStorage();
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const addEventListener = (type: string, handler: (event: unknown) => void): void => {
    const bucket = listeners.get(type) || new Set<(event: unknown) => void>();
    bucket.add(handler);
    listeners.set(type, bucket);
  };
  const removeEventListener = (type: string, handler: (event: unknown) => void): void => {
    listeners.get(type)?.delete(handler);
  };

  const history = {
    state: null as unknown,
    replaceState(state: unknown, _title: string, nextHref: string): void {
      history.state = state;
      location.href = String(nextHref);
      location.search = new URL(location.href).search;
      location.pathname = new URL(location.href).pathname;
    },
  };

  const fetch = async (_input: string, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body || '{}')) as JsonRecord;
    const action = typeof body.action === 'string' ? body.action : '';
    const room = typeof body.room === 'string' ? body.room : '';
    const payload =
      body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? (body.payload as JsonRecord)
        : {};
    requests.push({ action, room, payload });

    if (action === 'issue-public') {
      return jsonResponse(200, {
        ok: true,
        credential: {
          room: 'public',
          token: 'public-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      });
    }
    if (action === 'create-room') {
      return jsonResponse(201, {
        ok: true,
        credential: {
          room: 'room-new',
          token: privateToken,
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      });
    }
    if (action === 'read') {
      return jsonResponse(200, { ok: true, row: rows.get(room) || null });
    }
    if (action === 'write') {
      const revision = Number((rows.get(room)?.revision as number | undefined) || 0) + 1;
      const row = {
        room,
        payload,
        revision,
        updated_at: new Date(1_700_000_000_000 + revision).toISOString(),
        updated_by: typeof body.clientId === 'string' ? body.clientId : 'test-client',
      };
      rows.set(room, row);
      return jsonResponse(200, { ok: true, row });
    }
    return jsonResponse(400, { ok: false, code: 'unsupported-test-action' });
  };

  const windowLike = {
    location,
    history,
    localStorage,
    sessionStorage,
    navigator: { onLine: true, clipboard: { writeText: async () => undefined }, userAgent: 'test' },
    document: null as unknown,
    addEventListener,
    removeEventListener,
    prompt: () => '',
  };
  const documentLike = {
    visibilityState: 'visible',
    addEventListener,
    removeEventListener,
    createElement: () => ({}),
    querySelector: () => null,
  };
  windowLike.document = documentLike;

  const app = {
    deps: {
      browser: {
        window: windowLike,
        document: documentLike,
        location,
        navigator: windowLike.navigator,
        fetch,
        setTimeout: (handler: () => void, ms: number) => setTimeout(handler, Math.min(ms, 5)),
        clearTimeout,
        setInterval: () => 1,
        clearInterval: () => undefined,
      },
      config: {
        supabaseCloudSync: {
          url: 'https://project.supabase.co',
          anonKey: 'legacy-anon-jwt',
          storeId: 'bargig',
          gatewayFunction: 'wp-cloud-sync-room',
          publicRoom: 'public',
          roomParam: 'room',
          roomTokenParam: 'roomToken',
          pollMs: 60_000,
          shareBaseUrl: 'https://customer.example.test/',
          realtime: false,
          diagnostics: false,
        },
      },
    },
    services: { storage },
    actions: {
      ui: {
        patchSoft: () => undefined,
      },
    },
  };

  return { app, location, requests, storage, privateToken };
}

async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

test('cloud sync room transition reinstalls the room-scoped owner before subsequent main-row sync', async () => {
  const { app, location, requests, storage, privateToken } = createCloudSyncRoomTransitionRig();

  await installCloudSyncService(app as any);
  await waitFor(
    () => requests.some(request => request.action === 'write' && request.room === 'public'),
    'initial public owner should seed the public main row'
  );

  const firstEpoch = Number(getCloudSyncServiceStateMaybe(app)?.__publicationEpoch || 0);
  const service = getCloudSyncServiceMaybe(app);
  assert.ok(service?.goPrivate);

  const result = await service.goPrivate();
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    mode: 'private',
    room: 'room-new',
    shareLink: `https://customer.example.test/#room=room-new&roomToken=${privateToken}`,
  });
  assert.equal(new URL(location.href).hash, '#room=room-new');
  assert.equal(getCloudSyncServiceMaybe(app)?.getCurrentRoom?.(), 'room-new');
  assert.ok(
    Number(getCloudSyncServiceStateMaybe(app)?.__publicationEpoch || 0) > firstEpoch,
    'room transition should replace the room-scoped owner generation'
  );

  await waitFor(
    () => requests.some(request => request.action === 'write' && request.room === 'room-new'),
    'new private owner should seed the private main row without a page reload'
  );

  const publicWritesBeforeLocalMutation = requests.filter(
    request => request.action === 'write' && request.room === 'public'
  ).length;
  createCloudCollectionsRepository({
    storage,
    keys: {
      models: 'saved-models',
      colors: 'saved-colors',
      colorOrder: 'saved-colors:order',
      presetOrder: 'saved-models:presetOrder',
      hiddenPresets: 'saved-models:hiddenPresets',
    },
  }).update({ savedModels: [{ id: 'after-room-switch', name: 'After room switch' }] });
  await waitFor(
    () =>
      requests.some(
        request =>
          request.action === 'write' &&
          request.room === 'room-new' &&
          Array.isArray(request.payload.savedModels) &&
          request.payload.savedModels.length === 1
      ),
    'local mutations after the transition should push only through the new room owner'
  );
  assert.equal(
    requests.filter(request => request.action === 'write' && request.room === 'public').length,
    publicWritesBeforeLocalMutation,
    'disposed public owner must not keep receiving main-row pushes'
  );

  getCloudSyncServiceStateMaybe(app)?.dispose?.();
});

test('cloud sync room transition preserves the live public api and isolates the private tabs gate', async () => {
  const { app, requests } = createCloudSyncRoomTransitionRig();

  await installCloudSyncService(app as any);
  await waitFor(
    () => requests.some(request => request.action === 'write' && request.room === 'public'),
    'initial public owner should seed the public main row'
  );

  const heldService = getCloudSyncServiceMaybe(app);
  assert.ok(heldService?.goPrivate);
  assert.ok(heldService?.setSite2TabsGateOpen);

  const snapshots: Array<{ open: boolean; until: number }> = [];
  const unsubscribe = heldService.subscribeSite2TabsGateSnapshot?.(snapshot => {
    snapshots.push({ open: !!snapshot.open, until: Number(snapshot.until) || 0 });
  });

  const publicOpen = await heldService.setSite2TabsGateOpen(true);
  assert.equal(publicOpen.ok, true);
  await waitFor(
    () => requests.some(request => request.action === 'write' && request.room === 'public::tabsGate'),
    'public tabs gate should be written before the room transition'
  );
  assert.equal(heldService.getSite2TabsGateSnapshot?.().open, true);

  const result = await heldService.goPrivate();
  assert.equal(result.ok, true);
  assert.equal(result.room, 'room-new');
  assert.equal(
    getCloudSyncServiceMaybe(app),
    heldService,
    'room replacement must heal the existing public api object instead of publishing a new identity'
  );

  await waitFor(
    () => requests.some(request => request.action === 'read' && request.room === 'room-new::tabsGate'),
    'the new owner should read the private tabs-gate row'
  );
  await waitFor(
    () => heldService.getSite2TabsGateSnapshot?.().open === false,
    'a new private room without a tabs-gate row must start closed'
  );
  assert.equal(
    requests.some(request => request.action === 'write' && request.room === 'room-new::tabsGate'),
    false,
    'public tabs-gate state must not be copied into a new private room'
  );

  const privateOpen = await heldService.setSite2TabsGateOpen(true);
  assert.equal(privateOpen.ok, true);
  await waitFor(
    () => requests.some(request => request.action === 'write' && request.room === 'room-new::tabsGate'),
    'the held api should remain actionable and write the private tabs gate without a reload'
  );
  await waitFor(
    () => heldService.getSite2TabsGateSnapshot?.().open === true,
    'the held api snapshot should update after opening the private tabs gate'
  );

  const privateClose = await heldService.setSite2TabsGateOpen(false);
  assert.equal(privateClose.ok, true);
  await waitFor(
    () => heldService.getSite2TabsGateSnapshot?.().open === false,
    'the same held api should also close the private tabs gate without a reload'
  );
  assert.ok(
    snapshots.some(snapshot => snapshot.open === false) && snapshots.some(snapshot => snapshot.open === true),
    'existing snapshot subscribers should be bridged onto the replacement owner'
  );

  unsubscribe?.();
  getCloudSyncServiceStateMaybe(app)?.dispose?.();
});
