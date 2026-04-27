import test from 'node:test';
import assert from 'node:assert/strict';

import { installSmokeChecks } from '../esm/native/platform/smoke_checks.ts';
import { isSmokeChecksInstalled } from '../esm/native/runtime/install_state_access.ts';

type AnyRecord = Record<string, unknown>;

function createBaseApp(): AnyRecord {
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

test('installSmokeChecks attaches a canonical namespace and stores a success report', () => {
  const App = createBaseApp();

  const smoke = installSmokeChecks(App, { autoRun: false });
  assert.equal(App.smokeChecks, smoke);
  assert.equal(isSmokeChecksInstalled(App), true);
  assert.equal('__installed' in smoke, false);
  assert.equal(typeof smoke.run, 'function');
  assert.equal(typeof smoke.waitAndRun, 'function');

  const ok = smoke.run?.();
  assert.equal(ok, true);
  assert.equal(smoke.state?.failed, false);
  assert.equal(smoke.state?.error, '');
  assert.equal(smoke.state?.report?.ok, true);
  assert.equal(smoke.state?.report?.ready, true);
  assert.ok(Array.isArray(smoke.state?.report?.checks));
  assert.ok(smoke.state?.report?.checks.includes('platform.util'));
  assert.ok(
    smoke.state?.report?.checks.some((entry: unknown) => String(entry).startsWith('actions.modules: '))
  );
});

test('smoke run failure stores failed/error/report on the smoke state surface', () => {
  const App: AnyRecord = {};
  const prevError = console.error;
  console.error = () => undefined;
  try {
    const smoke = installSmokeChecks(App, { autoRun: false });
    const ok = smoke.run?.();

    assert.equal(ok, false);
    assert.equal(smoke.state?.failed, true);
    assert.equal(typeof smoke.state?.error, 'string');
    assert.ok(String(smoke.state?.error || '').includes('platform util missing'));
    assert.equal(smoke.state?.report?.ok, false);
    assert.equal(smoke.state?.report?.error, smoke.state?.error);
    assert.deepEqual(smoke.state?.report?.checks, ['App']);
  } finally {
    console.error = prevError;
  }
});

test('smoke waitAndRun keeps one pending ready-wait loop and ignores stale callbacks', () => {
  let rootState: AnyRecord = {
    config: {
      modulesConfiguration: [{}],
      cornerConfiguration: {},
    },
    ui: {},
    runtime: { systemReady: false },
    meta: { dirty: false },
    mode: {},
  };

  let nextTimerId = 0;
  let clearedTimers = 0;
  const scheduled = new Map<number, () => void>();

  const App = createBaseApp();
  App.store = {
    getState: () => rootState,
    patch: () => undefined,
    subscribe: () => () => undefined,
  };
  App.deps = {
    ...App.deps,
    browser: {
      setTimeout(fn: () => void) {
        const id = ++nextTimerId;
        scheduled.set(id, fn);
        return id;
      },
      clearTimeout(id?: number) {
        if (typeof id === 'number' && scheduled.delete(id)) clearedTimers += 1;
      },
    },
  };

  const smoke = installSmokeChecks(App, { autoRun: false });
  assert.equal(smoke.waitAndRun?.({ timeoutMs: 500 }), true);
  const firstEntry = Array.from(scheduled.entries())[0];
  assert.equal(firstEntry?.[0], 1);
  const staleTick = firstEntry?.[1];

  assert.equal(smoke.waitAndRun?.({ timeoutMs: 500 }), true);
  assert.equal(clearedTimers, 1);
  assert.deepEqual(Array.from(scheduled.keys()), [2]);

  rootState = { ...rootState, runtime: { systemReady: true } };
  staleTick?.();
  assert.equal(smoke.state?.report, undefined);

  const activeTick = scheduled.get(2);
  scheduled.delete(2);
  activeTick?.();
  assert.equal(smoke.state?.report?.ok, true);
  assert.equal(smoke.state?.report?.ready, true);
  assert.equal(scheduled.size, 0);
});

test('reinstalling smoke checks reuses the canonical surface and cancels the older pending wait owner', () => {
  let rootState: AnyRecord = {
    config: {
      modulesConfiguration: [{}],
      cornerConfiguration: {},
    },
    ui: {},
    runtime: { systemReady: false },
    meta: { dirty: false },
    mode: {},
  };

  let nextTimerId = 0;
  const scheduled = new Map<number, () => void>();

  const App = createBaseApp();
  App.store = {
    getState: () => rootState,
    patch: () => undefined,
    subscribe: () => () => undefined,
  };
  App.deps = {
    ...App.deps,
    browser: {
      setTimeout(fn: () => void) {
        const id = ++nextTimerId;
        scheduled.set(id, fn);
        return id;
      },
      clearTimeout(id?: number) {
        if (typeof id === 'number') scheduled.delete(id);
      },
    },
  };

  const first = installSmokeChecks(App, { autoRun: false });
  assert.equal(first.waitAndRun?.({ timeoutMs: 500 }), true);
  const staleTick = scheduled.get(1);
  assert.deepEqual(Array.from(scheduled.keys()), [1]);

  const second = installSmokeChecks(App, { autoRun: false });
  assert.equal(second, first);
  assert.equal(second.waitAndRun?.({ timeoutMs: 500 }), true);
  assert.deepEqual(Array.from(scheduled.keys()), [2]);

  rootState = { ...rootState, runtime: { systemReady: true } };
  staleTick?.();
  assert.equal(second.state?.report, undefined);

  const activeTick = scheduled.get(2);
  scheduled.delete(2);
  activeTick?.();
  assert.equal(second.state?.report?.ok, true);
  assert.equal(second.state?.report?.ready, true);
});
