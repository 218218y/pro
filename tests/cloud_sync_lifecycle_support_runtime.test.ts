import test from 'node:test';
import assert from 'node:assert/strict';

import {
  requestCloudSyncLifecycleRefresh,
  runCloudSyncPullAllNow,
  startCloudSyncPolling,
  stopCloudSyncPolling,
  syncCloudSyncRealtimeStatusInPlace,
} from '../esm/native/services/cloud_sync_lifecycle_support.ts';
import { createCloudSyncLifecyclePullAllNow } from '../esm/native/services/cloud_sync_lifecycle_bindings.ts';

test('cloud sync pull-all-now always schedules main + sketch and only pulls controls when requested', () => {
  const calls: Array<[string, string]> = [];
  const mainPulls: Array<{ reason?: string; immediate?: boolean }> = [];
  const runtimeStatus = { lastPullAt: 0 } as { lastPullAt: number };

  const pullCoalescers = {
    sketch: {
      trigger: (reason: string) => calls.push(['sketch', reason]),
    },
    tabsGate: {
      trigger: (reason: string) => calls.push(['tabsGate', reason]),
    },
    floatingSync: {
      trigger: (reason: string) => calls.push(['floatingSync', reason]),
    },
  };

  runCloudSyncPullAllNow({
    suppressRef: { v: false },
    mainPullTrigger: {
      trigger: (reason, immediate) => {
        mainPulls.push({ reason, immediate: !!immediate });
      },
    },
    pullCoalescers,
    opts: { includeControls: false, reason: 'focus' },
  });

  assert.deepEqual(mainPulls, [{ reason: 'focus.main', immediate: true }]);
  assert.equal(runtimeStatus.lastPullAt, 0);
  assert.deepEqual(calls, [['sketch', 'focus.sketch']]);

  calls.length = 0;
  runCloudSyncPullAllNow({
    suppressRef: { v: false },
    mainPullTrigger: { trigger: () => undefined },
    pullCoalescers,
    opts: { reason: 'attention' },
  });

  assert.deepEqual(calls, [
    ['sketch', 'attention.sketch'],
    ['tabsGate', 'attention.tabsGate'],
    ['floatingSync', 'attention.floatingSync'],
  ]);
});

test('cloud sync pull-all-now stays fully quiet while suppressed', () => {
  const calls: Array<[string, string]> = [];
  let mainPulls = 0;
  runCloudSyncPullAllNow({
    suppressRef: { v: true },
    mainPullTrigger: {
      trigger: () => {
        mainPulls += 1;
      },
    },
    pullCoalescers: {
      sketch: { trigger: (reason: string) => calls.push(['sketch', reason]) },
      tabsGate: { trigger: (reason: string) => calls.push(['tabsGate', reason]) },
      floatingSync: { trigger: (reason: string) => calls.push(['floatingSync', reason]) },
    },
  });

  assert.equal(mainPulls, 0);
  assert.deepEqual(calls, []);
});

