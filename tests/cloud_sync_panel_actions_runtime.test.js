import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

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
    const normalized = path.normalize(resolvedPath);
    if (moduleCache.has(normalized)) return moduleCache.get(normalized).exports;

    const source = fs.readFileSync(normalized, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: normalized,
    }).outputText;

    const mod = { exports: {} };
    moduleCache.set(normalized, mod);

    const localRequire = specifier => {
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
            },
        };
      }
      if (specifier === '../hooks.js') {
        return {
          useApp: () => app,
          useUiFeedback: () => fb,
        };
      }
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const jsResolved = path.resolve(path.dirname(normalized), specifier);
        const tsResolved = jsResolved.endsWith('.js') ? `${jsResolved.slice(0, -3)}.ts` : `${jsResolved}.ts`;
        const tsxResolved = jsResolved.endsWith('.js')
          ? `${jsResolved.slice(0, -3)}.tsx`
          : `${jsResolved}.tsx`;
        if (fs.existsSync(tsResolved)) return loadModule(tsResolved);
        if (fs.existsSync(tsxResolved)) return loadModule(tsxResolved);
        if (fs.existsSync(jsResolved)) return loadModule(jsResolved);
      }
      return require(specifier);
    };

    const sandbox = {
      module: mod,
      exports: mod.exports,
      require: localRequire,
      __dirname: path.dirname(normalized),
      __filename: normalized,
      console,
      process,
      setTimeout,
      clearTimeout,
    };
    vm.runInNewContext(transpiled, sandbox, { filename: normalized });
    return mod.exports;
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
  assert.equal(panelSnapshotSubscribers.length, 0, 'subscribe shim should clean up immediately');

  state.handleToggleRoomMode();
  state.handleCopy();
  state.handleSyncSketch();
  state.handleDeleteModels();
  state.handleDeleteColors();
  await state.handleFloatingSyncChange(true);

  assert.deepEqual(controllerCalls, [
    ['toggleRoomMode', true],
    ['copyShareLink'],
    ['syncSketch'],
    ['deleteTemporaryModels'],
    ['deleteTemporaryColors'],
    ['setFloatingSyncEnabled', true],
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
