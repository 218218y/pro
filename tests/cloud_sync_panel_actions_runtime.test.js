import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function createReactStub() {
  function useRef(initialValue) {
    return { current: initialValue };
  }
  function useCallback(fn) {
    return fn;
  }
  function useMemo(factory) {
    return factory();
  }
  function useSyncExternalStore(subscribe, getSnapshot) {
    try {
      const unsub = subscribe(() => undefined);
      if (typeof unsub === 'function') unsub();
    } catch {
      // ignore subscribe failures in test shim
    }
    return getSnapshot();
  }
  return {
    __esModule: true,
    default: { useRef, useCallback, useMemo, useSyncExternalStore },
    useRef,
    useCallback,
    useMemo,
    useSyncExternalStore,
  };
}

function loadCloudSyncPanelActionsModule(options = {}) {
  const projectRoot = process.cwd();
  const moduleCache = new Map();
  const app = options.app || { id: 'app' };
  const fb = options.fb || { toast() {} };
  const api = options.api;
  const controller = options.controller;
  const controllerCalls = options.controllerCalls || [];
  const perfCalls = options.perfCalls || [];

  function loadModule(resolvedPath) {
    return loadTsRuntimeModule(resolvedPath, {
      cache: moduleCache,
      transformOptions: { esbuildOptions: { jsx: 'automatic' } },
      mock: specifier => {
        if (specifier === 'react') return createReactStub();
        if (specifier === '../../../services/api.js') {
          return {
            getCloudSyncServiceMaybe: () => api,
            buildPerfEntryOptionsFromActionResult: result => ({ result }),
            runPerfAction: (_app, name, run, options) => {
              const result = run();
              if (result && typeof result.then === 'function') {
                return Promise.resolve(result).then(resolved => {
                  perfCalls.push([
                    name,
                    options?.detail ?? null,
                    options?.resolveEndOptions ? options.resolveEndOptions(resolved) : null,
                  ]);
                  return resolved;
                });
              }
              perfCalls.push([
                name,
                options?.detail ?? null,
                options?.resolveEndOptions ? options.resolveEndOptions(result) : null,
              ]);
              return result;
            },
          };
        }
        if (specifier === '../cloud_sync_ui_action_controller_runtime.js') {
          return {
            createCloudSyncUiActionController: () =>
              controller || {
                toggleRoomMode: isPublic => {
                  controllerCalls.push(['toggleRoomMode', isPublic]);
                  return { ok: true, changed: true, mode: isPublic ? 'private' : 'public' };
                },
                copyShareLink: async () => {
                  controllerCalls.push(['copyShareLink']);
                  return { ok: true, copied: true };
                },
                syncSketch: async () => {
                  controllerCalls.push(['syncSketch']);
                  return { ok: true, changed: true };
                },
                deleteTemporaryModels: async () => {
                  controllerCalls.push(['deleteTemporaryModels']);
                  return { ok: true, removed: 2 };
                },
                deleteTemporaryColors: async () => {
                  controllerCalls.push(['deleteTemporaryColors']);
                  return { ok: false, reason: 'cancelled' };
                },
                setFloatingSyncEnabled: async enabled => {
                  controllerCalls.push(['setFloatingSyncEnabled', enabled]);
                  return { ok: true, changed: true, enabled };
                },
                resolveConflict: async resolution => {
                  controllerCalls.push(['resolveConflict', resolution]);
                  return {
                    ok: false,
                    resolution,
                    reason: 'write',
                  };
                },
              },
          };
        }
        if (specifier === '../hooks.js') {
          return {
            useApp: () => app,
            useUiFeedback: () => fb,
          };
        }
        return undefined;
      },
    });
  }

  return loadModule(path.join(projectRoot, 'esm/native/ui/react/panels/cloud_sync_panel_actions.ts'));
}

test('cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller', async () => {
  const controllerCalls = [];
  const perfCalls = [];
  const panelSnapshotSubscribers = [];
  const api = {
    getPanelSnapshot: () => ({
      room: 'public',
      isPublic: true,
      status: 'מצב: ציבורי (כולם רואים)',
      floatingSync: false,
      conflict: {
        room: 'public',
        keys: ['savedColors'],
        remoteRevision: 4,
        detectedAt: 12,
        state: 'awaiting-resolution',
      },
    }),
    subscribePanelSnapshot(cb) {
      panelSnapshotSubscribers.push(cb);
      return () => {
        const index = panelSnapshotSubscribers.indexOf(cb);
        if (index >= 0) panelSnapshotSubscribers.splice(index, 1);
      };
    },
  };

  const mod = loadCloudSyncPanelActionsModule({ api, controllerCalls, perfCalls });
  const state = mod.useCloudSyncPanelActions();

  assert.equal(state.api, api);
  assert.equal(state.status, 'מצב: ציבורי (כולם רואים)');
  assert.equal(state.isPublic, true);
  assert.equal(state.floatingSync, false);
  assert.deepEqual(state.conflict?.keys, ['savedColors']);
  assert.equal(panelSnapshotSubscribers.length, 0, 'subscribe shim should clean up immediately');

  state.handleToggleRoomMode();
  state.handleCopy();
  state.handleSyncSketch();
  state.handleDeleteModels();
  state.handleDeleteColors();
  await state.handleFloatingSyncChange(true);
  state.handleResolveConflict('keep-local');
  await Promise.resolve();

  assert.deepEqual(controllerCalls, [
    ['toggleRoomMode', true],
    ['copyShareLink'],
    ['syncSketch'],
    ['deleteTemporaryModels'],
    ['deleteTemporaryColors'],
    ['setFloatingSyncEnabled', true],
    ['resolveConflict', 'keep-local'],
  ]);

  assert.equal(
    JSON.stringify(perfCalls),
    JSON.stringify([
      [
        'cloudSync.roomMode.toggle',
        { isPublic: true },
        { result: { ok: true, changed: true, mode: 'private' } },
      ],
      ['cloudSync.copyLink', null, { result: { ok: true, copied: true } }],
      ['cloudSync.syncSketch', null, { result: { ok: true, changed: true } }],
      ['cloudSync.deleteTemporaryModels', null, { result: { ok: true, removed: 2 } }],
      ['cloudSync.deleteTemporaryColors', null, { result: { ok: false, reason: 'cancelled' } }],
      [
        'cloudSync.floatingSync.toggle',
        { enabled: true },
        { result: { ok: true, changed: true, enabled: true } },
      ],
      [
        'cloudSync.conflict.keep-local',
        { resolution: 'keep-local', keys: ['savedColors'] },
        { result: { ok: false, resolution: 'keep-local', reason: 'write' } },
      ],
    ])
  );
});

test('cloud sync panel actions fall back to derived status when panel snapshot api is unavailable', () => {
  const api = {
    getCurrentRoom: () => 'private-room',
    getPublicRoom: () => 'public',
    isFloatingSketchSyncEnabled: () => true,
  };

  const mod = loadCloudSyncPanelActionsModule({ api, controllerCalls: [] });
  const state = mod.useCloudSyncPanelActions();

  assert.equal(state.status, 'מצב: חדר פרטי (private-room)');
  assert.equal(state.isPublic, false);
  assert.equal(state.floatingSync, true);
});