test('cloud sync lifecycle refresh requests use one canonical gate for hidden/offline/realtime checks', () => {
  const pullCalls: Array<{ includeControls?: boolean; reason?: string; minRecentPullGapMs?: number }> = [];
  const win = {
    navigator: { onLine: true, userAgent: 'unit-test' },
    document: {
      visibilityState: 'visible',
      createElement() {
        return {};
      },
      querySelector() {
        return null;
      },
    },
  };
  const App = {
    deps: {
      browser: {
        window: win,
        document: win.document,
        navigator: win.navigator,
      },
    },
  } as any;
  const runtimeStatus = {
    realtime: { enabled: true, state: 'disconnected', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;

  const request = () =>
    requestCloudSyncLifecycleRefresh({
      App,
      runtimeStatus,
      suppressRef: { v: false },
      pullAllNow: opts => {
        pullCalls.push(opts || {});
      },
      opts: { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 8000 },
      policy: {
        allowWhenRealtime: false,
        allowWhenOffline: false,
        allowWhenHidden: false,
      },
    });

  assert.deepEqual(request(), { accepted: true, blockedBy: null });
  assert.deepEqual(pullCalls, [
    { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 8000 },
  ]);
  assert.equal('lastPullAt' in runtimeStatus, false);

  win.document.visibilityState = 'hidden';
  assert.deepEqual(request(), { accepted: false, blockedBy: 'hidden' });
  assert.equal(pullCalls.length, 1);

  win.document.visibilityState = 'visible';
  win.navigator.onLine = false;
  assert.deepEqual(request(), { accepted: false, blockedBy: 'offline' });
  assert.equal(pullCalls.length, 1);

  win.navigator.onLine = true;
  runtimeStatus.realtime.state = 'subscribed';
  runtimeStatus.realtime.channel = 'wp:room-a';
  assert.deepEqual(request(), { accepted: false, blockedBy: 'realtime' });
  assert.equal(pullCalls.length, 1);
});

test('cloud sync lifecycle refresh requests report recent-pull gating through the canonical refresh seam', () => {
  const pullCalls: Array<{ reason?: string; minRecentPullGapMs?: number }> = [];
  const App = {
    deps: {
      browser: {
        window: { navigator: { onLine: true, userAgent: 'unit-test' } },
        document: {
          visibilityState: 'visible',
          createElement() {
            return {};
          },
          querySelector() {
            return null;
          },
        },
        navigator: { onLine: true, userAgent: 'unit-test' },
      },
    },
  } as any;

  const originalNow = Date.now;
  let now = 20_000;
  Date.now = () => now;

  try {
    const runtimeStatus = {
      realtime: { enabled: true, state: 'disconnected', channel: '' },
      polling: { active: false, intervalMs: 0, reason: '' },
      lastPullAt: 18_500,
    } as any;

    const request = () =>
      requestCloudSyncLifecycleRefresh({
        App,
        runtimeStatus,
        suppressRef: { v: false },
        pullAllNow: opts => {
          pullCalls.push(opts || {});
        },
        opts: { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 3000 },
        policy: {
          allowWhenRealtime: false,
          allowWhenOffline: false,
          allowWhenHidden: false,
        },
      });

    assert.deepEqual(request(), { accepted: false, blockedBy: 'recent-pull' });
    assert.deepEqual(pullCalls, []);

    now = 22_100;
    assert.deepEqual(request(), { accepted: true, blockedBy: null });
    assert.deepEqual(pullCalls, [
      { includeControls: false, reason: 'attention:focus', minRecentPullGapMs: 3000 },
    ]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync lifecycle pull-all owner skips reconnect/broadcast fanout right after a real pull and resumes after cooldown', () => {
  const mainCalls: string[] = [];
  const scopeCalls: string[] = [];
  const originalNow = Date.now;
  let now = 20_000;
  Date.now = () => now;

  try {
    const runtimeStatus = { lastPullAt: 18_500 } as any;
    const pullAllNow = createCloudSyncLifecyclePullAllNow({
      suppressRef: { v: false },
      mainPullTrigger: {
        trigger: reason => {
          mainCalls.push(reason);
        },
      },
      pullCoalescers: {
        sketch: { trigger: reason => scopeCalls.push(`sketch:${reason}`) },
        tabsGate: { trigger: reason => scopeCalls.push(`tabsGate:${reason}`) },
        floatingSync: { trigger: reason => scopeCalls.push(`floatingSync:${reason}`) },
      },
      isDisposed: () => false,
      disposedRef: { v: false },
      runtimeStatus,
    });

    pullAllNow({ includeControls: false, reason: 'realtime-gap', minRecentPullGapMs: 3000 });
    assert.deepEqual(mainCalls, []);
    assert.deepEqual(scopeCalls, []);

    now = 21_700;
    pullAllNow({ includeControls: false, reason: 'realtime-gap', minRecentPullGapMs: 3000 });
    assert.deepEqual(mainCalls, ['realtime-gap.main']);
    assert.deepEqual(scopeCalls, ['sketch:realtime-gap.sketch']);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync pull-all-now does not stamp pull activity before any remote row operation actually runs', () => {
  const runtimeStatus = { lastPullAt: 0 } as { lastPullAt: number };

  runCloudSyncPullAllNow({
    suppressRef: { v: false },
    mainPullTrigger: {
      trigger: () => undefined,
    },
    pullCoalescers: {
      sketch: { trigger: () => undefined },
      tabsGate: { trigger: () => undefined },
      floatingSync: { trigger: () => undefined },
    },
    opts: { reason: 'realtime-gap', minRecentPullGapMs: 4000 },
  });

  assert.equal(runtimeStatus.lastPullAt, 0);
});

test('cloud sync polling fallback kicks an immediate recovery pull and reconnect attempt when realtime drops', () => {
  const pullCalls: Array<{ reason?: string }> = [];
  const reconnectCalls: string[] = [];
  const runtimeStatus = {
    realtime: { enabled: true, state: 'disconnected:CHANNEL_ERROR', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;
  const pollTimerRef = { current: null as number | null };

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: { navigator: { onLine: true, userAgent: 'unit-test' } },
          document: {
            visibilityState: 'visible',
            createElement() {
              return {};
            },
            querySelector() {
              return null;
            },
          },
          navigator: { onLine: true, userAgent: 'unit-test' },
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 2000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-CHANNEL_ERROR',
    pullAllNow: opts => {
      pullCalls.push(opts || {});
    },
    restartRealtime: () => {
      reconnectCalls.push('restart');
    },
  });

  assert.deepEqual(pullCalls, [{ reason: 'realtime-CHANNEL_ERROR.recover' }]);
  assert.deepEqual(reconnectCalls, ['restart']);
  assert.equal(pollTimerRef.current, 1);
});

test('cloud sync polling skips ticks right after a recent pull and resumes after the polling window', () => {
  const ticks: Array<() => void> = [];
  const pullCalls: Array<{ reason?: string; minRecentPullGapMs?: number }> = [];
  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    const win = {
      navigator: { onLine: true, userAgent: 'unit-test' },
      document: {
        visibilityState: 'visible',
        createElement() {
          return {};
        },
        querySelector() {
          return null;
        },
      },
    };
    const pollTimerRef = { current: null as number | null };
    const runtimeStatus = {
      realtime: { state: 'disconnected', channel: '' },
      polling: { active: false, intervalMs: 0, reason: '' },
      lastPullAt: 12_000,
    } as any;

    startCloudSyncPolling({
      App: {
        deps: {
          browser: {
            window: win,
            document: win.document,
            navigator: win.navigator,
          },
        },
      } as any,
      pollTimerRef,
      setIntervalFn: handler => {
        ticks.push(handler);
        return ticks.length;
      },
      clearIntervalFn: () => undefined,
      runtimeStatus,
      pollIntervalMs: 5000,
      publishStatus: () => undefined,
      diag: () => undefined,
      reason: 'realtime-disabled',
      pullAllNow: opts => {
        pullCalls.push({
          reason: String(opts?.reason || ''),
          minRecentPullGapMs: Number(opts?.minRecentPullGapMs) || 0,
        });
      },
    });

    now = 14_000;
    ticks[0]();
    assert.deepEqual(pullCalls, []);

    now = 17_100;
    ticks[0]();
    assert.deepEqual(pullCalls, [{ reason: 'polling', minRecentPullGapMs: 5000 }]);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync polling tick keeps retrying realtime while fallback polling is active', () => {
  const ticks: Array<() => void> = [];
  const reconnectCalls: string[] = [];
  const runtimeStatus = {
    realtime: { enabled: true, state: 'timeout', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
    lastPullAt: 0,
  } as any;
  const win = {
    navigator: { onLine: true, userAgent: 'unit-test' },
    document: {
      visibilityState: 'visible',
      createElement() {
        return {};
      },
      querySelector() {
        return null;
      },
    },
  };

  const pollTimerRef = { current: null as number | null };
  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: win,
          document: win.document,
          navigator: win.navigator,
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return 1;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 2000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-timeout',
    pullAllNow: () => undefined,
    restartRealtime: () => {
      reconnectCalls.push('restart');
    },
  });

  reconnectCalls.length = 0;
  ticks[0]?.();

  assert.deepEqual(reconnectCalls, ['restart']);
});

test('cloud sync polling waits for a visible online tab and auto-stops once realtime is back', () => {
  const ticks: Array<() => void> = [];
  const clearCalls: number[] = [];
  const pullCalls: Array<{ reason?: string; minRecentPullGapMs?: number }> = [];
  const stopReasons: string[] = [];
  const diagCalls: Array<[string, unknown]> = [];
  const publishCalls: string[] = [];
  const win = {
    navigator: { onLine: true, userAgent: 'unit-test' },
    document: {
      visibilityState: 'hidden',
      createElement() {
        return {};
      },
      querySelector() {
        return null;
      },
    },
  };
  const pollTimerRef = { current: null as number | null };
  const runtimeStatus = {
    realtime: { state: 'disconnected' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: win,
          document: win.document,
          navigator: win.navigator,
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return ticks.length;
    },
    clearIntervalFn: id => {
      clearCalls.push(Number(id) || 0);
    },
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(runtimeStatus.polling.reason || runtimeStatus.realtime.state || 'publish');
    },
    diag: (event, payload) => {
      diagCalls.push([event, payload]);
      if (event === 'polling:stop') stopReasons.push(String(payload || ''));
    },
    reason: 'realtime-disabled',
    pullAllNow: opts => {
      pullCalls.push({
        reason: String(opts?.reason || ''),
        minRecentPullGapMs: Number(opts?.minRecentPullGapMs) || 0,
      });
    },
  });

  assert.equal(pollTimerRef.current, 1);
  assert.equal(runtimeStatus.polling.active, true);

  ticks[0]();
  assert.deepEqual(pullCalls, []);

  win.document.visibilityState = 'visible';
  ticks[0]();
  assert.deepEqual(pullCalls, [{ reason: 'polling', minRecentPullGapMs: 5000 }]);

  win.navigator.onLine = false;
  ticks[0]();
  assert.deepEqual(pullCalls, [{ reason: 'polling', minRecentPullGapMs: 5000 }]);

  win.navigator.onLine = true;
  runtimeStatus.realtime.state = 'subscribed';
  runtimeStatus.realtime.channel = 'wp:room-a';
  ticks[0]();

  assert.deepEqual(stopReasons, ['polling-auto-stop']);
  assert.deepEqual(clearCalls, [1]);
  assert.equal(runtimeStatus.polling.active, false);
  assert.equal(runtimeStatus.polling.reason, 'polling-auto-stop');
  assert.equal(diagCalls[0]?.[0], 'polling:start');
});

test('cloud sync polling preserves the canonical polling branch ref and heals drifted extra keys in place', () => {
  const ticks: Array<() => void> = [];
  const App = {
    deps: {
      browser: {
        window: {
          navigator: { onLine: true, userAgent: 'unit-test' },
          document: {
            visibilityState: 'visible',
            createElement() {
              return {};
            },
            querySelector() {
              return null;
            },
          },
        },
      },
    },
  } as any;
  App.deps.browser.document = App.deps.browser.window.document;
  App.deps.browser.navigator = App.deps.browser.window.navigator;

  const pollTimerRef = { current: null as number | null };
  const runtimeStatus = {
    realtime: { state: 'disconnected' },
    polling: {
      active: false,
      intervalMs: 0,
      reason: 'old',
      driftedExtra: 'remove-me',
    },
  } as any;

  const heldPolling = runtimeStatus.polling;
  const publishCalls: string[] = [];

  startCloudSyncPolling({
    App,
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return ticks.length;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason));
    },
    diag: () => undefined,
    reason: 'realtime-disabled',
    pullAllNow: () => undefined,
  });

  assert.equal(runtimeStatus.polling, heldPolling);
  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(runtimeStatus.polling.intervalMs, 5000);
  assert.equal(runtimeStatus.polling.reason, 'realtime-disabled');
  assert.equal('driftedExtra' in runtimeStatus.polling, false);

  stopCloudSyncPolling({
    pollTimerRef,
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason));
    },
    diag: () => undefined,
    reason: 'manual-stop',
  });

  assert.equal(runtimeStatus.polling, heldPolling);
  assert.equal(runtimeStatus.polling.active, false);
  assert.equal(runtimeStatus.polling.intervalMs, 5000);
  assert.equal(runtimeStatus.polling.reason, 'manual-stop');
  assert.deepEqual(publishCalls, ['realtime-disabled', 'manual-stop']);
});

