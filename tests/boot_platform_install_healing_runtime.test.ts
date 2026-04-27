import test from 'node:test';
import assert from 'node:assert/strict';

import { installAppStartService } from '../esm/native/services/app_start.ts';
import { installBootFinalizers } from '../esm/native/services/boot_finalizers.ts';
import { installBootMain } from '../esm/native/platform/boot_main.ts';
import { installSmokeChecks } from '../esm/native/platform/smoke_checks.ts';

function createSmokeApp(): Record<string, unknown> {
  const rootState = {
    config: {
      modulesConfiguration: [{}],
      cornerConfiguration: {},
    },
    ui: {},
    runtime: { systemReady: true },
    meta: { dirty: false },
    mode: {},
  };

  return {
    deps: { builder: { __ready: true } },
    config: {},
    flags: {},
    platform: { util: {} },
    actions: {
      doors: {
        setHinge: () => undefined,
      },
      modules: {
        setWidth: () => undefined,
      },
    },
    render: {
      renderer: null,
      scene: null,
      camera: null,
      controls: null,
      wardrobeGroup: null,
      roomGroup: null,
      doorsArray: [],
      drawersArray: [],
      moduleHitBoxes: [],
      _partObjects: [],
    },
    ui: {},
    layers: {},
    services: {
      builder: {
        requestBuild: () => true,
        buildWardrobe() {
          return undefined;
        },
      },
    },
    state: {},
    registries: {},
    builder: {},
    builderDeps: {},
    builderModules: {},
    builderContents: {},
    store: {
      getState: () => rootState,
      patch: () => undefined,
      subscribe: () => () => undefined,
    },
    disposables: [],
  };
}

test('app_start reinstall heals drifted public service slots in place', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      uiBoot: {
        bootMain() {
          calls.push('bootMain');
        },
      },
    },
  };

  const service = installAppStartService(App);
  const canonicalStart = service.start;
  const canonicalUiStart = App.services.uiBoot.start;

  service.start = () => calls.push('foreign:start');
  App.services.uiBoot.start = () => calls.push('foreign:uiStart');

  installAppStartService(App);

  assert.equal(service.start, canonicalStart);
  assert.equal(App.services.uiBoot.start, canonicalUiStart);
  service.start?.();
  assert.deepEqual(calls, ['bootMain']);
});

test('boot finalizers reinstall heals drifted commands surface without replacing the commands slot', () => {
  const App: any = { services: {} };
  const commands = installBootFinalizers(App);
  const sameCommands = App.services.commands;
  const rebuild = commands?.rebuildWardrobe;
  const rebuildDebounced = commands?.rebuildWardrobeDebounced;
  const cleanGroup = commands?.cleanGroup;

  App.services.commands.rebuildWardrobe = () => 'foreign';
  delete App.services.commands.rebuildWardrobeDebounced;
  App.services.commands.cleanGroup = () => 'foreign-clean';

  const next = installBootFinalizers(App);

  assert.equal(next, sameCommands);
  assert.equal(next?.rebuildWardrobe, rebuild);
  assert.equal(next?.rebuildWardrobeDebounced, rebuildDebounced);
  assert.equal(next?.cleanGroup, cleanGroup);
});

test('platform boot main reinstall restores canonical boot surface methods after drift', () => {
  const App: any = { lifecycle: {}, boot: {} };
  const boot = installBootMain(App);
  const canonicalStart = boot.start;
  const canonicalIsReady = boot.isReady;
  const canonicalSetReady = boot.setReady;

  App.boot.start = () => undefined;
  App.boot.isReady = () => false;
  delete App.boot.setReady;

  const healed = installBootMain(App);

  assert.equal(healed.start, canonicalStart);
  assert.equal(healed.isReady, canonicalIsReady);
  assert.equal(healed.setReady, canonicalSetReady);
});

test('smoke checks reinstall restores canonical run/waitAndRun methods after drift', () => {
  const prevLog = console.log;
  console.log = () => undefined;
  try {
    const App = createSmokeApp();
    const smoke = installSmokeChecks(App as any, { autoRun: false });
    const canonicalRun = smoke.run;
    const canonicalWaitAndRun = smoke.waitAndRun;

    smoke.run = () => false;
    smoke.waitAndRun = () => false;

    const healed = installSmokeChecks(App as any, { autoRun: false });

    assert.equal(healed.run, canonicalRun);
    assert.equal(healed.waitAndRun, canonicalWaitAndRun);
    assert.equal(healed.run?.(), true);
  } finally {
    console.log = prevLog;
  }
});
