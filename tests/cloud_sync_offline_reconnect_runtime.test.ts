import test from 'node:test';
import assert from 'node:assert/strict';

import { bindCloudSyncAttentionPulls } from '../esm/native/services/cloud_sync_lifecycle_attention.ts';

type Listener = (ev: unknown) => void;
type PullOptions = { includeControls?: boolean; reason?: string; minRecentPullGapMs?: number };

function createEventTarget() {
  const listeners = new Map<string, Listener[]>();
  return {
    addEventListener(type: string, handler: Listener) {
      const list = listeners.get(type) || [];
      list.push(handler);
      listeners.set(type, list);
    },
    dispatch(type: string, ev: unknown = {}) {
      const list = listeners.get(type) || [];
      for (const handler of list) handler(ev);
    },
  };
}

function createAttentionFixture(args: { online: boolean; visibilityState: string }) {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: args.online },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: args.visibilityState,
    createElement() {
      return {} as unknown;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;

  const pullCalls: PullOptions[] = [];

  bindCloudSyncAttentionPulls({
    App: {
      deps: {
        browser: {
          window: win,
          document: doc,
          navigator: win.navigator,
        },
      },
    } as any,
    runtimeStatus: { realtime: { state: 'disconnected' } } as any,
    suppressRef: { v: false },
    pullAllNow: opts => {
      pullCalls.push(opts || {});
    },
    addListener: (target, type, handler) => {
      target?.addEventListener?.(type, handler);
    },
  });

  return { win, doc, pullCalls };
}

test('cloud sync visible offline attention attempts do not consume reconnect eligibility', () => {
  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    const { win, pullCalls } = createAttentionFixture({ online: false, visibilityState: 'visible' });

    now = 16_000;
    win.dispatch('focus');
    win.dispatch('online');
    assert.deepEqual(pullCalls, []);

    win.navigator.onLine = true;
    now = 17_000;
    win.dispatch('online');
    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:online', minRecentPullGapMs: 8000 },
    ]);

    now = 20_000;
    win.dispatch('focus');
    win.dispatch('online');
    assert.equal(pullCalls.length, 1, 'accepted reconnect pull should own the attention cooldown');
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync hidden reconnect waits for visible return before pulling', () => {
  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    const { win, doc, pullCalls } = createAttentionFixture({ online: false, visibilityState: 'hidden' });

    win.navigator.onLine = true;
    now = 16_000;
    win.dispatch('online');
    assert.deepEqual(pullCalls, []);

    doc.visibilityState = 'visible';
    now = 22_000;
    doc.dispatch('visibilitychange');
    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:visibility', minRecentPullGapMs: 8000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});