test('cloud sync polling start heals drifted polling status in place even when the owner timer already exists', () => {
  const publishCalls: string[] = [];
  const diagCalls: Array<[string, unknown]> = [];
  const runtimeStatus = {
    realtime: { state: 'disconnected' },
    polling: {
      active: false,
      intervalMs: 0,
      reason: 'stale-owner',
      driftedExtra: 'remove-me',
    },
  } as any;
  const heldPolling = runtimeStatus.polling;
  const pollTimerRef = { current: 7 as number | null };

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: {
            navigator: { onLine: true, userAgent: 'unit-test' },
            document: {
              visibilityState: 'visible',
              createElement() {
                return {};
              },
              querySelector() {
                return null;
              },
            },
          },
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: () => {
      throw new Error('setInterval must not run when the polling owner timer already exists');
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason));
    },
    diag: (event, payload) => {
      diagCalls.push([event, payload]);
    },
    reason: 'existing-owner',
    pullAllNow: () => undefined,
  });

  assert.equal(runtimeStatus.polling, heldPolling);
  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(runtimeStatus.polling.intervalMs, 5000);
  assert.equal(runtimeStatus.polling.reason, 'existing-owner');
  assert.equal('driftedExtra' in runtimeStatus.polling, false);
  assert.deepEqual(publishCalls, ['existing-owner']);
  assert.deepEqual(diagCalls, []);
});

