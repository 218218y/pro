import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApiHistoryMetaReactivity } from '../esm/native/kernel/state_api_history_meta_reactivity.ts';
import {
  flushHistoryPendingPushMaybe,
  getHistorySystemMaybe,
  scheduleHistoryPushMaybe,
} from '../esm/native/runtime/history_system_access.ts';

test('history runtime action channel stays services-backed and does not recurse through actions.history', () => {
  const calls: string[] = [];
  const hs1: any = { undo() {}, redo() {}, pushState() {}, isPaused: false };
  const hs2: any = { undo() {}, redo() {}, pushState() {}, isPaused: false };
  const historyNs: any = {};
  const App: any = {
    actions: { history: historyNs },
    services: {
      history: {
        system: hs1,
        schedulePush(meta?: unknown) {
          calls.push(`schedule:${String((meta as any)?.source || '')}`);
          return true;
        },
        flushPendingPush(opts?: unknown) {
          calls.push(`flush:${String((opts as any)?.source || (opts as any)?.from || '')}`);
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

  installStateApiHistoryMetaReactivity({
    A: App,
    store: App.store,
    storeNs: {},
    historyNs,
    metaActionsNs: {},
    asObj: (v: any) => (v && typeof v === 'object' ? v : null),
    safeCall: (fn: () => unknown) => fn(),
    normMeta: (meta: any) => (meta && typeof meta === 'object' ? meta : {}),
    mergeMeta: (meta: any, defaults: any) => ({
      ...(defaults || {}),
      ...(meta && typeof meta === 'object' ? meta : {}),
    }),
    isObj: (v: any): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v),
    commitMetaTouch: () => null,
    asMeta: (meta: any) => (meta && typeof meta === 'object' ? meta : {}),
    commitMetaPatch: () => null,
  } as never);

  assert.equal(historyNs.getSystem(), hs1);
  assert.equal(getHistorySystemMaybe(App), hs1);

  assert.equal(scheduleHistoryPushMaybe(App, { source: 'regression' } as any), true);
  assert.equal(flushHistoryPendingPushMaybe(App, { from: 'regression' } as any), true);
  assert.deepEqual(calls, ['schedule:regression', 'flush:regression']);

  assert.equal(historyNs.setSystem(hs2), hs2);
  assert.equal(getHistorySystemMaybe(App), hs2);
});
