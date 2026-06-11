import test from 'node:test';
import assert from 'node:assert/strict';

import { installHistoryService } from '../esm/native/services/history.ts';
import { installModelsService } from '../esm/native/services/models.ts';
import { installPresetModels } from '../esm/boot/boot_manifest_shared.ts';

test('history/models install healing runtime: history reinstall preserves live refs and heals missing methods', () => {
  const App: any = {
    services: {
      history: Object.create(null),
    },
    actions: {
      history: {
        pushState() {},
        getSystem() {
          return {
            pause() {},
            resume() {},
          };
        },
      },
    },
  };

  const svc = installHistoryService(App);
  const schedulePushRef = svc.schedulePush;
  const flushPendingPushRef = svc.flushPendingPush;
  const cancelPendingPushRef = svc.cancelPendingPush;
  const hasPendingPushRef = svc.hasPendingPush;
  const pauseRef = svc.pause;
  const resumeRef = svc.resume;

  assert.equal(typeof schedulePushRef, 'function');
  assert.equal(typeof flushPendingPushRef, 'function');
  assert.equal(typeof cancelPendingPushRef, 'function');
  assert.equal(typeof hasPendingPushRef, 'function');
  assert.equal(typeof pauseRef, 'function');
  assert.equal(typeof resumeRef, 'function');

  const sameSvc = installHistoryService(App);
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.schedulePush, schedulePushRef);
  assert.equal(sameSvc.flushPendingPush, flushPendingPushRef);
  assert.equal(sameSvc.cancelPendingPush, cancelPendingPushRef);
  assert.equal(sameSvc.hasPendingPush, hasPendingPushRef);
  assert.equal(sameSvc.pause, pauseRef);
  assert.equal(sameSvc.resume, resumeRef);

  delete (svc as Record<string, unknown>).flushPendingPush;
  delete (svc as Record<string, unknown>).pause;
  const healedSvc = installHistoryService(App);
  assert.equal(healedSvc, svc);
  assert.equal(healedSvc.schedulePush, schedulePushRef);
  assert.equal(healedSvc.flushPendingPush, flushPendingPushRef);
  assert.equal(healedSvc.cancelPendingPush, cancelPendingPushRef);
  assert.equal(healedSvc.hasPendingPush, hasPendingPushRef);
  assert.equal(healedSvc.pause, pauseRef);
  assert.equal(healedSvc.resume, resumeRef);
});

test('history/models install healing runtime: models reinstall preserves canonical methods and heals drifted public slots', () => {
  const App: any = {
    services: {
      models: {
        _all: [],
        _listeners: [],
      },
    },
  };

  const models = installModelsService(App);
  const methodKeys = [
    'setNormalizer',
    'setPresets',
    'ensureLoaded',
    'getAll',
    'getById',
    'saveCurrent',
    'overwriteFromCurrent',
    'deleteById',
    'setLocked',
    'deleteTemporary',
    'move',
    'transfer',
    'apply',
    'exportUserModels',
    'mergeImportedModels',
    'onChange',
    'offChange',
  ] as const;
  const refs = new Map<string, unknown>();

  for (const key of methodKeys) {
    assert.equal(typeof models[key], 'function', key);
    refs.set(key, models[key]);
  }

  const sameModels = installModelsService(App);
  assert.equal(sameModels, models);
  for (const key of methodKeys) {
    assert.equal(sameModels[key], refs.get(key), key);
  }

  models.getAll = (() => [{ id: 'stale', name: 'stale' }]) as any;
  delete (models as Record<string, unknown>).transfer;
  delete (models as Record<string, unknown>).exportUserModels;
  delete (models as Record<string, unknown>).offChange;

  const healedModels = installModelsService(App);
  assert.equal(healedModels, models);
  for (const key of methodKeys) {
    assert.equal(healedModels[key], refs.get(key), key);
  }
});