test('cloud sync polling stop heals drifted polling status in place even when the owner timer is already gone', () => {
  const publishCalls: string[] = [];
  const diagCalls: Array<[string, unknown]> = [];
  const clearCalls: number[] = [];
  const runtimeStatus = {
    realtime: { state: 'disconnected' },
    polling: {
      active: true,
      intervalMs: 0,
      reason: 'stale-owner',
      driftedExtra: 'remove-me',
    },
  } as any;
  const heldPolling = runtimeStatus.polling;

  stopCloudSyncPolling({
    pollTimerRef: { current: null },
    clearIntervalFn: id => {
      clearCalls.push(Number(id) || 0);
    },
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason));
    },
    diag: (event, payload) => {
      diagCalls.push([event, payload]);
    },
    reason: 'lost-owner',
  });

  assert.equal(runtimeStatus.polling, heldPolling);
  assert.equal(runtimeStatus.polling.active, false);
  assert.equal(runtimeStatus.polling.intervalMs, 5000);
  assert.equal(runtimeStatus.polling.reason, 'lost-owner');
  assert.equal('driftedExtra' in runtimeStatus.polling, false);
  assert.deepEqual(publishCalls, ['lost-owner']);
  assert.deepEqual(clearCalls, []);
  assert.deepEqual(diagCalls, []);
});

