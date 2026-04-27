import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const projectRoot = process.cwd();
const sharedModuleCache = new Map();
let activeReportCalls = null;
let loadedCloudSyncUiActionControllerModule = null;

function pushReportCall(entry) {
  if (!activeReportCalls) throw new Error('cloud sync ui controller test report sink is not installed');
  activeReportCalls.push(entry);
}

function loadCloudSyncUiActionControllerModule(reportCalls) {
  activeReportCalls = reportCalls;
  if (loadedCloudSyncUiActionControllerModule) return loadedCloudSyncUiActionControllerModule;

  function loadModule(resolvedPath) {
    const normalized = path.normalize(resolvedPath);
    if (sharedModuleCache.has(normalized)) return sharedModuleCache.get(normalized).exports;

    const source = fs.readFileSync(normalized, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: normalized,
    }).outputText;

    const mod = { exports: {} };
    sharedModuleCache.set(normalized, mod);

    const localRequire = specifier => {
      if (specifier === '../../services/api.js') {
        return {
          normalizeUnknownError: (err, fallbackMessage = '') => ({
            message:
              err && typeof err === 'object' && typeof err.message === 'string' && err.message.trim()
                ? err.message.trim()
                : typeof err === 'string' && err.trim()
                  ? err.trim()
                  : fallbackMessage || 'Unexpected error',
          }),
        };
      }
      if (specifier === '../action_family_singleflight.js') {
        return require('../esm/native/ui/action_family_singleflight.ts');
      }
      if (specifier === '../cloud_sync_action_feedback.js') {
        return {
          reportCloudSyncRoomModeResult: (fb, result) => pushReportCall(['roomMode', fb, result]),
          reportCloudSyncShareLinkResult: (fb, result) => pushReportCall(['shareLink', fb, result]),
          reportCloudSketchSyncResult: (fb, result) => pushReportCall(['syncSketch', fb, result]),
          reportCloudDeleteTempResult: (fb, result, kind) => pushReportCall(['deleteTemp', fb, result, kind]),
          reportFloatingSketchSyncPinResult: (fb, result) => pushReportCall(['floatingSync', fb, result]),
          reportSite2TabsGateResult: (fb, result) => pushReportCall(['site2TabsGate', fb, result]),
        };
      }
      if (specifier === '../cloud_sync_mutation_commands.js') {
        return {
          syncSketchNowCommand: async () => ({ ok: false, reason: 'not-installed' }),
          deleteTemporaryModelsWithConfirm: async () => ({ ok: false, removed: 0, reason: 'not-installed' }),
          deleteTemporaryColorsWithConfirm: async () => ({ ok: false, removed: 0, reason: 'not-installed' }),
        };
      }
      if (specifier === './actions/cloud_sync_actions.js') {
        return {
          copyCloudSyncShareLink: async () => ({ ok: false, reason: 'not-installed' }),
          goCloudSyncPublic: () => ({ ok: false, mode: 'public', reason: 'not-installed' }),
          goCloudSyncPrivate: () => ({ ok: false, mode: 'private', reason: 'not-installed' }),
          setFloatingSketchSyncEnabled: async () => ({ ok: false, reason: 'not-installed' }),
          toggleFloatingSketchSyncEnabled: async () => ({ ok: false, reason: 'not-installed' }),
          toggleSite2TabsGate: async () => ({ ok: false, reason: 'not-installed' }),
        };
      }
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const jsResolved = path.resolve(path.dirname(normalized), specifier);
        const tsResolved = jsResolved.endsWith('.js') ? `${jsResolved.slice(0, -3)}.ts` : `${jsResolved}.ts`;
        if (fs.existsSync(tsResolved)) return loadModule(tsResolved);
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

  loadedCloudSyncUiActionControllerModule = loadModule(
    path.join(projectRoot, 'esm/native/ui/react/cloud_sync_ui_action_controller_runtime.ts')
  );
  return loadedCloudSyncUiActionControllerModule;
}

test('[cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam', async () => {
  const reportCalls = [];
  const mod = loadCloudSyncUiActionControllerModule(reportCalls);
  const fb = { toast() {} };
  const actionCalls = [];
  const controller = mod.createCloudSyncUiActionController({
    app: { id: 'app' },
    fb,
    goCloudSyncPublic: app => {
      actionCalls.push(['goPublic', app]);
      return { ok: true, changed: true, mode: 'public' };
    },
    goCloudSyncPrivate: app => {
      actionCalls.push(['goPrivate', app]);
      return { ok: true, changed: true, mode: 'private' };
    },
    copyCloudSyncShareLink: async app => {
      actionCalls.push(['copyShareLink', app]);
      return { ok: true, copied: true };
    },
    syncSketchNowCommand: async app => {
      actionCalls.push(['syncSketch', app]);
      return { ok: true, changed: true, hash: 'h1' };
    },
    deleteTemporaryModelsWithConfirm: async app => {
      actionCalls.push(['deleteModels', app]);
      return { ok: true, removed: 3 };
    },
    deleteTemporaryColorsWithConfirm: async app => {
      actionCalls.push(['deleteColors', app]);
      return { ok: false, removed: 0, reason: 'cancelled' };
    },
    setFloatingSketchSyncEnabled: async (app, enabled) => {
      actionCalls.push(['setFloating', app, enabled]);
      return { ok: true, changed: true, enabled };
    },
    toggleFloatingSketchSyncEnabled: async app => {
      actionCalls.push(['toggleFloating', app]);
      return { ok: true, changed: true, enabled: false };
    },
    toggleSite2TabsGate: async (app, nextOpen, meta) => {
      actionCalls.push(['toggleSite2Gate', app, nextOpen, meta]);
      return { ok: true, changed: true, open: nextOpen, until: 123 };
    },
  });

  assert.equal(
    JSON.stringify(controller.toggleRoomMode(false)),
    JSON.stringify({ ok: true, changed: true, mode: 'public' })
  );
  assert.equal(
    JSON.stringify(controller.toggleRoomMode(true)),
    JSON.stringify({ ok: true, changed: true, mode: 'private' })
  );
  await controller.copyShareLink();
  await controller.syncSketch();
  await controller.deleteTemporaryModels();
  await controller.deleteTemporaryColors();
  await controller.setFloatingSyncEnabled(true);
  await controller.toggleFloatingSyncEnabled();
  await controller.toggleSite2TabsGate(true, { source: 'react:site2:tabsGate' });

  assert.equal(
    JSON.stringify(actionCalls),
    JSON.stringify([
      ['goPublic', { id: 'app' }],
      ['goPrivate', { id: 'app' }],
      ['copyShareLink', { id: 'app' }],
      ['syncSketch', { id: 'app' }],
      ['deleteModels', { id: 'app' }],
      ['deleteColors', { id: 'app' }],
      ['setFloating', { id: 'app' }, true],
      ['toggleFloating', { id: 'app' }],
      ['toggleSite2Gate', { id: 'app' }, true, { source: 'react:site2:tabsGate' }],
    ])
  );
  assert.equal(
    JSON.stringify(reportCalls.map(entry => [entry[0], entry[2], entry[3] ?? null])),
    JSON.stringify([
      ['roomMode', { ok: true, changed: true, mode: 'public' }, null],
      ['roomMode', { ok: true, changed: true, mode: 'private' }, null],
      ['shareLink', { ok: true, copied: true }, null],
      ['syncSketch', { ok: true, changed: true, hash: 'h1' }, null],
      ['deleteTemp', { ok: true, removed: 3 }, 'models'],
      ['deleteTemp', { ok: false, removed: 0, reason: 'cancelled' }, 'colors'],
      ['floatingSync', { ok: true, changed: true, enabled: true }, null],
      ['floatingSync', { ok: true, changed: true, enabled: false }, null],
      ['site2TabsGate', { ok: true, changed: true, open: true, until: 123 }, null],
    ])
  );
});

test('[cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations', async () => {
  const reportCalls = [];
  const mod = loadCloudSyncUiActionControllerModule(reportCalls);
  let resolveSketch;
  const sketchPromise = new Promise(resolve => {
    resolveSketch = resolve;
  });
  let syncCalls = 0;
  let shareCalls = 0;
  const floatingCalls = [];
  const gateCalls = [];
  const app = { id: 'app' };
  const firstController = mod.createCloudSyncUiActionController({
    app,
    fb: { toast() {} },
    copyCloudSyncShareLink: async () => {
      shareCalls += 1;
      return { ok: true, copied: true, call: shareCalls };
    },
    syncSketchNowCommand: async currentApp => {
      syncCalls += 1;
      await sketchPromise;
      return { ok: true, changed: true, hash: `h${syncCalls}`, appId: currentApp.id };
    },
    setFloatingSketchSyncEnabled: async (_app, enabled) => {
      floatingCalls.push(`set:${enabled ? '1' : '0'}`);
      return { ok: true, changed: true, enabled };
    },
    toggleFloatingSketchSyncEnabled: async () => {
      floatingCalls.push('toggle');
      return { ok: true, changed: true, enabled: false };
    },
    toggleSite2TabsGate: async (_app, nextOpen, meta) => {
      gateCalls.push([nextOpen, meta]);
      return { ok: true, changed: true, open: nextOpen, until: 321 };
    },
  });
  const secondController = mod.createCloudSyncUiActionController({
    app,
    fb: { toast() {} },
    copyCloudSyncShareLink: async () => {
      shareCalls += 1;
      return { ok: true, copied: true, call: shareCalls };
    },
    syncSketchNowCommand: async currentApp => {
      syncCalls += 1;
      await sketchPromise;
      return { ok: true, changed: true, hash: `h${syncCalls}`, appId: currentApp.id };
    },
    setFloatingSketchSyncEnabled: async (_app, enabled) => {
      floatingCalls.push(`set:${enabled ? '1' : '0'}`);
      return { ok: true, changed: true, enabled };
    },
    toggleFloatingSketchSyncEnabled: async () => {
      floatingCalls.push('toggle');
      return { ok: true, changed: true, enabled: false };
    },
    toggleSite2TabsGate: async (_app, nextOpen, meta) => {
      gateCalls.push([nextOpen, meta]);
      return { ok: true, changed: true, open: nextOpen, until: 321 };
    },
  });

  const firstSync = firstController.syncSketch();
  const secondSync = secondController.syncSketch();
  const firstShare = firstController.copyShareLink();
  const secondShare = secondController.copyShareLink();
  await Promise.resolve();
  assert.equal(
    syncCalls,
    1,
    'duplicate syncSketch calls across controllers should reuse one inflight command'
  );
  assert.equal(
    shareCalls,
    1,
    'duplicate share-link calls across controllers should reuse one inflight command'
  );
  resolveSketch();
  await Promise.all([firstSync, secondSync, firstShare, secondShare]);

  await Promise.all([
    firstController.setFloatingSyncEnabled(true),
    secondController.setFloatingSyncEnabled(true),
    firstController.toggleFloatingSyncEnabled(),
    firstController.toggleSite2TabsGate(true, { source: 'react:site2:tabsGate', tag: 'first' }),
    secondController.toggleSite2TabsGate(true, { source: 'react:site2:tabsGate', tag: 'second' }),
    firstController.toggleSite2TabsGate(false, { source: 'react:site2:tabsGate', tag: 'conflict' }),
  ]);

  assert.equal(syncCalls, 1);
  assert.equal(shareCalls, 1);
  assert.equal(
    JSON.stringify(floatingCalls),
    JSON.stringify(['set:1']),
    'same floating target should dedupe while conflicting floating commands should report busy instead of running'
  );
  assert.equal(
    JSON.stringify(gateCalls),
    JSON.stringify([[true, { source: 'react:site2:tabsGate', tag: 'first' }]]),
    'same tabs-gate target should dedupe while conflicting tabs-gate commands should report busy instead of running'
  );
  assert.equal(
    JSON.stringify(reportCalls.map(entry => [entry[0], entry[2], entry[3] ?? null])),
    JSON.stringify([
      ['shareLink', { ok: true, copied: true, call: 1 }, null],
      ['syncSketch', { ok: true, changed: true, hash: 'h1', appId: 'app' }, null],
      ['floatingSync', { ok: false, reason: 'busy' }, null],
      ['site2TabsGate', { ok: false, reason: 'busy' }, null],
      ['floatingSync', { ok: true, changed: true, enabled: true }, null],
      ['site2TabsGate', { ok: true, changed: true, open: true, until: 321 }, null],
    ])
  );
});

test('[cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads', async () => {
  const reportCalls = [];
  const mod = loadCloudSyncUiActionControllerModule(reportCalls);
  const controller = mod.createCloudSyncUiActionController({
    app: { id: 'app' },
    fb: { toast() {} },
    goCloudSyncPublic: () => {
      throw new Error('boom room');
    },
    goCloudSyncPrivate: () => {
      throw new Error('boom room');
    },
    copyCloudSyncShareLink: async () => {
      throw new Error('boom share');
    },
    syncSketchNowCommand: async () => {
      throw new Error('boom sketch');
    },
    deleteTemporaryModelsWithConfirm: async () => {
      throw new Error('boom delete models');
    },
    deleteTemporaryColorsWithConfirm: async () => {
      throw new Error('boom delete colors');
    },
    setFloatingSketchSyncEnabled: async () => {
      throw new Error('boom set pin');
    },
    toggleFloatingSketchSyncEnabled: async () => {
      throw new Error('boom toggle pin');
    },
    toggleSite2TabsGate: async () => {
      throw new Error('boom gate');
    },
  });

  assert.equal(
    JSON.stringify(controller.toggleRoomMode(false)),
    JSON.stringify({ ok: false, mode: 'public', reason: 'error', message: 'boom room' })
  );
  assert.equal(
    JSON.stringify(controller.toggleRoomMode(true)),
    JSON.stringify({ ok: false, mode: 'private', reason: 'error', message: 'boom room' })
  );
  await controller.copyShareLink();
  await controller.syncSketch();
  await controller.deleteTemporaryModels();
  await controller.deleteTemporaryColors();
  await controller.setFloatingSyncEnabled(false);
  await controller.toggleFloatingSyncEnabled();
  await controller.toggleSite2TabsGate(false, { source: 'react:site2:tabsGate' });

  assert.equal(
    JSON.stringify(reportCalls.map(entry => [entry[0], entry[2], entry[3] ?? null])),
    JSON.stringify([
      ['roomMode', { ok: false, mode: 'public', reason: 'error', message: 'boom room' }, null],
      ['roomMode', { ok: false, mode: 'private', reason: 'error', message: 'boom room' }, null],
      ['shareLink', { ok: false, reason: 'error', message: 'boom share' }, null],
      ['syncSketch', { ok: false, reason: 'error', message: 'boom sketch' }, null],
      ['deleteTemp', { ok: false, removed: 0, reason: 'error', message: 'boom delete models' }, 'models'],
      ['deleteTemp', { ok: false, removed: 0, reason: 'error', message: 'boom delete colors' }, 'colors'],
      ['floatingSync', { ok: false, reason: 'error', message: 'boom set pin' }, null],
      ['floatingSync', { ok: false, reason: 'error', message: 'boom toggle pin' }, null],
      ['site2TabsGate', { ok: false, reason: 'error', message: 'boom gate' }, null],
    ])
  );
});

test('[cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation', async () => {
  const reportCalls = [];
  const mod = loadCloudSyncUiActionControllerModule(reportCalls);
  const originalMeta = { source: 'react:site2:tabsGate', tag: 'original' };
  let commandMeta = null;
  const controller = mod.createCloudSyncUiActionController({
    app: { id: 'app' },
    fb: { toast() {} },
    toggleSite2TabsGate: async (_app, nextOpen, meta) => {
      commandMeta = meta;
      meta.tag = 'mutated-in-command';
      meta.extra = 'command-owned';
      return { ok: true, changed: true, open: nextOpen, until: 777 };
    },
  });

  await controller.toggleSite2TabsGate(true, originalMeta);

  assert.notEqual(commandMeta, originalMeta, 'command should receive a detached meta object');
  assert.equal(originalMeta.tag, 'original');
  assert.equal('extra' in originalMeta, false);
  assert.equal(
    JSON.stringify(reportCalls.map(entry => [entry[0], entry[2], entry[3] ?? null])),
    JSON.stringify([['site2TabsGate', { ok: true, changed: true, open: true, until: 777 }, null]])
  );
});
