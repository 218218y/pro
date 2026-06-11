import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelPendingPush,
  flushPendingPush,
  installHistoryService,
  schedulePush,
} from '../esm/native/services/history.ts';

type AnyRecord = Record<string, unknown>;

type StoreLike = {
  getState: () => AnyRecord;
  patch: (payload: AnyRecord, meta?: AnyRecord) => unknown;
  subscribe: (fn: (state: AnyRecord, meta?: AnyRecord) => void) => () => void;
};

function makeStore(state: AnyRecord): StoreLike {
  const subs: Array<(state: AnyRecord, meta?: AnyRecord) => void> = [];
  return {
    getState: () => state,
    patch: (payload: AnyRecord, meta?: AnyRecord) => {
      if (payload && typeof payload === 'object') {
        const p = payload as AnyRecord;
        if (p.runtime && typeof p.runtime === 'object') {
          Object.assign(state.runtime as AnyRecord, p.runtime as AnyRecord);
        }
      }
      for (const fn of subs.slice()) {
        try {
          fn(state, meta as AnyRecord);
        } catch {
          // ignore
        }
      }
      return undefined;
    },
    subscribe: fn => {
      subs.push(fn);
      return () => {
        const idx = subs.indexOf(fn);
        if (idx >= 0) subs.splice(idx, 1);
      };
    },
  };
}

test('history service runtime state stays per-app and does not leak debounce state across app containers', () => {
  const pushesA: AnyRecord[] = [];
  const pushesB: AnyRecord[] = [];
  const AppA: AnyRecord = {
    services: { history: { system: { pushState: (a: AnyRecord) => pushesA.push(a) } } },
    store: makeStore({ runtime: { restoring: false } }),
  };
  const AppB: AnyRecord = {
    services: { history: { system: { pushState: (a: AnyRecord) => pushesB.push(a) } } },
    store: makeStore({ runtime: { restoring: false } }),
  };

  const svcA = installHistoryService(AppA as any) as AnyRecord;
  const svcB = installHistoryService(AppB as any) as AnyRecord;

  schedulePush(AppA as any, { source: 'app:a' });
  assert.equal(svcA.hasPendingPush?.(), true);
  assert.equal(svcB.hasPendingPush?.(), false);

  flushPendingPush(AppB as any, { from: 'b-only' });
  assert.deepEqual(pushesA, []);
  assert.deepEqual(pushesB, []);

  flushPendingPush(AppA as any, { from: 'flush:a' });
  assert.equal(pushesA.length, 1);
  assert.equal(pushesA[0].source, 'app:a');
  assert.equal(pushesA[0].from, 'flush:a');
  assert.deepEqual(pushesB, []);

  schedulePush(AppA as any, { source: 'app:a:cancel' });
  schedulePush(AppB as any, { source: 'app:b:keep' });
  cancelPendingPush(AppA as any);

  assert.equal(svcA.hasPendingPush?.(), false);
  assert.equal(svcB.hasPendingPush?.(), true);

  flushPendingPush(AppB as any, { from: 'flush:b' });
  assert.equal(pushesA.length, 1);
  assert.equal(pushesB.length, 1);
  assert.equal(pushesB[0].source, 'app:b:keep');
  assert.equal(pushesB[0].from, 'flush:b');
});