test('cloud sync polling start/stop can heal timer state without publishing an intermediate status snapshot', () => {
  const ticks: Array<() => void> = [];
  const publishCalls: string[] = [];
  const runtimeStatus = {
    realtime: { state: 'connecting' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;
  const pollTimerRef = { current: null as number | null };

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: {
            navigator: { onLine: true, userAgent: 'unit-test' },
            document: {
              visibilityState: 'visible',
              createElement() {
                return {};
              },
              querySelector() {
                return null;
              },
            },
          },
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: handler => {
      ticks.push(handler);
      return ticks.length;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(`start:${String(runtimeStatus.polling.reason)}`);
    },
    diag: () => undefined,
    reason: 'realtime-timeout',
    pullAllNow: () => undefined,
    publish: false,
  });

  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(runtimeStatus.polling.reason, 'realtime-timeout');
  assert.deepEqual(publishCalls, []);

  stopCloudSyncPolling({
    pollTimerRef,
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(`stop:${String(runtimeStatus.polling.reason)}`);
    },
    diag: () => undefined,
    reason: 'realtime-subscribed',
    publish: false,
  });

  assert.equal(runtimeStatus.polling.active, false);
  assert.equal(runtimeStatus.polling.reason, 'realtime-subscribed');
  assert.deepEqual(publishCalls, []);
});

