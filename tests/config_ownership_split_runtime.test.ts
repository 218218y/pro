import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readConfigBoolFromApp,
  readConfigScalarOrDefaultFromApp,
} from '../esm/native/runtime/config_selectors.ts';
import {
  readRuntimeConfigBooleanFromApp,
  readRuntimeConfigNumberFromApp,
  readRuntimeConfigValueFromApp,
} from '../esm/native/runtime/runtime_config_selectors.ts';
import { readMirrorFrameConfigFromApp } from '../esm/native/runtime/mirror_config_access.ts';
import { getConcreteCfgSnapshot } from '../esm/native/services/config_compounds_shared.ts';

type AnyRecord = Record<string, unknown>;

function makeStore(config: AnyRecord) {
  return {
    getState() {
      return { config };
    },
  };
}

test('runtime config selectors read App.config only and never fall back to store.config', () => {
  const App = {
    config: {
      DOOR_DELAY_MS: 875,
      PERSIST_EDIT_STATE: true,
      site2EnabledTabs: ['settings'],
    },
    store: makeStore({
      DOOR_DELAY_MS: 125,
      PERSIST_EDIT_STATE: false,
      site2EnabledTabs: ['structure'],
    }),
  };

  assert.equal(readRuntimeConfigNumberFromApp(App, 'DOOR_DELAY_MS', 600), 875);
  assert.equal(readRuntimeConfigBooleanFromApp(App, 'PERSIST_EDIT_STATE', false), true);
  assert.deepEqual(readRuntimeConfigValueFromApp(App, 'site2EnabledTabs'), ['settings']);

  const AppWithoutRuntimeValues = {
    config: {},
    store: makeStore({ DOOR_DELAY_MS: 125, PERSIST_EDIT_STATE: true }),
  };
  assert.equal(readRuntimeConfigNumberFromApp(AppWithoutRuntimeValues, 'DOOR_DELAY_MS', 600), 600);
  assert.equal(readRuntimeConfigBooleanFromApp(AppWithoutRuntimeValues, 'PERSIST_EDIT_STATE', false), false);
});

test('store config selectors read store.config only and never fall back to App.config', () => {
  const App = {
    config: {
      MIRROR_REFLECTOR_ENABLED: true,
      wardrobeType: 'sliding',
    },
    store: makeStore({
      MIRROR_REFLECTOR_ENABLED: false,
      wardrobeType: 'hinged',
    }),
  };

  assert.equal(readConfigBoolFromApp(App, 'MIRROR_REFLECTOR_ENABLED', true), false);
  assert.equal(readConfigScalarOrDefaultFromApp(App, 'wardrobeType'), 'hinged');

  const AppWithoutStoreValues = {
    config: { MIRROR_REFLECTOR_ENABLED: false, wardrobeType: 'sliding' },
    store: makeStore({}),
  };
  assert.equal(readConfigBoolFromApp(AppWithoutStoreValues, 'MIRROR_REFLECTOR_ENABLED', true), true);
  assert.equal(readConfigScalarOrDefaultFromApp(AppWithoutStoreValues, 'wardrobeType'), 'hinged');
});

test('mirror config composition keeps persistent enablement separate from runtime tuning', () => {
  const App = {
    config: {
      MIRROR_REFLECTOR_ENABLED: true,
      MIRROR_UPDATE_MS: 720,
      MIRROR_MOVE_UPDATE_MS: 900,
      MIRROR_FRAME_BUDGET_MS: 18,
      MIRROR_MOVE_FRAME_BUDGET_MS: 9,
      MIRROR_DISABLE_DURING_MOTION: false,
    },
    store: makeStore({ MIRROR_REFLECTOR_ENABLED: false }),
  };

  assert.deepEqual(readMirrorFrameConfigFromApp(App as never), {
    baseIntervalMs: 720,
    moveIntervalMs: 900,
    idleFrameBudgetMs: 18,
    moveFrameBudgetMs: 9,
    reflectorEnabled: false,
    disableDuringMotion: false,
  });

  const AppWithoutPersistentValue = {
    config: { MIRROR_REFLECTOR_ENABLED: false },
    store: makeStore({}),
  };
  assert.equal(readMirrorFrameConfigFromApp(AppWithoutPersistentValue as never).reflectorEnabled, true);
});

test('config compounds wait for the persistent store instead of treating runtime config as a store snapshot', () => {
  const runtimeOnly = {
    config: {
      modulesConfiguration: [{ width: 999 }],
      cornerConfiguration: { layout: 'drawers' },
    },
  };
  assert.equal(getConcreteCfgSnapshot(runtimeOnly as never), null);

  const persistentConfig = {
    modulesConfiguration: [{ width: 61 }],
    cornerConfiguration: { layout: 'shelves' },
  };
  const App = {
    config: runtimeOnly.config,
    store: makeStore(persistentConfig),
  };
  assert.deepEqual(getConcreteCfgSnapshot(App as never), persistentConfig);
});
