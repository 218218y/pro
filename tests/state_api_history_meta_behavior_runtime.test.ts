import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureMetaActions,
  getMetaActionFn,
  patchViaActions,
  setDirtyViaActions,
} from '../esm/native/runtime/actions_access.ts';
import { installStateApiHistoryMetaReactivity } from '../esm/native/kernel/state_api_history_meta_reactivity.ts';

type AnyRecord = Record<string, any>;

function asObj<T extends AnyRecord = AnyRecord>(value: unknown): T | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null;
}

function normMeta(meta: AnyRecord | null | undefined, source: string) {
  const base = asObj(meta) || {};
  return {
    ...base,
    source: typeof base.source === 'string' && base.source ? base.source : source,
  };
}

function mergeMeta(meta: AnyRecord | null | undefined, defaults: AnyRecord, sourceFallback: string) {
  const base = asObj(meta) || {};
  return {
    ...(defaults || {}),
    ...base,
    source: typeof base.source === 'string' && base.source ? base.source : sourceFallback,
  };
}

test('state-api meta runtime replaces stubbed live actions and routes through canonical commit seams', () => {
  const touches: AnyRecord[] = [];
  const patches: Array<{ patch: AnyRecord; meta: AnyRecord }> = [];
  const App: AnyRecord = {
    actions: { meta: {} },
    services: {
      history: {
        schedulePush() {
          return true;
        },
      },
    },
    store: {
      subscribe() {
        return () => undefined;
      },
      getState() {
        return { meta: { version: 1 }, runtime: {}, ui: {} };
      },
    },
  };

  const metaNs = ensureMetaActions(App);
  const storeNs: AnyRecord = {};
  const historyNs: AnyRecord = {};

  assert.equal(getMetaActionFn(App, 'touch'), null);
  assert.equal(getMetaActionFn(App, 'persist'), null);
  assert.equal(getMetaActionFn(App, 'setDirty'), null);
  assert.equal(patchViaActions(App, {}, { source: 'before:touch' }), false);
  assert.equal(setDirtyViaActions(App, true, { source: 'before:dirty' }), false);

  installStateApiHistoryMetaReactivity({
    A: App,
    store: App.store,
    storeNs,
    historyNs,
    metaActionsNs: metaNs,
    asObj,
    safeCall: (fn: () => unknown) => fn(),
    normMeta,
    mergeMeta,
    isObj: (value: unknown): value is AnyRecord =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    commitMetaTouch(meta?: AnyRecord) {
      const next = normMeta(meta, 'meta:touch');
      touches.push(next);
      return next;
    },
    asMeta(meta: AnyRecord | null | undefined) {
      return asObj(meta) || {};
    },
    commitMetaPatch(patch: AnyRecord, meta: AnyRecord) {
      patches.push({ patch: asObj(patch) || {}, meta: normMeta(meta, 'meta:patch') });
      return patch;
    },
  } as never);

  assert.equal(typeof getMetaActionFn(App, 'touch'), 'function');
  assert.equal(typeof getMetaActionFn(App, 'persist'), 'function');
  assert.equal(typeof getMetaActionFn(App, 'setDirty'), 'function');

  assert.equal(patchViaActions(App, {}, { source: 'test:touch' }), true);
  assert.equal(setDirtyViaActions(App, true, { source: 'test:dirty' }), true);

  const persist = getMetaActionFn<(meta?: AnyRecord) => unknown>(App, 'persist');
  persist?.({ source: 'test:persist', noHistory: true });

  assert.deepEqual(
    touches.map(meta => meta.source),
    ['test:touch', 'test:persist']
  );
  assert.equal(touches[1].noHistory, true);

  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0].patch, { dirty: true });
  assert.equal(patches[0].meta.source, 'test:dirty');
  assert.equal(patches[0].meta.uiOnly, true);
  assert.equal(patches[0].meta.noBuild, true);
  assert.equal(patches[0].meta.noAutosave, true);
  assert.equal(patches[0].meta.noPersist, true);
  assert.equal(patches[0].meta.noHistory, true);
  assert.equal(patches[0].meta.noCapture, true);
});