test('cloud sync polling realtime recovery reports pull and restart failures without breaking polling fallback', () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const intervalCallbacks: Array<() => void> = [];
  const publishCalls: string[] = [];
  const diagCalls: Array<{ event: string; payload: unknown }> = [];
  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'timeout', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
    lastError: '',
  } as any;
  const pollTimerRef = { current: null as any };

  startCloudSyncPolling({
    App: {
      services: {
        platform: {
          reportError(error: unknown, ctx: any) {
            reported.push({ error, ctx });
          },
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: handler => {
      intervalCallbacks.push(handler);
      return 21 as any;
    },
    clearIntervalFn: () => undefined,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason));
    },
    diag: (event, payload) => {
      diagCalls.push({ event: String(event), payload });
    },
    reason: 'realtime-timeout',
    pullAllNow: () => {
      throw new Error('recovery pull failed');
    },
    restartRealtime: () => {
      throw new Error('restart failed');
    },
  });

  assert.equal(pollTimerRef.current, 21, 'polling fallback must remain armed after recovery hook failures');
  assert.equal(intervalCallbacks.length, 1);
  assert.equal(runtimeStatus.polling.active, true);
  assert.equal(runtimeStatus.polling.reason, 'realtime-timeout');
  assert.deepEqual(publishCalls, ['realtime-timeout']);
  assert.equal(diagCalls[0]?.event, 'polling:start');
  assert.equal(reported.length, 2);
  assert.equal((reported[0]?.error as Error).message, 'recovery pull failed');
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncPolling.realtimeRecoveryPull');
  assert.equal((reported[1]?.error as Error).message, 'restart failed');
  assert.equal(reported[1]?.ctx?.op, 'cloudSyncPolling.realtimeRecoveryRestart');
});

test('cloud sync realtime status sync preserves the canonical realtime branch ref and heals drifted keys in place', () => {
  const runtimeStatus = {
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'idle',
      channel: 'wp:room-a',
      driftedExtra: 'remove-me',
    },
    polling: { active: false, intervalMs: 5000, reason: '' },
  } as any;

  const heldRealtime = runtimeStatus.realtime;
  const nextRealtime = syncCloudSyncRealtimeStatusInPlace({
    runtimeStatus,
    state: 'subscribed',
  });

  assert.equal(nextRealtime, heldRealtime);
  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.enabled, true);
  assert.equal(runtimeStatus.realtime.mode, 'broadcast');
  assert.equal(runtimeStatus.realtime.state, 'subscribed');
  assert.equal(runtimeStatus.realtime.channel, 'wp:room-a');
  assert.equal('driftedExtra' in runtimeStatus.realtime, false);

  runtimeStatus.realtime = ['broken-shell'] as any;
  const healedRealtime = syncCloudSyncRealtimeStatusInPlace({
    runtimeStatus,
    enabled: false,
    mode: 'broadcast',
    state: 'disabled',
    channel: '',
  });

  assert.notEqual(healedRealtime, heldRealtime);
  assert.equal(Array.isArray(runtimeStatus.realtime), false);
  assert.deepEqual(runtimeStatus.realtime, {
    enabled: false,
    mode: 'broadcast',
    state: 'disabled',
    channel: '',
  });
});

