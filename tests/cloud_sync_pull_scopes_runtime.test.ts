import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCloudSyncRealtimeScopedHandlerMap,
  cancelCloudSyncPullScopeMap,
  createCloudSyncPullAllTriggerMap,
  createCloudSyncRealtimeScopedHandlerMap,
  createCloudSyncRealtimeScopedValueMap,
  forEachCloudSyncRealtimeScopedHandlerScope,
  createCloudSyncInstallPullRunnerMap,
  createCloudSyncPullCoalescerMap,
  createCloudSyncPullScopeMap,
  createCloudSyncRealtimePullScopeHandlerMap,
  createCloudSyncRealtimeScopedHandlerMapFromTriggers,
  forEachCloudSyncTriggeredPullScope,
  invokeCloudSyncRealtimeScopedHandler,
  normalizeCloudSyncPullScopeLabel,
  triggerCloudSyncPullAllScopes,
  triggerCloudSyncPullScopes,
} from '../esm/native/services/cloud_sync_pull_scopes.ts';

test('cloud sync pull scope helpers build canonical maps in declared scope order', () => {
  const seen: string[] = [];
  const values = createCloudSyncPullScopeMap(scope => {
    seen.push(scope);
    return `${scope}:ok`;
  });

  assert.deepEqual(seen, ['sketch', 'tabsGate', 'floatingSync']);
  assert.deepEqual(values, {
    sketch: 'sketch:ok',
    tabsGate: 'tabsGate:ok',
    floatingSync: 'floatingSync:ok',
  });
});

test('cloud sync pull scope helpers skip control pulls only when requested', () => {
  const withoutControls: string[] = [];
  const withControls: string[] = [];

  forEachCloudSyncTriggeredPullScope(false, scope => {
    withoutControls.push(scope);
  });
  forEachCloudSyncTriggeredPullScope(true, scope => {
    withControls.push(scope);
  });

  assert.deepEqual(withoutControls, ['sketch']);
  assert.deepEqual(withControls, ['sketch', 'tabsGate', 'floatingSync']);
});

test('cloud sync realtime scoped handler helpers route main + pull scopes and ignore all', () => {
  const calls: string[] = [];
  const handlers = buildCloudSyncRealtimeScopedHandlerMap({
    handleRealtimeMain: () => {
      calls.push('main');
    },
    pullScopeHandlers: {
      sketch: () => {
        calls.push('sketch');
      },
      tabsGate: () => {
        calls.push('tabsGate');
      },
      floatingSync: () => {
        calls.push('floatingSync');
      },
    },
  });

  assert.equal(invokeCloudSyncRealtimeScopedHandler('all', handlers), false);
  assert.equal(invokeCloudSyncRealtimeScopedHandler('main', handlers), true);
  assert.equal(invokeCloudSyncRealtimeScopedHandler('sketch', handlers), true);
  assert.equal(invokeCloudSyncRealtimeScopedHandler('tabsGate', handlers), true);
  assert.equal(invokeCloudSyncRealtimeScopedHandler('floatingSync', handlers), true);
  assert.deepEqual(calls, ['main', 'sketch', 'tabsGate', 'floatingSync']);
});

test('cloud sync realtime scoped handler helpers build canonical maps in declared realtime scope order', () => {
  const seen: string[] = [];
  forEachCloudSyncRealtimeScopedHandlerScope(scope => {
    seen.push(scope);
  });

  const calls: string[] = [];
  const handlers = createCloudSyncRealtimeScopedHandlerMap(scope => () => {
    calls.push(scope);
  });

  assert.deepEqual(seen, ['main', 'sketch', 'tabsGate', 'floatingSync']);
  handlers.main();
  handlers.sketch();
  handlers.tabsGate();
  handlers.floatingSync();
  assert.deepEqual(calls, ['main', 'sketch', 'tabsGate', 'floatingSync']);
});