test('history/models install healing runtime: history stable refs follow the latest owner when a shared service surface is reinstalled under another App', () => {
  const sharedHistory: any = {};
  const system1 = {
    pauseCalls: 0,
    resumeCalls: 0,
    pause() {
      this.pauseCalls += 1;
    },
    resume() {
      this.resumeCalls += 1;
    },
  };
  const system2 = {
    pauseCalls: 0,
    resumeCalls: 0,
    pause() {
      this.pauseCalls += 1;
    },
    resume() {
      this.resumeCalls += 1;
    },
  };

  const App1: any = {
    services: { history: sharedHistory },
    actions: {
      history: {
        getSystem() {
          return system1;
        },
      },
    },
  };
  const App2: any = {
    services: { history: sharedHistory },
    actions: {
      history: {
        getSystem() {
          return system2;
        },
      },
    },
  };

  const firstInstall = installHistoryService(App1);
  const pauseRef = firstInstall.pause;
  const resumeRef = firstInstall.resume;

  const secondInstall = installHistoryService(App2);
  assert.equal(secondInstall, firstInstall);
  assert.equal(secondInstall.pause, pauseRef);
  assert.equal(secondInstall.resume, resumeRef);

  secondInstall.pause();
  secondInstall.resume();

  assert.equal(system1.pauseCalls, 0);
  assert.equal(system1.resumeCalls, 0);
  assert.equal(system2.pauseCalls, 1);
  assert.equal(system2.resumeCalls, 1);
});

test('history/models install healing runtime: models stable refs follow the latest owner when a shared service surface is reinstalled under another App', () => {
  const sharedModels: any = {
    _all: [],
    _listeners: [],
  };
  const App1: any = {
    services: {
      models: sharedModels,
      storage: {
        KEYS: { SAVED_MODELS: 'savedModels' },
        getJSON(key: string, fallback: unknown) {
          if (key === 'savedModels') return [{ id: 'app1', name: 'Model From App1' }];
          return fallback;
        },
        setJSON() {},
      },
    },
  };
  const App2: any = {
    services: {
      models: sharedModels,
      storage: {
        KEYS: { SAVED_MODELS: 'savedModels' },
        getJSON(key: string, fallback: unknown) {
          if (key === 'savedModels') return [{ id: 'app2', name: 'Model From App2' }];
          return fallback;
        },
        setJSON() {},
      },
    },
  };

  const firstInstall = installModelsService(App1);
  const ensureLoadedRef = firstInstall.ensureLoaded;
  assert.deepEqual(
    firstInstall.ensureLoaded({ forceRebuild: true, silent: true }).map((model: any) => model.id),
    ['app1']
  );

  const secondInstall = installModelsService(App2);
  assert.equal(secondInstall, firstInstall);
  assert.equal(secondInstall.ensureLoaded, ensureLoadedRef);

  const loaded = secondInstall.ensureLoaded({ forceRebuild: true, silent: true });
  assert.deepEqual(
    loaded.map((model: any) => ({ id: model.id, name: model.name })),
    [{ id: 'app2', name: 'Model From App2' }]
  );
});

test('history/models install healing runtime: first install replaces placeholder models stubs with the live service bindings', () => {
  const App: any = {
    services: {
      models: {},
      storage: {
        KEYS: { SAVED_MODELS: 'savedModels' },
        getJSON(_key: string, fallback: unknown) {
          return fallback;
        },
        setJSON() {},
      },
    },
  };

  const models = installModelsService(App);
  assert.equal(models.__wpModelsServiceInstalled, true);

  models.setNormalizer(model => ({ ...model, name: `N:${String((model as any)?.name || '')}` }) as any);
  models.setPresets([{ id: 'preset-a', name: 'Preset A', isPreset: true }] as any);

  const loaded = models.ensureLoaded({ forceRebuild: true, silent: true });
  assert.deepEqual(
    loaded.map(model => ({ id: model.id, name: model.name, isPreset: !!model.isPreset })),
    [{ id: 'preset-a', name: 'N:Preset A', isPreset: true }]
  );
  assert.equal(models.getAll().length, 1);
});

test('history/models install healing runtime: preset boot step populates built-in models through the live models service', () => {
  const App: any = {
    services: {
      models: {},
      storage: {
        KEYS: { SAVED_MODELS: 'savedModels' },
        getJSON(_key: string, fallback: unknown) {
          return fallback;
        },
        setJSON() {},
      },
    },
  };

  installModelsService(App);
  assert.equal(installPresetModels(App), true);

  const loaded = App.services.models.ensureLoaded({ forceRebuild: true, silent: true });
  assert.equal(loaded.length > 0, true);
  assert.equal(
    loaded.every((model: any) => model && model.isPreset),
    true
  );
});
