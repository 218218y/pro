import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bindCloudSyncAttentionPulls,
  bindCloudSyncDiagStorageListener,
} from '../esm/native/services/cloud_sync_lifecycle_attention.ts';

type Listener = (ev: unknown) => void;

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

test('cloud sync attention pulls still fire on focus when eligible', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: 'visible',
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];

  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
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

    now = 16_000;
    win.dispatch('focus');

    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 8000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: 'visible',
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];

  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    const runtimeStatus = {
      realtime: { state: 'disconnected' },
      lastPullAt: 15_500,
    } as any;

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
      runtimeStatus,
      suppressRef: { v: false },
      pullAllNow: opts => {
        pullCalls.push(opts || {});
      },
      addListener: (target, type, handler) => {
        target?.addEventListener?.(type, handler);
      },
    });

    now = 16_000;
    win.dispatch('focus');
    assert.deepEqual(pullCalls, []);

    now = 24_500;
    win.dispatch('focus');
    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 8000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: false },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: 'hidden',
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];

  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
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

    now = 16_000;
    win.dispatch('focus');
    win.dispatch('online');
    assert.deepEqual(pullCalls, []);

    win.navigator.onLine = true;
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

test('cloud sync attention online pull does not stay blocked by subscribed status without a live channel', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: 'visible',
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];

  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
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
      runtimeStatus: { realtime: { state: 'subscribed', channel: '' } } as any,
      suppressRef: { v: false },
      pullAllNow: opts => {
        pullCalls.push(opts || {});
      },
      addListener: (target, type, handler) => {
        target?.addEventListener?.(type, handler);
      },
    });

    now = 16_000;
    win.dispatch('online');

    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:online', minRecentPullGapMs: 8000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync attention online handler reports pull failures without breaking later attention events', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: 'visible',
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];

  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    let shouldThrow = true;
    bindCloudSyncAttentionPulls({
      App: {
        deps: {
          browser: {
            window: win,
            document: doc,
            navigator: win.navigator,
          },
        },
        services: {
          platform: {
            reportError(error: unknown, ctx: any) {
              reported.push({ error, ctx });
            },
          },
        },
      } as any,
      runtimeStatus: { realtime: { state: 'disconnected' } } as any,
      suppressRef: { v: false },
      pullAllNow: opts => {
        if (shouldThrow) throw new Error('online pull failed');
        pullCalls.push(opts || {});
      },
      addListener: (target, type, handler) => {
        target?.addEventListener?.(type, handler);
      },
    });

    now = 16_000;
    win.dispatch('online');

    assert.equal(reported.length, 1);
    assert.equal((reported[0]?.error as Error).message, 'online pull failed');
    assert.equal(reported[0]?.ctx?.op, 'onlineListener.callback');

    shouldThrow = false;
    now = 31_500;
    win.dispatch('online');

    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:online', minRecentPullGapMs: 8000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;

  let storageDiagEnabled = false;
  const runtimeStatus = { diagEnabled: false } as any;
  let publishCount = 0;

  bindCloudSyncDiagStorageListener({
    App: {
      deps: {
        browser: {
          window: win,
          document: doc,
          navigator: win.navigator,
        },
      },
    } as any,
    runtimeStatus,
    diagStorageKey: 'cloudSyncDiag',
    updateDiagEnabled: () => {
      runtimeStatus.diagEnabled = storageDiagEnabled;
    },
    publishStatus: () => {
      publishCount += 1;
    },
    addListener: (target, type, handler) => {
      target?.addEventListener?.(type, handler);
    },
  });

  win.dispatch('storage', { key: 'otherKey' });
  assert.equal(publishCount, 0);

  win.dispatch('storage', { key: 'cloudSyncDiag' });
  assert.equal(publishCount, 0, 'same-value diagnostics sync should stay quiet');

  storageDiagEnabled = true;
  win.dispatch('storage', { key: 'cloudSyncDiag' });
  assert.equal(publishCount, 1, 'a real diagnostics toggle should republish status once');

  win.dispatch('storage', { key: 'cloudSyncDiag' });
  assert.equal(publishCount, 1, 'same-value storage churn should not republish again');
});

test('cloud sync attention pulls stay inert after the lifecycle guard flips stale before cleanup', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    visibilityState: 'visible',
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];
  const disposedRef = { current: false };

  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
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
      isDisposed: () => disposedRef.current,
    });

    disposedRef.current = true;
    now = 16_000;
    win.dispatch('focus');
    win.dispatch('online');
    doc.dispatch('visibilitychange');

    assert.deepEqual(pullCalls, []);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync diagnostics storage listener stays inert after the lifecycle guard flips stale', () => {
  const win = Object.assign(createEventTarget(), {
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { href: 'https://example.test/', search: '' },
  });
  const doc = Object.assign(createEventTarget(), {
    createElement() {
      return {} as any;
    },
    querySelector() {
      return null;
    },
  });
  (win as any).document = doc;

  let updateCount = 0;
  let publishCount = 0;
  const disposedRef = { current: false };
  const runtimeStatus = { diagEnabled: false } as any;

  bindCloudSyncDiagStorageListener({
    App: {
      deps: {
        browser: {
          window: win,
          document: doc,
          navigator: win.navigator,
        },
      },
    } as any,
    runtimeStatus,
    diagStorageKey: 'cloud-sync-diag',
    updateDiagEnabled: () => {
      updateCount += 1;
      runtimeStatus.diagEnabled = !runtimeStatus.diagEnabled;
    },
    publishStatus: () => {
      publishCount += 1;
    },
    addListener: (target, type, handler) => {
      target?.addEventListener?.(type, handler);
    },
    isDisposed: () => disposedRef.current,
  });

  disposedRef.current = true;
  win.dispatch('storage', { key: 'cloud-sync-diag' });

  assert.equal(updateCount, 0);
  assert.equal(publishCount, 0);
  assert.equal(runtimeStatus.diagEnabled, false);
});