test('cloud sync realtime status sync canonicalizes realtime mode back to broadcast', () => {
  const runtimeStatus = {
    realtime: {
      enabled: true,
      mode: 'drifted-mode',
      state: 'idle',
      channel: 'wp:room-a',
      driftedExtra: 'remove-me',
    },
    polling: { active: false, intervalMs: 5000, reason: '' },
  } as any;

  const heldRealtime = runtimeStatus.realtime;
  syncCloudSyncRealtimeStatusInPlace({
    runtimeStatus,
    mode: 'invalid-mode',
    state: 'connecting',
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.mode, 'broadcast');
  assert.equal(runtimeStatus.realtime.state, 'connecting');
  assert.equal(runtimeStatus.realtime.channel, 'wp:room-a');
  assert.equal('driftedExtra' in runtimeStatus.realtime, false);
});

test('cloud sync realtime status sync clears stale channel for disabled and timeout transitions when requested explicitly', () => {
  const runtimeStatus = {
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'subscribed',
      channel: 'wp:room-a',
      driftedExtra: 'remove-me',
    },
    polling: { active: false, intervalMs: 5000, reason: '' },
  } as any;

  const heldRealtime = runtimeStatus.realtime;
  syncCloudSyncRealtimeStatusInPlace({
    runtimeStatus,
    enabled: false,
    state: 'disabled',
    channel: '',
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.enabled, false);
  assert.equal(runtimeStatus.realtime.state, 'disabled');
  assert.equal(runtimeStatus.realtime.channel, '');
  assert.equal('driftedExtra' in runtimeStatus.realtime, false);

  runtimeStatus.realtime.channel = 'wp:room-b';
  syncCloudSyncRealtimeStatusInPlace({
    runtimeStatus,
    state: 'timeout',
    channel: '',
  });

  assert.equal(runtimeStatus.realtime, heldRealtime);
  assert.equal(runtimeStatus.realtime.state, 'timeout');
  assert.equal(runtimeStatus.realtime.channel, '');
});

test('cloud sync pull-all-now requests an immediate main-row pull instead of keeping the stale delayed main timer', () => {
  const scheduleCalls: Array<{ reason?: string; immediate?: boolean }> = [];

  runCloudSyncPullAllNow({
    suppressRef: { v: false },
    mainPullTrigger: {
      trigger: (reason, immediate) => {
        scheduleCalls.push({ reason, immediate: !!immediate });
      },
    },
    pullCoalescers: {
      sketch: { trigger: () => undefined },
      tabsGate: { trigger: () => undefined },
      floatingSync: { trigger: () => undefined },
    },
    opts: { reason: 'poll' },
  });

  assert.deepEqual(scheduleCalls, [{ reason: 'poll.main', immediate: true }]);
});

test('cloud sync polling ignores stale interval callbacks after stop/restart and preserves the newer owner timer', () => {
  const intervalCallbacks = new Map<number, () => void>();
  const clearCalls: number[] = [];
  const pullCalls: string[] = [];
  const publishCalls: string[] = [];
  const diagCalls: Array<[string, unknown]> = [];
  const App = {
    deps: {
      browser: {
        window: {
          navigator: { onLine: true, userAgent: 'unit-test' },
          document: {
            visibilityState: 'visible',
            createElement() {
              return {};
            },
            querySelector() {
              return null;
            },
          },
        },
      },
    },
  } as any;
  App.deps.browser.document = App.deps.browser.window.document;
  App.deps.browser.navigator = App.deps.browser.window.navigator;

  let nextId = 1;
  const pollTimerRef = { current: null as number | null };
  const runtimeStatus = {
    realtime: { state: 'disconnected' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;

  const setIntervalFn = (handler: () => void): number => {
    const id = nextId++;
    intervalCallbacks.set(id, handler);
    return id;
  };
  const clearIntervalFn = (id: number | null | undefined): void => {
    clearCalls.push(Number(id) || 0);
  };

  startCloudSyncPolling({
    App,
    pollTimerRef,
    setIntervalFn,
    clearIntervalFn,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason || 'publish'));
    },
    diag: (event, payload) => {
      diagCalls.push([event, payload]);
    },
    reason: 'first-owner',
    pullAllNow: () => {
      pullCalls.push('pull');
    },
  });

  const firstIntervalId = pollTimerRef.current;
  assert.equal(firstIntervalId, 1);

  stopCloudSyncPolling({
    pollTimerRef,
    clearIntervalFn,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason || 'publish'));
    },
    diag: (event, payload) => {
      diagCalls.push([event, payload]);
    },
    reason: 'manual-stop',
  });

  startCloudSyncPolling({
    App,
    pollTimerRef,
    setIntervalFn,
    clearIntervalFn,
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => {
      publishCalls.push(String(runtimeStatus.polling.reason || 'publish'));
    },
    diag: (event, payload) => {
      diagCalls.push([event, payload]);
    },
    reason: 'second-owner',
    pullAllNow: () => {
      pullCalls.push('pull');
    },
  });

  const secondIntervalId = pollTimerRef.current;
  assert.equal(secondIntervalId, 2);
  assert.notEqual(secondIntervalId, firstIntervalId);

  runtimeStatus.realtime.state = 'subscribed';
  runtimeStatus.realtime.channel = 'wp:room-a';
  intervalCallbacks.get(firstIntervalId!)?.();

  assert.equal(
    pollTimerRef.current,
    secondIntervalId,
    'stale interval callback must not clear the newer polling timer'
  );
  assert.deepEqual(clearCalls, [1], 'only the explicit stop should clear the first timer');
  assert.deepEqual(pullCalls, [], 'stale interval callback should stay quiet');

  runtimeStatus.realtime.state = 'disconnected';
  intervalCallbacks.get(secondIntervalId!)?.();
  assert.deepEqual(pullCalls, ['pull'], 'current polling timer should still drive pulls normally');
});