test('state-api history batch runtime coalesces the undo step and respects noHistory bypass', () => {
  const scheduleCalls: string[] = [];
  const pauseResume: string[] = [];
  const App: AnyRecord = {
    services: {
      history: {
        system: {
          pause() {
            pauseResume.push('pause');
          },
          resume() {
            pauseResume.push('resume');
          },
        },
        schedulePush(meta?: AnyRecord) {
          scheduleCalls.push(String(meta?.source || ''));
          return true;
        },
      },
    },
    store: {
      subscribe() {
        return () => undefined;
      },
      getState() {
        return { meta: { version: 1 }, runtime: {}, ui: {} };
      },
    },
  };

  const historyNs: AnyRecord = {};
  installStateApiHistoryMetaReactivity({
    A: App,
    store: App.store,
    storeNs: {},
    historyNs,
    metaActionsNs: {},
    asObj,
    safeCall: (fn: () => unknown) => fn(),
    normMeta,
    mergeMeta,
    isObj: (value: unknown): value is AnyRecord =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    commitMetaTouch: () => null,
    asMeta(meta: AnyRecord | null | undefined) {
      return asObj(meta) || {};
    },
    commitMetaPatch: () => null,
  } as never);

  let ran = 0;
  const out = historyNs.batch(
    () => {
      ran += 1;
      return 42;
    },
    { source: 'history:batch' }
  );

  assert.equal(out, 42);
  assert.equal(ran, 1);
  assert.deepEqual(pauseResume, ['pause', 'resume']);
  assert.deepEqual(scheduleCalls, ['history:batch']);

  const bypass = historyNs.batch(
    () => {
      ran += 1;
      return 'bypass';
    },
    { source: 'history:noHistory', noHistory: true }
  );

  assert.equal(bypass, 'bypass');
  assert.equal(ran, 2);
  assert.deepEqual(scheduleCalls, ['history:batch']);
});

