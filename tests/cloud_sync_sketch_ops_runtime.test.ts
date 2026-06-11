import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncSketchOps } from '../esm/native/services/cloud_sync_sketch_ops.ts';
import { withSuppressedConsole } from './_console_silence.ts';

test('cloud sync sketch pull only toasts success when project load really succeeds', async () => {
  const toastCalls: Array<{ msg: string; type?: string }> = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];
  const loadResults = [
    { ok: false, reason: 'invalid' },
    { ok: true, restoreGen: 2 },
  ];
  let rowVersion = 0;

  const App = {
    services: {
      uiFeedback: {
        toast(msg: string, type?: string) {
          toastCalls.push({ msg, type });
        },
      },
      projectIO: {
        exportCurrentProject() {
          return {
            projectData: { settings: { width: 40 } },
            jsonStr: JSON.stringify({ settings: { width: 40 } }),
          };
        },
        loadProjectData() {
          return loadResults.shift() ?? { ok: true };
        },
      },
    },
  } as any;

  const ops = createCloudSyncSketchOps({
    App,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'local-client',
    currentRoom: () => 'room-a',
    getRow: async () =>
      ({
        updated_at: rowVersion++ === 0 ? '2026-03-27T11:00:00.000Z' : '2026-03-27T11:01:00.000Z',
        payload: {
          sketchRev: 10 + rowVersion,
          sketchHash: `remote-hash-${rowVersion}`,
          sketchBy: 'remote-client',
          sketch: { settings: { width: 100 + rowVersion } },
        },
      }) as any,
    upsertRow: async () => ({ ok: true }) as any,
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: (event: string, payload: unknown) => {
      diagCalls.push({ event, payload });
    },
  });

  await ops.pullSketchOnce(false);
  assert.deepEqual(toastCalls, []);
  assert.equal(diagCalls.at(-1)?.event, 'sketch:pull:load-skipped');

  await ops.pullSketchOnce(false);
  assert.deepEqual(toastCalls, [{ msg: 'סקיצה חדשה התעדכנה', type: 'success' }]);
});

