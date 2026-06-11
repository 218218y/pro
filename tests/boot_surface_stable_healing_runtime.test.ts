import test from 'node:test';
import assert from 'node:assert/strict';

import { installAppStartService } from '../esm/native/services/app_start.ts';
import { installBootFinalizers } from '../esm/native/services/boot_finalizers.ts';
import { installBootMain } from '../esm/native/platform/boot_main.ts';
import { installSmokeChecks } from '../esm/native/platform/smoke_checks.ts';
import { getCommandsServiceMaybe } from '../esm/native/runtime/commands_access.ts';

type AnyRecord = Record<string, unknown>;

type BootSurfaceWithCanonical = AnyRecord & {
  start?: () => void;
  isReady?: () => boolean;
  setReady?: () => void;
  __wpCanonicalBootStart?: () => void;
  __wpCanonicalBootIsReady?: () => boolean;
  __wpCanonicalBootSetReady?: () => void;
};

type SmokeSurfaceWithCanonical = AnyRecord & {
  run?: () => boolean;
  waitAndRun?: () => boolean;
  __wpCanonicalSmokeRun?: () => boolean;
  __wpCanonicalSmokeWaitAndRun?: () => boolean;
};

type CommandsSurfaceWithCanonical = AnyRecord & {
  rebuildWardrobe?: () => unknown;
  rebuildWardrobeDebounced?: () => unknown;
  cleanGroup?: (group: unknown) => unknown;
  __wpCanonicalRebuildWardrobe?: () => unknown;
  __wpCanonicalRebuildWardrobeDebounced?: () => unknown;
  __wpCanonicalCleanGroup?: (group: unknown) => unknown;
};

function createSmokeApp(): AnyRecord {
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

test('boot main reinstall heals missing public boot methods from canonical hidden refs', () => {
  const App: any = { lifecycle: {}, boot: {} };
  const boot = installBootMain(App) as BootSurfaceWithCanonical;
  const canonicalStart = boot.start;
  const canonicalIsReady = boot.isReady;
  const canonicalSetReady = boot.setReady;

  assert.equal(boot.__wpCanonicalBootStart, canonicalStart);
  assert.equal(boot.__wpCanonicalBootIsReady, canonicalIsReady);
  assert.equal(boot.__wpCanonicalBootSetReady, canonicalSetReady);

  delete boot.start;
  delete boot.isReady;
  delete boot.setReady;

  const healed = installBootMain(App) as BootSurfaceWithCanonical;
  assert.equal(healed, boot);
  assert.equal(healed.start, canonicalStart);
  assert.equal(healed.isReady, canonicalIsReady);
  assert.equal(healed.setReady, canonicalSetReady);
});

test('app start reinstall heals both appStart.start and uiBoot.start from canonical refs', () => {
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

  const service = installAppStartService(App) as AnyRecord;
  const canonicalStart = service.start as (() => void) | undefined;
  const canonicalUiStart = App.services.uiBoot.start as (() => void) | undefined;

  assert.equal(service.__wpCanonicalStart, canonicalStart);
  assert.equal(App.services.uiBoot.__wpCanonicalUiStart, canonicalUiStart);

  delete service.start;
  delete App.services.uiBoot.start;

  installAppStartService(App);

  assert.equal(service.start, canonicalStart);
  assert.equal(App.services.uiBoot.start, canonicalUiStart);
  service.start?.();
  assert.deepEqual(calls, ['bootMain']);
});

test('commands access heals missing public commands methods from canonical hidden refs', () => {
  const App: AnyRecord = {
    services: Object.create(null),
    platform: {
      util: {
        cleanGroup: (group: unknown) => group,
      },
    },
    render: {},
    store: {
      getState: () => ({ ui: { raw: {} } }),
    },
  };

  const service = installBootFinalizers(App as any) as CommandsSurfaceWithCanonical;
  const canonicalRebuild = service.rebuildWardrobe;
  const canonicalDebounced = service.rebuildWardrobeDebounced;
  const canonicalCleanGroup = service.cleanGroup;

  assert.equal(service.__wpCanonicalRebuildWardrobe, canonicalRebuild);
  assert.equal(service.__wpCanonicalRebuildWardrobeDebounced, canonicalDebounced);
  assert.equal(service.__wpCanonicalCleanGroup, canonicalCleanGroup);

  delete service.rebuildWardrobe;
  delete service.rebuildWardrobeDebounced;
  delete service.cleanGroup;

  const healed = getCommandsServiceMaybe(App) as CommandsSurfaceWithCanonical;
  assert.equal(healed, service);
  assert.equal(healed.rebuildWardrobe, canonicalRebuild);
  assert.equal(healed.rebuildWardrobeDebounced, canonicalDebounced);
  assert.equal(healed.cleanGroup, canonicalCleanGroup);
});

test('smoke checks reinstall heals missing run/waitAndRun from canonical hidden refs', () => {
  const prevLog = console.log;
  console.log = () => undefined;
  try {
    const App = createSmokeApp();
    const smoke = installSmokeChecks(App as any, { autoRun: false }) as SmokeSurfaceWithCanonical;
    const canonicalRun = smoke.run;
    const canonicalWaitAndRun = smoke.waitAndRun;

    assert.equal(smoke.__wpCanonicalSmokeRun, canonicalRun);
    assert.equal(smoke.__wpCanonicalSmokeWaitAndRun, canonicalWaitAndRun);

    delete smoke.run;
    delete smoke.waitAndRun;

    const healed = installSmokeChecks(App as any, { autoRun: false }) as SmokeSurfaceWithCanonical;

    assert.equal(healed, smoke);
    assert.equal(healed.run, canonicalRun);
    assert.equal(healed.waitAndRun, canonicalWaitAndRun);
    assert.equal(healed.run?.(), true);
  } finally {
    console.log = prevLog;
  }
});