test('state-api store reactivity runtime dedupes versions and preserves build/autosave/history policy', () => {
  const calls: Array<[string, AnyRecord]> = [];
  const queued = new Map<number, () => void>();
  let nextTimerId = 1;
  let listener: ((state: unknown, meta: unknown) => void) | null = null;
  let currentState: AnyRecord = { meta: { version: 0 }, runtime: {}, ui: {} };

  const setTimeoutImpl = (fn: () => void) => {
    const id = nextTimerId++;
    queued.set(id, fn);
    return id;
  };
  const clearTimeoutImpl = (id?: number) => {
    if (typeof id === 'number') queued.delete(id);
  };
  const flushTimers = () => {
    const pending = Array.from(queued.entries());
    queued.clear();
    for (const [, fn] of pending) fn();
  };

  const documentLike = {
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  const windowLike = {
    document: documentLike,
    navigator: { userAgent: 'UA/1.0' },
    location: { search: '' },
    setTimeout: setTimeoutImpl,
    clearTimeout: clearTimeoutImpl,
  };

  const App: AnyRecord = {
    deps: {
      browser: {
        window: windowLike,
        document: documentLike,
        navigator: windowLike.navigator,
        location: windowLike.location,
        setTimeout: setTimeoutImpl,
        clearTimeout: clearTimeoutImpl,
      },
    },
    services: {
      builder: {
        requestBuild(_ui: unknown, meta?: AnyRecord) {
          calls.push(['build', asObj(meta) || {}]);
          return true;
        },
      },
      autosave: {
        schedule() {
          calls.push(['autosave', {}]);
          return true;
        },
      },
      history: {
        schedulePush(meta?: AnyRecord) {
          calls.push(['history', asObj(meta) || {}]);
          return true;
        },
      },
    },
    store: {
      subscribe(fn: (state: unknown, meta: unknown) => void) {
        listener = fn;
        return () => undefined;
      },
      getState() {
        return currentState;
      },
    },
  };

  const storeNs: AnyRecord = {};
  installStateApiHistoryMetaReactivity({
    A: App,
    store: App.store,
    storeNs,
    historyNs: {},
    metaActionsNs: {},
    asObj,
    safeCall: (fn: () => unknown) => fn(),
    normMeta,
    mergeMeta,
    isObj: (value: unknown): value is AnyRecord =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    commitMetaTouch: () => null,
    asMeta(meta: AnyRecord | null | undefined) {
      return asObj(meta) || {};
    },
    commitMetaPatch: () => null,
  } as never);

  assert.equal(storeNs.installReactivity(), true);
  assert.equal(typeof listener, 'function');

  currentState = { meta: { version: 1 }, runtime: {}, ui: {} };
  listener?.(currentState, { source: 'reactive:one' });
  assert.deepEqual(calls, [
    ['autosave', {}],
    ['history', { source: 'reactive:one' }],
  ]);
  assert.equal(queued.size, 1);
  flushTimers();
  assert.deepEqual(calls[2], [
    'build',
    { source: 'reactive:one', immediate: false, reason: 'reactive:one', force: false },
  ]);

  listener?.(currentState, { source: 'reactive:duplicate' });
  assert.equal(calls.length, 3);

  currentState = { meta: { version: 2 }, runtime: {}, ui: {} };
  listener?.(currentState, { source: 'reactive:noBuild', noBuild: true });
  assert.deepEqual(calls.slice(3), [
    ['autosave', {}],
    ['history', { source: 'reactive:noBuild', noBuild: true }],
  ]);
  assert.equal(queued.size, 0);

  currentState = { meta: { version: 3 }, runtime: {}, ui: {} };
  listener?.(currentState, { source: 'reactive:immediate', immediate: true });
  assert.deepEqual(calls.slice(5), [
    ['autosave', {}],
    ['history', { source: 'reactive:immediate', immediate: true }],
    ['build', { source: 'reactive:immediate', immediate: true, reason: 'reactive:immediate', force: false }],
  ]);

  currentState = { meta: { version: 4 }, runtime: {}, ui: {} };
  listener?.(currentState, { source: 'reactive:noBuildForce', noBuild: true, forceBuild: true });
  assert.deepEqual(calls.slice(8), [
    ['autosave', {}],
    ['history', { source: 'reactive:noBuildForce', noBuild: true, forceBuild: true }],
  ]);
  assert.equal(queued.size, 1);
  flushTimers();
  assert.deepEqual(calls[10], [
    'build',
    { source: 'reactive:noBuildForce', immediate: false, reason: 'reactive:noBuildForce', force: true },
  ]);

  currentState = { meta: { version: 5 }, runtime: {}, ui: {} };
  listener?.(currentState, {
    source: 'reactive:noBuildImmediateForce',
    noBuild: true,
    immediate: true,
    forceBuild: true,
  });
  assert.deepEqual(calls.slice(11), [
    ['autosave', {}],
    [
      'history',
      {
        source: 'reactive:noBuildImmediateForce',
        noBuild: true,
        immediate: true,
        forceBuild: true,
      },
    ],
    [
      'build',
      {
        source: 'reactive:noBuildImmediateForce',
        immediate: true,
        reason: 'reactive:noBuildImmediateForce',
        force: true,
      },
    ],
  ]);
  assert.equal(queued.size, 0);

  currentState = { meta: { version: 6 }, runtime: { restoring: true }, ui: {} };
  listener?.(currentState, { source: 'reactive:restore' });
  assert.equal(calls.length, 14);
  assert.equal(queued.size, 0);

  currentState = { meta: { version: 7 }, runtime: { restoring: true }, ui: {} };
  listener?.(currentState, { source: 'reactive:force', forceBuild: true });
  assert.deepEqual(calls.slice(14), [
    ['autosave', {}],
    ['history', { source: 'reactive:force', forceBuild: true }],
  ]);
  assert.equal(queued.size, 1);
  flushTimers();
  assert.deepEqual(calls[16], [
    'build',
    { source: 'reactive:force', immediate: false, reason: 'reactive:force', force: true },
  ]);
});

test('state-api store reactivity runtime clears queued delayed builds when restore mode takes over', () => {
  const calls: Array<[string, AnyRecord]> = [];
  const queued = new Map<number, () => void>();
  let nextTimerId = 1;
  let listener: ((state: unknown, meta: unknown) => void) | null = null;
  let currentState: AnyRecord = { meta: { version: 0 }, runtime: {}, ui: {} };

  const setTimeoutImpl = (fn: () => void) => {
    const id = nextTimerId++;
    queued.set(id, fn);
    return id;
  };
  const clearTimeoutImpl = (id?: number) => {
    if (typeof id === 'number') queued.delete(id);
  };
  const flushTimers = () => {
    const pending = Array.from(queued.entries());
    queued.clear();
    for (const [, fn] of pending) fn();
  };

  const App: AnyRecord = {
    deps: {
      browser: {
        window: {
          setTimeout: setTimeoutImpl,
          clearTimeout: clearTimeoutImpl,
          document: {},
          navigator: {},
          location: { search: '' },
        },
        document: {},
        navigator: {},
        location: { search: '' },
        setTimeout: setTimeoutImpl,
        clearTimeout: clearTimeoutImpl,
      },
    },
    services: {
      builder: {
        requestBuild(_ui: unknown, meta?: AnyRecord) {
          calls.push(['build', asObj(meta) || {}]);
          return true;
        },
      },
      autosave: {
        schedule() {
          calls.push(['autosave', {}]);
          return true;
        },
      },
      history: {
        schedulePush(meta?: AnyRecord) {
          calls.push(['history', asObj(meta) || {}]);
          return true;
        },
      },
    },
    store: {
      subscribe(fn: (state: unknown, meta: unknown) => void) {
        listener = fn;
        return () => undefined;
      },
      getState() {
        return currentState;
      },
    },
  };

  const storeNs: AnyRecord = {};
  installStateApiHistoryMetaReactivity({
    A: App,
    store: App.store,
    storeNs,
    historyNs: {},
    metaActionsNs: {},
    asObj,
    safeCall: (fn: () => unknown) => fn(),
    normMeta,
    mergeMeta,
    isObj: (value: unknown): value is AnyRecord =>
      !!value && typeof value === 'object' && !Array.isArray(value),
    commitMetaTouch: () => null,
    asMeta(meta: AnyRecord | null | undefined) {
      return asObj(meta) || {};
    },
    commitMetaPatch: () => null,
  } as never);

  assert.equal(storeNs.installReactivity(), true);
  currentState = { meta: { version: 1 }, runtime: {}, ui: {} };
  listener?.(currentState, { source: 'reactive:queued' });
  assert.equal(queued.size, 1);

  currentState = { meta: { version: 2 }, runtime: { restoring: true }, ui: {} };
  listener?.(currentState, { source: 'reactive:restore' });
  assert.equal(queued.size, 0);

  flushTimers();
  assert.deepEqual(
    calls.filter(([kind]) => kind === 'build'),
    []
  );
});
