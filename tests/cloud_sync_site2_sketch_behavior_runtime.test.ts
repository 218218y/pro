import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncSketchOps } from '../esm/native/services/cloud_sync_sketch_ops.ts';

type Harness = {
  App: any;
  loadedWidths: number[];
  toastCalls: Array<{ msg: string; type?: string }>;
};

function createSketchHarness(siteVariant: 'main' | 'site2'): Harness {
  const loadedWidths: number[] = [];
  const toastCalls: Array<{ msg: string; type?: string }> = [];
  const App = {
    store: {
      getState() {
        return { config: { siteVariant } };
      },
    },
    services: {
      uiFeedback: {
        toast(msg: string, type?: string) {
          toastCalls.push({ msg, type });
        },
      },
      projectIO: {
        exportCurrentProject() {
          return {
            projectData: { settings: { width: siteVariant === 'site2' ? 80 : 40 } },
            jsonStr: JSON.stringify({ settings: { width: siteVariant === 'site2' ? 80 : 40 } }),
          };
        },
        loadProjectData(sketch: { settings?: { width?: number } }) {
          loadedWidths.push(Number(sketch?.settings?.width || 0));
          return { ok: true, restoreGen: loadedWidths.length };
        },
      },
    },
  } as any;
  return { App, loadedWidths, toastCalls };
}

test('cloud sketch initial catchup is site2-only even when the remote row is fresh', async () => {
  const updatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const mainHarness = createSketchHarness('main');
  const site2Harness = createSketchHarness('site2');
  const mainDiag: string[] = [];
  const site2Diag: string[] = [];

  const createOps = (App: any, clientId: string, diagSink: string[]) =>
    createCloudSyncSketchOps({
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
      clientId,
      currentRoom: () => 'room-a',
      getRow: async () =>
        ({
          updated_at: updatedAt,
          payload: {
            sketchRev: 5,
            sketchHash: 'remote-fresh',
            sketchBy: 'remote-client',
            sketch: { settings: { width: 140 } },
          },
        }) as any,
      upsertRow: async () => ({ ok: true }) as any,
      emitRealtimeHint: () => undefined,
      runtimeStatus: { realtime: { status: 'idle' } } as any,
      publishStatus: () => undefined,
      diag: (event: string) => {
        diagSink.push(event);
      },
    });

  await createOps(mainHarness.App, 'main-client', mainDiag).pullSketchOnce(true);
  await createOps(site2Harness.App, 'site2-client', site2Diag).pullSketchOnce(true);

  assert.deepEqual(mainHarness.loadedWidths, []);
  assert.deepEqual(mainHarness.toastCalls, []);
  assert.deepEqual(mainDiag, []);

  assert.deepEqual(site2Harness.loadedWidths, [140]);
  assert.deepEqual(site2Harness.toastCalls, [{ msg: 'סקיצה חדשה התעדכנה', type: 'success' }]);
  assert.deepEqual(site2Diag, ['sketch:init-catchup:apply']);
});

test('cloud sketch stale initial catchup does not block the next fresh site2 update', async () => {
  const loadedWidths: number[] = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];
  const toastCalls: Array<{ msg: string; type?: string }> = [];
  let callCount = 0;

  const App = {
    store: {
      getState() {
        return { config: { siteVariant: 'site2' } };
      },
    },
    services: {
      uiFeedback: {
        toast(msg: string, type?: string) {
          toastCalls.push({ msg, type });
        },
      },
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
  } as any;

  const ops = createCloudSyncSketchOps({
    App,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public',
      site2SketchInitialAutoLoad: true,
      site2SketchInitialMaxAgeHours: 1,
    },
    storage: {},
    restUrl: 'https://example.invalid',
    clientId: 'site2-client',
    currentRoom: () => 'room-a',
    getRow: async () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          updated_at: '2026-03-27T08:00:00.000Z',
          payload: {
            sketchRev: 1,
            sketchHash: 'stale-remote',
            sketchBy: 'main-client',
            sketch: { settings: { width: 111 } },
          },
        } as any;
      }
      return {
        updated_at: '2026-03-27T11:30:00.000Z',
        payload: {
          sketchRev: 2,
          sketchHash: 'fresh-remote',
          sketchBy: 'main-client',
          sketch: { settings: { width: 222 } },
        },
      } as any;
    },
    upsertRow: async () => ({ ok: true }) as any,
    emitRealtimeHint: () => undefined,
    runtimeStatus: { realtime: { status: 'idle' } } as any,
    publishStatus: () => undefined,
    diag: (event: string, payload: unknown) => {
      diagCalls.push({ event, payload });
    },
  });

  await ops.pullSketchOnce(true);
  assert.deepEqual(loadedWidths, []);
  assert.equal(diagCalls.at(-1)?.event, 'sketch:init-catchup:skip-stale');
  assert.deepEqual(toastCalls, []);

  await ops.pullSketchOnce(false);
  assert.deepEqual(loadedWidths, [222]);
  assert.deepEqual(toastCalls, [{ msg: 'סקיצה חדשה התעדכנה', type: 'success' }]);
});