test('cloud sync sketch routing is directional between main and site2 bundles', async () => {
  const mainReads: string[] = [];
  const mainWrites: string[] = [];
  const site2Reads: string[] = [];
  const site2Writes: string[] = [];

  const createApp = (siteVariant: 'main' | 'site2') =>
    ({
      store: {
        getState() {
          return { config: { siteVariant } };
        },
      },
      services: {
        projectIO: {
          exportCurrentProject() {
            return {
              projectData: { settings: { width: siteVariant === 'site2' ? 80 : 40 } },
              jsonStr: JSON.stringify({ settings: { width: siteVariant === 'site2' ? 80 : 40 } }),
            };
          },
          loadProjectData() {
            return { ok: true, restoreGen: 1 };
          },
        },
      },
    }) as any;

  const mainOps = createCloudSyncSketchOps({
    App: createApp('main'),
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'main-client',
    currentRoom: () => 'room-a',
    getRow: async (_restUrl: string, _anonKey: string, room: string) => {
      mainReads.push(room);
      return null as any;
    },
    upsertRow: async (_restUrl: string, _anonKey: string, room: string) => {
      mainWrites.push(room);
      return { ok: true, row: { updated_at: '2026-03-30T07:00:00.000Z' } } as any;
    },
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  const site2Ops = createCloudSyncSketchOps({
    App: createApp('site2'),
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'site2-client',
    currentRoom: () => 'room-a',
    getRow: async (_restUrl: string, _anonKey: string, room: string) => {
      site2Reads.push(room);
      return null as any;
    },
    upsertRow: async (_restUrl: string, _anonKey: string, room: string) => {
      site2Writes.push(room);
      return { ok: true, row: { updated_at: '2026-03-30T07:00:01.000Z' } } as any;
    },
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  await mainOps.syncSketchNow();
  await mainOps.pullSketchOnce(false);
  await site2Ops.syncSketchNow();
  await site2Ops.pullSketchOnce(false);

  assert.deepEqual(mainWrites, ['room-a::sketch::toSite2']);
  assert.deepEqual(mainReads, ['room-a::sketch::toSite2', 'room-a::sketch::toMain']);
  assert.deepEqual(site2Writes, ['room-a::sketch::toMain']);
  assert.deepEqual(site2Reads, ['room-a::sketch::toMain', 'room-a::sketch::toSite2']);
});

test('cloud sync sketch push preserves thrown error messages', async () => {
  await withSuppressedConsole(async () => {
    const ops = createCloudSyncSketchOps({
      App: {
        services: {
          projectIO: {
            exportCurrentProject() {
              return {
                projectData: { settings: { width: 40 } },
                jsonStr: JSON.stringify({ settings: { width: 40 } }),
              };
            },
          },
        },
      } as any,
      cfg: {
        anonKey: 'anon',
        roomParam: 'room',
        publicRoom: 'public',
        site2SketchInitialAutoLoad: true,
        site2SketchInitialMaxAgeHours: 12,
      },
      storage: {},
      restUrl: 'https://example.invalid',
      clientId: 'local-client',
      currentRoom: () => 'room-a',
      getRow: async () => null as any,
      upsertRow: async () => {
        throw new Error('push exploded');
      },
      emitRealtimeHint: () => undefined,
      runtimeStatus: { realtime: { status: 'idle' } } as any,
      publishStatus: () => undefined,
      diag: () => undefined,
    });

    assert.deepEqual(await ops.syncSketchNow(), { ok: false, reason: 'error', message: 'push exploded' });
  });
});

test('floating sketch sync direct push preserves thrown error messages', async () => {
  await withSuppressedConsole(async () => {
    const ops = createCloudSyncSketchOps({
      App: {} as any,
      cfg: {
        anonKey: 'anon',
        roomParam: 'room',
        publicRoom: 'public',
        privateRoom: 'private-room',
        site2SketchInitialAutoLoad: true,
        site2SketchInitialMaxAgeHours: 12,
      },
      storage: {},
      restUrl: 'https://example.invalid',
      clientId: 'local-client',
      currentRoom: () => 'room-a',
      getGateBaseRoom: () => 'private-room',
      getRow: async () => null as any,
      upsertRow: async () => {
        throw { message: 'pin push exploded' };
      },
      emitRealtimeHint: () => undefined,
      runtimeStatus: { realtime: { status: 'idle' } } as any,
      publishStatus: () => undefined,
      diag: () => undefined,
    });

    assert.deepEqual(await ops.pushFloatingSketchSyncPinnedNow(true), {
      ok: false,
      reason: 'error',
      message: 'pin push exploded',
    });
  });
});

test('floating sketch sync defaults to the public room when no room URL is selected', async () => {
  const rooms: string[] = [];
  const ops = createCloudSyncSketchOps({
    App: {
      deps: {
        browser: {
          location: { search: '', pathname: '/index_pro.html' },
        },
      },
    } as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      privateRoom: 'private-room',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'local-client',
    currentRoom: () => 'public',
    getRow: async () => null as any,
    upsertRow: async (_rest, _anon, room) => {
      rooms.push(room);
      return { ok: true, row: { updated_at: '2026-03-27T11:00:00.000Z', payload: {} } as any };
    },
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  assert.equal((await ops.pushFloatingSketchSyncPinnedNow(true)).ok, true);
  assert.equal(rooms[0], 'public::syncPin');
});

test('cloud sync sketch push does not contaminate pull baseline across directional rooms', async () => {
  const loadedWidths: number[] = [];
  let pullReads = 0;
  const freshRemoteUpdatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const ops = createCloudSyncSketchOps({
    App: {
      store: {
        getState() {
          return { config: { siteVariant: 'site2' } };
        },
      },
      services: {
        projectIO: {
          exportCurrentProject() {
            return {
              projectData: { settings: { width: 80 } },
              jsonStr: JSON.stringify({ settings: { width: 80 } }),
            };
          },
          loadProjectData(sketch: { settings?: { width?: number } }) {
            loadedWidths.push(Number(sketch?.settings?.width || 0));
            return { ok: true, restoreGen: loadedWidths.length };
          },
        },
      },
    } as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'site2-client',
    currentRoom: () => 'room-a',
    getRow: async (_restUrl: string, _anonKey: string, room: string) => {
      if (room === 'room-a::sketch::toMain') return null as any;
      pullReads += 1;
      return {
        room,
        updated_at: freshRemoteUpdatedAt,
        payload: {
          sketchRev: 10,
          sketchHash: 'remote-main-hash',
          sketchBy: 'main-client',
          sketch: { settings: { width: 140 } },
        },
      } as any;
    },
    upsertRow: async () => ({ ok: true, row: { updated_at: new Date().toISOString() } }) as any,
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  await ops.pullSketchOnce(true);
  assert.deepEqual(loadedWidths, [140]);

  await ops.syncSketchNow();
  await ops.pullSketchOnce(false);

  assert.equal(pullReads, 2);
  assert.deepEqual(loadedWidths, [140]);
});

test('cloud sync sketch push settles the pushed updated_at canonically so the next pull stays quiet', async () => {
  let getRowCalls = 0;
  let exportCalls = 0;
  let loadCalls = 0;
  const settledUpdatedAt = '2026-04-04T12:00:00.000Z';

  const ops = createCloudSyncSketchOps({
    App: {
      services: {
        projectIO: {
          exportCurrentProject() {
            exportCalls += 1;
            return {
              projectData: { settings: { width: 88 } },
              jsonStr: JSON.stringify({ settings: { width: 88 } }),
            };
          },
          loadProjectData() {
            loadCalls += 1;
            return { ok: true, restoreGen: loadCalls };
          },
        },
      },
    } as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'local-client',
    currentRoom: () => 'room-a',
    getRow: async () => {
      getRowCalls += 1;
      if (getRowCalls === 1) {
        return {
          updated_at: '2026-04-04T11:59:00.000Z',
          payload: {
            sketchRev: 10,
            sketchHash: 'older-remote-hash',
            sketchBy: 'remote-client',
            sketch: { settings: { width: 140 } },
          },
        } as any;
      }
      return {
        updated_at: settledUpdatedAt,
        payload: {
          sketchRev: 11,
          sketchHash: 'local-hash-88',
          sketchBy: 'local-client',
          sketch: { settings: { width: 88 } },
        },
      } as any;
    },
    upsertRow: async () => ({ ok: true }) as any,
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  const pushed = await ops.syncSketchNow();
  await ops.pullSketchOnce(false);

  assert.equal(pushed.ok, true);
  assert.equal(pushed.changed, true);
  assert.equal(typeof pushed.hash, 'string');
  assert.equal(Boolean(pushed.hash), true);
  assert.equal(getRowCalls, 3, 'push should do one compare read, one settle read, and one later pull read');
  assert.equal(exportCalls, 1, 'the quiet follow-up pull should not need to re-capture the local sketch');
  assert.equal(loadCalls, 0, 'the quiet follow-up pull should not re-apply the just-pushed sketch');
});

test('cloud sync sketch pull suppresses repeated remote payload churn when only updated_at changes', async () => {
  let rowVersion = 0;
  let exportCalls = 0;
  let loadCalls = 0;

  const ops = createCloudSyncSketchOps({
    App: {
      services: {
        projectIO: {
          exportCurrentProject() {
            exportCalls += 1;
            return {
              projectData: { settings: { width: 40 } },
              jsonStr: JSON.stringify({ settings: { width: 40 } }),
            };
          },
          loadProjectData(sketch: { settings?: { width?: number } }) {
            loadCalls += 1;
            assert.equal(sketch?.settings?.width, 120);
            return { ok: true, restoreGen: loadCalls };
          },
        },
      },
    } as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'local-client',
    currentRoom: () => 'room-a',
    getRow: async () =>
      ({
        updated_at: rowVersion++ === 0 ? '2026-04-03T10:00:00.000Z' : '2026-04-03T10:01:00.000Z',
        payload: {
          sketchRev: 10,
          sketchHash: 'remote-hash-stable',
          sketchBy: 'remote-client',
          sketch: { settings: { width: 120 } },
        },
      }) as any,
    upsertRow: async () => ({ ok: true }) as any,
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  await ops.pullSketchOnce(false);
  await ops.pullSketchOnce(false);

  assert.equal(loadCalls, 1, 'same remote payload should not re-apply just because updated_at changed');
  assert.equal(
    exportCalls,
    1,
    'same remote payload should not re-capture local sketch after it already settled'
  );
});

test('cloud sketch pull skips re-applying the same remote payload when hash is missing but object key order changes', async () => {
  let rowVersion = 0;
  let loadCalls = 0;

  const ops = createCloudSyncSketchOps({
    App: {
      services: {
        projectIO: {
          exportCurrentProject() {
            return {
              projectData: { settings: { width: 40 } },
              jsonStr: JSON.stringify({ settings: { width: 40 } }),
            };
          },
          loadProjectData(sketch: { settings?: { width?: number; height?: number }; modules?: unknown[] }) {
            loadCalls += 1;
            assert.equal(sketch?.settings?.width, 120);
            assert.equal(sketch?.settings?.height, 210);
            return { ok: true, restoreGen: loadCalls };
          },
        },
      },
    } as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'local-client',
    currentRoom: () => 'room-a',
    getRow: async () => {
      rowVersion += 1;
      return {
        updated_at: rowVersion === 1 ? '2026-04-03T10:00:00.000Z' : '2026-04-03T10:01:00.000Z',
        payload:
          rowVersion === 1
            ? {
                sketchRev: 10,
                sketchBy: 'remote-client',
                sketch: {
                  settings: { width: 120, height: 210 },
                  modules: [{ id: 'm1', size: { h: 200, w: 60 } }],
                },
              }
            : {
                sketchRev: 10,
                sketchBy: 'remote-client',
                sketch: {
                  modules: [{ size: { w: 60, h: 200 }, id: 'm1' }],
                  settings: { height: 210, width: 120 },
                },
              },
      } as any;
    },
    upsertRow: async () => ({ ok: true }) as any,
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: () => undefined,
  });

  await ops.pullSketchOnce(false);
  await ops.pullSketchOnce(false);

  assert.equal(loadCalls, 1, 'same remote payload should not re-apply when only key order changed');
});

test('floating sketch sync push shares app-scoped ownership across sketch-op instances for the same App', async () => {
  const sharedApp = {} as any;
  let resolvePush: ((value: { ok: true }) => void) | null = null;
  let pushTrueCalls = 0;
  let pushFalseCalls = 0;

  const createOps = () =>
    createCloudSyncSketchOps({
      App: sharedApp,
      cfg: {
        anonKey: 'anon',
        roomParam: 'room',
        publicRoom: 'public',
        privateRoom: 'private-room',
        site2SketchInitialAutoLoad: true,
        site2SketchInitialMaxAgeHours: 12,
      },
      storage: {},
      restUrl: 'https://example.invalid',
      clientId: 'local-client',
      currentRoom: () => 'room-a',
      getGateBaseRoom: () => 'private-room',
      getRow: async () => ({ updated_at: '2026-03-27T11:00:00.000Z', payload: {} }) as any,
      upsertRow: async (_rest, _anon, room, payload) => {
        assert.equal(room, 'private-room::syncPin');
        if (payload && (payload as any).syncPinEnabled) {
          pushTrueCalls += 1;
          return await new Promise(resolve => {
            resolvePush = resolve as typeof resolvePush;
          });
        }
        pushFalseCalls += 1;
        return { ok: true } as any;
      },
      emitRealtimeHint: () => undefined,
      runtimeStatus: { realtime: { status: 'idle' } } as any,
      publishStatus: () => undefined,
      diag: () => undefined,
    });

  const first = createOps();
  const second = createOps();

  const enableA = first.pushFloatingSketchSyncPinnedNow(true);
  const enableB = second.pushFloatingSketchSyncPinnedNow(true);
  const disable = second.pushFloatingSketchSyncPinnedNow(false);
  await Promise.resolve();

  assert.equal(enableA, enableB);
  assert.equal(pushTrueCalls, 1);
  assert.equal(pushFalseCalls, 0);
  assert.deepEqual(await disable, { ok: false, reason: 'busy' });

  resolvePush?.({ ok: true });
  assert.deepEqual(await enableA, { ok: true, changed: true, enabled: true });
});