test('cloud sync pull scope helpers normalize diag labels through the canonical scope seam', () => {
  assert.equal(normalizeCloudSyncPullScopeLabel(' sketch '), 'sketch');
  assert.equal(normalizeCloudSyncPullScopeLabel('all'), 'pull');
  assert.equal(normalizeCloudSyncPullScopeLabel(''), 'pull');
  assert.equal(normalizeCloudSyncPullScopeLabel('unknown'), 'unknown');
});

test('cloud sync pull scope helpers build install pull runners from one canonical scope seam', async () => {
  const calls: string[] = [];
  const runners = createCloudSyncInstallPullRunnerMap({
    pullSketchOnce: force => {
      calls.push(`sketch:${String(force)}`);
    },
    pullTabsGateOnce: async force => {
      calls.push(`tabsGate:${String(force)}`);
    },
    pullFloatingSketchSyncPinnedOnce: force => {
      calls.push(`floatingSync:${String(force)}`);
    },
  });

  await runners.sketch();
  await runners.tabsGate();
  await runners.floatingSync();

  assert.deepEqual(calls, ['sketch:false', 'tabsGate:false', 'floatingSync:false']);
});

test('cloud sync pull scope helpers build coalescers from the same canonical runner + scope registry', () => {
  const calls: string[] = [];
  const pullRunners = createCloudSyncInstallPullRunnerMap({
    pullSketchOnce: () => {
      calls.push('run:sketch');
    },
    pullTabsGateOnce: () => {
      calls.push('run:tabsGate');
    },
    pullFloatingSketchSyncPinnedOnce: () => {
      calls.push('run:floatingSync');
    },
  });

  const coalescers = createCloudSyncPullCoalescerMap({
    pullRunners,
    createPullCoalescer: (scope, run, spec) => ({
      trigger: (reason: string) => {
        calls.push(`trigger:${scope}:${reason}:${spec.debounceMs}`);
        void run();
      },
      cancel: () => {
        calls.push(`cancel:${scope}`);
      },
    }),
  });

  coalescers.sketch.trigger('first');
  coalescers.tabsGate.trigger('second');
  coalescers.floatingSync.cancel();

  assert.deepEqual(calls, [
    'trigger:sketch:first:120',
    'run:sketch',
    'trigger:tabsGate:second:90',
    'run:tabsGate',
    'cancel:floatingSync',
  ]);
});

test('cloud sync pull scope helpers cancel coalescers in canonical scope order', () => {
  const calls: string[] = [];
  cancelCloudSyncPullScopeMap({
    sketch: { cancel: () => calls.push('sketch') },
    tabsGate: { cancel: () => calls.push('tabsGate') },
    floatingSync: { cancel: () => calls.push('floatingSync') },
  });

  assert.deepEqual(calls, ['sketch', 'tabsGate', 'floatingSync']);
});

test('cloud sync pull scope helpers trigger canonical scope reasons from one registry seam', () => {
  const calls: Array<[string, string, boolean]> = [];
  triggerCloudSyncPullScopes({
    pullTriggers: {
      sketch: { trigger: (reason, immediate) => calls.push(['sketch', reason, !!immediate]) },
      tabsGate: { trigger: (reason, immediate) => calls.push(['tabsGate', reason, !!immediate]) },
      floatingSync: { trigger: (reason, immediate) => calls.push(['floatingSync', reason, !!immediate]) },
    },
    includeControls: false,
    reason: 'focus',
    immediate: true,
  });

  assert.deepEqual(calls, [['sketch', 'focus.sketch', true]]);
});

test('cloud sync pull scope helpers build realtime pull handlers from the canonical trigger registry', () => {
  const calls: Array<[string, string, boolean]> = [];
  let realtimeEvents = 0;
  const handlers = createCloudSyncRealtimePullScopeHandlerMap({
    markRealtimeEvent: () => {
      realtimeEvents += 1;
      return realtimeEvents === 1;
    },
    pullTriggers: {
      sketch: { trigger: (reason, immediate) => calls.push(['sketch', reason, !!immediate]) },
      tabsGate: { trigger: (reason, immediate) => calls.push(['tabsGate', reason, !!immediate]) },
      floatingSync: { trigger: (reason, immediate) => calls.push(['floatingSync', reason, !!immediate]) },
    },
    reason: 'rt',
    immediate: true,
  });

  handlers.sketch();
  handlers.tabsGate();

  assert.deepEqual(calls, [['sketch', 'rt.sketch', true]]);
  assert.equal(realtimeEvents, 2);
});

