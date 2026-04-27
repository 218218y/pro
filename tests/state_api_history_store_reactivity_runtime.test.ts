import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApiHistoryMetaReactivity } from '../esm/native/kernel/state_api_history_meta_reactivity.ts';

type AnyRecord = Record<string, any>;

type Listener = ((state: unknown, meta: unknown) => void) | null;

function asObj<T extends AnyRecord = AnyRecord>(value: unknown): T | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null;
}

function createHarness() {
  const calls: Array<[string, AnyRecord]> = [];
  const queued = new Map<number, () => void>();
  let nextTimerId = 1;
  let listener: Listener = null;
  let currentState: AnyRecord = { meta: { version: 0 }, runtime: {}, ui: {} };
  let setCount = 0;
  let clearCount = 0;
  let unsubscribeCount = 0;

  const setTimeoutImpl = (fn: () => void) => {
    const id = nextTimerId++;
    setCount += 1;
    queued.set(id, fn);
    return id;
  };
  const clearTimeoutImpl = (id?: number) => {
    clearCount += 1;
    if (typeof id === 'number') queued.delete(id);
  };
  const flushTimers = () => {
    const pending = Array.from(queued.values());
    queued.clear();
    for (const fn of pending) fn();
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
        return () => {
          unsubscribeCount += 1;
          listener = null;
        };
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
    normMeta(meta: AnyRecord | null | undefined, source: string) {
      const base = asObj(meta) || {};
      return {
        ...base,
        source: typeof base.source === 'string' && base.source ? base.source : source,
      };
    },
    mergeMeta(meta: AnyRecord | null | undefined, defaults: AnyRecord, sourceFallback: string) {
      const base = asObj(meta) || {};
      return {
        ...(defaults || {}),
        ...base,
        source: typeof base.source === 'string' && base.source ? base.source : sourceFallback,
      };
    },
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

  const emit = (version: number, meta: AnyRecord, runtime: AnyRecord = {}) => {
    currentState = { meta: { version }, runtime, ui: {} };
    listener?.(currentState, meta);
  };

  return {
    calls,
    queued,
    emit,
    flushTimers,
    get setCount() {
      return setCount;
    },
    get clearCount() {
      return clearCount;
    },
    unsubscribe() {
      const live = storeNs.__unsubStore;
      assert.equal(typeof live, 'function');
      live();
    },
    get unsubscribeCount() {
      return unsubscribeCount;
    },
  };
}

test('state-api store reactivity reuses one delayed timer, keeps the latest queued source, and preserves strongest force intent', () => {
  const h = createHarness();

  h.emit(1, { source: 'reactive:one', forceBuild: true });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);
  assert.equal(h.clearCount, 0);

  h.emit(2, { source: 'reactive:two' });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);
  assert.equal(h.clearCount, 0);

  h.flushTimers();
  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [['build', { source: 'reactive:two', immediate: false, reason: 'reactive:two', force: true }]]
  );
});

test('state-api store reactivity cancels pending delayed build when an immediate commit arrives', () => {
  const h = createHarness();

  h.emit(1, { source: 'reactive:queued' });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);

  h.emit(2, { source: 'reactive:immediate', immediate: true, forceBuild: true });
  assert.equal(h.clearCount, 1);
  assert.equal(h.queued.size, 0);

  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [['build', { source: 'reactive:immediate', immediate: true, reason: 'reactive:immediate', force: true }]]
  );

  h.flushTimers();
  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [['build', { source: 'reactive:immediate', immediate: true, reason: 'reactive:immediate', force: true }]]
  );
});

test('state-api store reactivity preserves strongest queued force when an immediate commit preempts the timer', () => {
  const h = createHarness();

  h.emit(1, { source: 'reactive:queued', forceBuild: true });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);

  h.emit(2, { source: 'reactive:immediate', immediate: true });
  assert.equal(h.clearCount, 1);
  assert.equal(h.queued.size, 0);

  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [['build', { source: 'reactive:immediate', immediate: true, reason: 'reactive:immediate', force: true }]]
  );

  h.flushTimers();
  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [['build', { source: 'reactive:immediate', immediate: true, reason: 'reactive:immediate', force: true }]]
  );
});

test('state-api store reactivity lets forceBuild override noBuild for delayed and immediate commits', () => {
  const h = createHarness();

  h.emit(1, { source: 'reactive:noBuildForce', noBuild: true, forceBuild: true });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);

  h.flushTimers();
  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [
      [
        'build',
        { source: 'reactive:noBuildForce', immediate: false, reason: 'reactive:noBuildForce', force: true },
      ],
    ]
  );

  h.emit(2, {
    source: 'reactive:noBuildImmediateForce',
    noBuild: true,
    immediate: true,
    forceBuild: true,
  });

  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    [
      [
        'build',
        { source: 'reactive:noBuildForce', immediate: false, reason: 'reactive:noBuildForce', force: true },
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
    ]
  );
});

test('state-api store reactivity clears pending delayed builds when restore mode enters without force', () => {
  const h = createHarness();

  h.emit(1, { source: 'reactive:queued' });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);
  assert.equal(h.clearCount, 0);

  h.emit(2, { source: 'reactive:restore' }, { restoring: true });
  assert.equal(h.queued.size, 0);
  assert.equal(h.clearCount, 1);

  h.flushTimers();
  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    []
  );
});

test('state-api store reactivity dispose clears pending delayed build timer and unsubscribes once', () => {
  const h = createHarness();

  h.emit(1, { source: 'reactive:queued' });
  assert.equal(h.queued.size, 1);
  assert.equal(h.setCount, 1);
  assert.equal(h.clearCount, 0);
  assert.equal(h.unsubscribeCount, 0);

  h.unsubscribe();

  assert.equal(h.clearCount, 1);
  assert.equal(h.unsubscribeCount, 1);
  assert.equal(h.queued.size, 0);

  h.flushTimers();
  assert.deepEqual(
    h.calls.filter(([kind]) => kind === 'build'),
    []
  );
});
