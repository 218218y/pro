import test from 'node:test';
import assert from 'node:assert/strict';

import {
  installConfigCompoundsService,
  isConfigCompoundsSeeded,
  seedConfigCompounds,
} from '../esm/native/services/config_compounds.ts';
import {
  ensureConfigCompoundsService,
  getConfigCompoundsServiceMaybe,
} from '../esm/native/runtime/config_compounds_access.ts';
import {
  getServiceInstallStateMaybe,
  isConfigCompoundsInstalled,
} from '../esm/native/runtime/install_state_access.ts';
import { getBootFlags } from '../esm/native/runtime/internal_state.ts';
import { applyConfigPatch } from '../esm/native/platform/store_patch_apply.ts';

test('config compounds install creates canonical service slot with stable methods', async () => {
  const App: { services?: Record<string, unknown> } = { services: Object.create(null) };

  const service = installConfigCompoundsService(App as never, { maxAttempts: 3, retryDelayMs: 1 });

  assert.equal(App.services?.configCompounds, service);
  assert.equal(service, getConfigCompoundsServiceMaybe(App));
  assert.equal(service, ensureConfigCompoundsService(App));
  assert.equal(isConfigCompoundsInstalled(App), true);
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(Object.getPrototypeOf(service), null);
  assert.equal(getServiceInstallStateMaybe(App)?.configCompoundsInstalled, true);
  assert.deepEqual(service.options, { maxAttempts: 3, retryDelayMs: 1 });
  assert.equal(typeof service.seed, 'function');
  assert.equal(typeof service.isSeeded, 'function');
  assert.equal(service.isSeeded?.(), isConfigCompoundsSeeded(App as never));

  getBootFlags(App).configCompoundsSeeded = true;
  assert.equal(service.isSeeded?.(), true);
  assert.equal(await service.seed?.(), true);
});

test('config compounds seeding materializes top modules against the live UI structure', async () => {
  let state = {
    ui: {
      doors: 5,
      structureSelect: '[2,2,1]',
      singleDoorPos: 'left',
      raw: {
        doors: 5,
        structureSelect: '[2,2,1]',
        singleDoorPos: 'left',
      },
    },
    config: { wardrobeType: 'hinged' },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 0, updatedAt: 0 },
  } as any;

  const store = {
    getState: () => state,
    patch: (payload: any, meta?: any) => {
      if (payload && typeof payload === 'object' && payload.config) {
        state = {
          ...state,
          config: applyConfigPatch(state.config, payload.config, meta, state.ui),
        };
      }
      return state;
    },
    setConfig: (patch: any, meta?: any) => {
      state = {
        ...state,
        config: applyConfigPatch(state.config, patch, meta, state.ui),
      };
      return state.config;
    },
  };

  const App: { services?: Record<string, unknown>; store: typeof store } = {
    services: Object.create(null),
    store,
  };

  const seeded = await installConfigCompoundsService(App as never, {
    maxAttempts: 1,
    retryDelayMs: 0,
  }).seed?.();
  const modules = Array.isArray(state.config.modulesConfiguration) ? state.config.modulesConfiguration : [];

  assert.equal(seeded, true);
  assert.equal(modules.length, 3);
  assert.equal(modules[0].doors, 2);
  assert.equal(modules[1].doors, 2);
  assert.equal(modules[2].doors, 1);
  assert.equal(typeof state.config.cornerConfiguration, 'object');
  assert.equal(isConfigCompoundsSeeded(App as never), true);
});

test('config compounds seed waits for a concrete config snapshot and keeps one inflight retry loop per App', async () => {
  const scheduled: Array<() => void> = [];
  let setTimeoutCalls = 0;
  let patchCalls = 0;
  let state: any = {
    ui: {
      doors: 4,
      structureSelect: '[2,2]',
      singleDoorPos: 'left',
      raw: {
        doors: 4,
        structureSelect: '[2,2]',
        singleDoorPos: 'left',
      },
    },
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 0, updatedAt: 0 },
  };

  const store = {
    getState: () => state,
    patch: (payload: any, meta?: any) => {
      if (payload && typeof payload === 'object' && payload.config) {
        patchCalls += 1;
        state = {
          ...state,
          config: applyConfigPatch(state.config || {}, payload.config, meta, state.ui),
        };
      }
      return state;
    },
    setConfig: (patch: any, meta?: any) => {
      patchCalls += 1;
      state = {
        ...state,
        config: applyConfigPatch(state.config || {}, patch, meta, state.ui),
      };
      return state.config;
    },
  };

  const App: any = {
    services: Object.create(null),
    store,
    deps: {
      browser: {
        setTimeout(fn: () => void) {
          setTimeoutCalls += 1;
          scheduled.push(fn);
          return scheduled.length;
        },
        clearTimeout() {},
      },
    },
  };

  const p1 = seedConfigCompounds(App, { maxAttempts: 3, retryDelayMs: 1 });
  const p2 = seedConfigCompounds(App, { maxAttempts: 3, retryDelayMs: 1 });

  assert.equal(setTimeoutCalls, 1);
  assert.equal(patchCalls, 0);
  assert.equal(isConfigCompoundsSeeded(App), false);
  assert.equal(Array.isArray(state.config?.modulesConfiguration), false);

  state = {
    ...state,
    config: { wardrobeType: 'hinged' },
  };

  const retry = scheduled.shift();
  assert.equal(typeof retry, 'function');
  retry?.();

  const seeded = await p1;
  const seededAgain = await p2;
  assert.equal(seeded, true);
  assert.equal(seededAgain, true);
  assert.equal(isConfigCompoundsSeeded(App), true);
  assert.equal(Array.isArray(state.config.modulesConfiguration), true);
  assert.equal(typeof state.config.cornerConfiguration, 'object');
  assert.ok(patchCalls >= 1);
});