test('cloud sync pull scope helpers build full realtime scoped handlers from one canonical trigger seam', () => {
  const calls: Array<[string, string, boolean]> = [];
  let mainEvents = 0;
  let pullEvents = 0;
  const handlers = createCloudSyncRealtimeScopedHandlerMapFromTriggers({
    markRealtimeEvent: () => {
      if (mainEvents === 0) {
        mainEvents += 1;
        return true;
      }
      pullEvents += 1;
      return pullEvents === 1;
    },
    mainTrigger: {
      trigger: (reason, immediate) => {
        calls.push(['main', reason, !!immediate]);
      },
    },
    pullTriggers: {
      sketch: { trigger: (reason, immediate) => calls.push(['sketch', reason, !!immediate]) },
      tabsGate: { trigger: (reason, immediate) => calls.push(['tabsGate', reason, !!immediate]) },
      floatingSync: { trigger: (reason, immediate) => calls.push(['floatingSync', reason, !!immediate]) },
    },
    reason: 'rt',
    immediatePulls: true,
  });

  handlers.main();
  handlers.sketch();
  handlers.tabsGate();

  assert.deepEqual(calls, [
    ['main', 'rt.main', true],
    ['sketch', 'rt.sketch', true],
  ]);
  assert.equal(mainEvents, 1);
  assert.equal(pullEvents, 2);
});

test('cloud sync pull scope helpers build realtime scoped value maps in canonical order', () => {
  const seen: string[] = [];
  const values = createCloudSyncRealtimeScopedValueMap(scope => {
    seen.push(scope);
    return `${scope}:ok`;
  });

  assert.deepEqual(seen, ['main', 'sketch', 'tabsGate', 'floatingSync']);
  assert.deepEqual(values, {
    main: 'main:ok',
    sketch: 'sketch:ok',
    tabsGate: 'tabsGate:ok',
    floatingSync: 'floatingSync:ok',
  });
});

test('cloud sync pull scope helpers build full pull-all trigger maps from one canonical realtime scope seam', () => {
  const calls: Array<[string, string, boolean]> = [];
  const triggers = createCloudSyncPullAllTriggerMap({
    mainTrigger: {
      trigger: (reason, immediate) => {
        calls.push(['main', reason, !!immediate]);
      },
    },
    pullTriggers: {
      sketch: { trigger: (reason, immediate) => calls.push(['sketch', reason, !!immediate]) },
      tabsGate: { trigger: (reason, immediate) => calls.push(['tabsGate', reason, !!immediate]) },
      floatingSync: { trigger: (reason, immediate) => calls.push(['floatingSync', reason, !!immediate]) },
    },
  });

  triggers.main.trigger('focus', true);
  triggers.sketch.trigger('focus.sketch', false);

  assert.deepEqual(calls, [
    ['main', 'focus', true],
    ['sketch', 'focus.sketch', false],
  ]);
});

test('cloud sync pull scope helpers trigger main + pull fanout from one canonical realtime scope seam', () => {
  const calls: Array<[string, string, boolean]> = [];
  triggerCloudSyncPullAllScopes({
    mainTrigger: {
      trigger: (reason, immediate) => {
        calls.push(['main', reason, !!immediate]);
      },
    },
    pullTriggers: {
      sketch: { trigger: (reason, immediate) => calls.push(['sketch', reason, !!immediate]) },
      tabsGate: { trigger: (reason, immediate) => calls.push(['tabsGate', reason, !!immediate]) },
      floatingSync: { trigger: (reason, immediate) => calls.push(['floatingSync', reason, !!immediate]) },
    },
    includeControls: false,
    reason: 'focus',
    immediateMain: true,
    immediatePulls: true,
  });

  assert.deepEqual(calls, [
    ['main', 'focus.main', true],
    ['sketch', 'focus.sketch', true],
  ]);
});