test('cloud sync polling does not auto-stop when realtime is explicitly disabled even if subscribed state and channel drift remain', () => {
  const ticks: Array<() => void> = [];
  const stopReasons: string[] = [];
  const pullCalls: string[] = [];
  const clearCalls: number[] = [];
  const runtimeStatus = {
    realtime: { enabled: false, state: 'subscribed', channel: 'wp:room-a' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: {
            navigator: { onLine: true, userAgent: 'unit-test' },
            document: {
              visibilityState: 'visible',
              createElement() {
                return {};
              },
              querySelector() {
                return null;
              },
            },
          },
        },
      },
    } as any,
    pollTimerRef: { current: null },
    setIntervalFn: handler => {
      ticks.push(handler);
      return ticks.length;
    },
    clearIntervalFn: id => {
      clearCalls.push(Number(id) || 0);
    },
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: (event, payload) => {
      if (event === 'polling:stop') stopReasons.push(String(payload || ''));
    },
    reason: 'realtime-disabled',
    pullAllNow: () => {
      pullCalls.push('pull');
    },
  });

  ticks[0]();

  assert.deepEqual(stopReasons, []);
  assert.deepEqual(clearCalls, []);
  assert.deepEqual(pullCalls, ['pull']);
  assert.equal(runtimeStatus.polling.active, true);
});

test('cloud sync polling does not auto-stop on subscribed status alone when the realtime channel is already gone', () => {
  const ticks: Array<() => void> = [];
  const stopReasons: string[] = [];
  const pullCalls: string[] = [];
  const clearCalls: number[] = [];
  const runtimeStatus = {
    realtime: { state: 'subscribed', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
  } as any;

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: {
            navigator: { onLine: true, userAgent: 'unit-test' },
            document: {
              visibilityState: 'visible',
              createElement() {
                return {};
              },
              querySelector() {
                return null;
              },
            },
          },
        },
      },
    } as any,
    pollTimerRef: { current: null },
    setIntervalFn: handler => {
      ticks.push(handler);
      return ticks.length;
    },
    clearIntervalFn: id => {
      clearCalls.push(Number(id) || 0);
    },
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: (event, payload) => {
      if (event === 'polling:stop') stopReasons.push(String(payload || ''));
    },
    reason: 'realtime-disabled',
    pullAllNow: () => {
      pullCalls.push('pull');
    },
  });

  ticks[0]();

  assert.deepEqual(stopReasons, []);
  assert.deepEqual(clearCalls, []);
  assert.deepEqual(pullCalls, ['pull']);
  assert.equal(runtimeStatus.polling.active, true);
});

test('cloud sync polling tick clears its own stale interval when the lifecycle guard flips disposed', () => {
  const runtimeStatus = {
    realtime: { enabled: false, state: 'disabled', channel: '' },
    polling: { active: false, intervalMs: 0, reason: '' },
    lastError: '',
  } as any;
  const pollTimerRef = { current: null as any };
  const intervalCallbacks: Array<() => void> = [];
  const cleared: any[] = [];
  const pullCalls: string[] = [];
  const disposedRef = { current: false };

  startCloudSyncPolling({
    App: {
      deps: {
        browser: {
          window: { navigator: { onLine: true, userAgent: 'unit-test' } },
          document: {
            visibilityState: 'visible',
            createElement() {
              return {};
            },
            querySelector() {
              return null;
            },
          },
          navigator: { onLine: true, userAgent: 'unit-test' },
        },
      },
    } as any,
    pollTimerRef,
    setIntervalFn: (handler: () => void) => {
      intervalCallbacks.push(handler);
      return 17 as any;
    },
    clearIntervalFn: id => {
      cleared.push(id);
      if (pollTimerRef.current === id) pollTimerRef.current = null;
    },
    runtimeStatus,
    pollIntervalMs: 5000,
    publishStatus: () => undefined,
    diag: () => undefined,
    reason: 'realtime-timeout',
    suppressRef: { v: false },
    pullAllNow: opts => {
      pullCalls.push(String(opts?.reason || ''));
    },
    isDisposed: () => disposedRef.current,
  });

  assert.equal(pollTimerRef.current, 17);
  assert.equal(intervalCallbacks.length, 1);

  disposedRef.current = true;
  intervalCallbacks[0]?.();

  assert.equal(pollTimerRef.current, null);
  assert.deepEqual(cleared, [17]);
  assert.deepEqual(pullCalls, []);
});
