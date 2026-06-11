import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelAutosaveTimer,
  flushAutosavePending,
  installAutosaveService,
  scheduleAutosave,
} from '../esm/native/services/autosave.ts';

function createRootState(runtime: Record<string, unknown>, ui: Record<string, unknown> = {}) {
  return {
    ui,
    config: {},
    runtime,
    mode: {},
    meta: {},
  };
}

function createApp(label: string, opts: { idleAvailable?: boolean } = {}) {
  const timers: Array<{ handle: number; ms: number; cb: () => void }> = [];
  const cleared: number[] = [];
  const uiWrites: Array<{ key: string; value: unknown; meta: any }> = [];
  const storageWrites: Array<{ key: string; payload: any }> = [];
  const idleRuns: Array<{ cb: () => void; timeout?: number }> = [];
  const idleAvailable = opts.idleAvailable !== false;
  let handle = 1;

  const App = {
    deps: {
      browser: {
        setTimeout(cb: () => void, ms?: number) {
          const next = { handle: handle++, ms: Number(ms || 0), cb };
          timers.push(next);
          return next.handle;
        },
        clearTimeout(nextHandle?: number) {
          if (typeof nextHandle === 'number') cleared.push(nextHandle);
        },
      },
    },
    services: {
      platform: {
        util: idleAvailable
          ? {
              idle(cb: () => void, timeout?: number) {
                idleRuns.push({ cb, timeout });
                return true;
              },
            }
          : {},
      },
      storage: {
        getString(key: string) {
          if (key !== 'wardrobe_autosave_latest') return null;
          return JSON.stringify({ timestamp: 111, dateString: '08:45' });
        },
        setString(key: string, value: string) {
          storageWrites.push({ key, payload: JSON.parse(value), label });
          return true;
        },
      },
      project: {
        capture(scope: string) {
          return { scope, settings: { width: 120 } };
        },
      },
    },
    actions: {
      ui: {
        setScalarSoft(key: string, value: unknown, meta?: unknown) {
          uiWrites.push({ key, value, meta });
        },
      },
    },
    store: {
      getState() {
        return createRootState(
          { systemReady: true, restoring: false },
          { orderPdfEditorDraft: { pages: [{ id: 1 }] }, orderPdfEditorZoom: 1.25 }
        );
      },
    },
  } as any;

  return { App, timers, cleared, uiWrites, storageWrites, idleRuns };
}

test('autosave service: install exposes restore info immediately and schedule reuses one pending timer', () => {
  cancelAutosaveTimer();

  const { App, timers, cleared, uiWrites, storageWrites, idleRuns } = createApp('primary');

  const svc = installAutosaveService(App);
  assert.equal(typeof svc.schedule, 'function');
  assert.equal(typeof svc.cancelPending, 'function');
  assert.equal(typeof svc.flushPending, 'function');
  assert.equal(typeof svc.forceSaveNow, 'function');
  assert.equal(uiWrites[0].key, 'autosaveInfo');
  assert.deepEqual(uiWrites[0].value, { timestamp: 111, dateString: '08:45' });
  assert.equal(uiWrites[0].meta?.source, 'autosave:info');
  assert.equal(uiWrites[0].meta?.uiOnly, true);

  scheduleAutosave(App);
  const firstTimer = timers.at(-1);
  scheduleAutosave(App);
  assert.equal(timers.length, 1);
  assert.deepEqual(cleared, []);
  assert.equal(firstTimer?.ms, 4000);

  firstTimer?.cb();
  assert.equal(idleRuns.length, 1);
  assert.equal(idleRuns[0].timeout, 1500);
  idleRuns[0].cb();

  assert.equal(storageWrites.length, 1);
  assert.equal(storageWrites[0].key, 'wardrobe_autosave_latest');
  assert.equal(storageWrites[0].payload.version, '2.1');
  assert.deepEqual(storageWrites[0].payload.orderPdfEditorDraft, { pages: [{ id: 1 }] });
  assert.equal(storageWrites[0].payload.orderPdfEditorZoom, 1.25);
  assert.equal(storageWrites[0].payload.scope, 'persist');
  assert.equal(uiWrites[1].key, 'autosaveInfo');
  assert.deepEqual(uiWrites[1].value, {
    timestamp: storageWrites[0].payload.timestamp,
    dateString: storageWrites[0].payload.dateString,
  });
  assert.equal(uiWrites[1].meta?.source, 'autosave:info');
  assert.equal(uiWrites[1].meta?.uiOnly, true);

  scheduleAutosave(App);
  assert.equal(svc.cancelPending?.(), true);
  assert.equal(cleared.length >= 1, true);
  assert.equal(flushAutosavePending(App), true);
  assert.equal(storageWrites.length, 2);

  cancelAutosaveTimer();
});

test('autosave service: flush invalidates an older idle callback so stale autosave does not run twice', () => {
  cancelAutosaveTimer();

  const { App, timers, storageWrites, idleRuns } = createApp('flush-stale');
  installAutosaveService(App);

  scheduleAutosave(App);
  assert.equal(timers.length, 1);
  timers[0].cb();
  assert.equal(idleRuns.length, 1);

  assert.equal(flushAutosavePending(App), true);
  assert.equal(storageWrites.length, 1);

  idleRuns[0].cb();
  assert.equal(storageWrites.length, 1);

  cancelAutosaveTimer();
});

test('autosave service: scheduling is isolated per app instead of one app cancelling another app timer', () => {
  cancelAutosaveTimer();

  const first = createApp('first');
  const second = createApp('second');
  installAutosaveService(first.App);
  installAutosaveService(second.App);

  scheduleAutosave(first.App);
  scheduleAutosave(second.App);

  assert.equal(first.timers.length, 1);
  assert.equal(second.timers.length, 1);
  assert.deepEqual(first.cleared, []);
  assert.deepEqual(second.cleared, []);

  first.timers[0].cb();
  second.timers[0].cb();
  first.idleRuns[0].cb();
  second.idleRuns[0].cb();

  assert.equal(first.storageWrites.length, 1);
  assert.equal(second.storageWrites.length, 1);

  cancelAutosaveTimer();
});

test('autosave service: app-scoped cancellation only clears the targeted app timer', () => {
  cancelAutosaveTimer();

  const first = createApp('first-cancel');
  const second = createApp('second-cancel');
  installAutosaveService(first.App);
  installAutosaveService(second.App);

  scheduleAutosave(first.App);
  scheduleAutosave(second.App);

  cancelAutosaveTimer(first.App);

  assert.equal(first.cleared.length, 1);
  assert.equal(second.cleared.length, 0);

  second.timers[0].cb();
  second.idleRuns[0].cb();

  assert.equal(first.storageWrites.length, 0);
  assert.equal(second.storageWrites.length, 1);

  cancelAutosaveTimer();
});

test('autosave service: fallback timeout is cleared on cancel so stale post-trigger autosave cannot publish later', () => {
  cancelAutosaveTimer();

  const { App, timers, cleared, storageWrites, idleRuns } = createApp('fallback-cancel', {
    idleAvailable: false,
  });
  installAutosaveService(App);

  scheduleAutosave(App);
  assert.equal(timers.length, 1);

  timers[0].cb();
  assert.equal(idleRuns.length, 0, 'idle path should stay unused when platform idle is unavailable');
  assert.equal(timers.length, 2, 'fallback should schedule a zero-delay timer when idle is unavailable');
  const fallbackTimer = timers[1];

  cancelAutosaveTimer(App);

  assert.ok(cleared.includes(fallbackTimer.handle), 'cancel should clear the pending fallback timeout');
  assert.equal(storageWrites.length, 0);

  fallbackTimer.cb();
  assert.equal(storageWrites.length, 0, 'stale cleared fallback callback must not commit autosave later');

  cancelAutosaveTimer();
});

test('autosave service: flush clears pending fallback timeout and keeps stale fallback callback from double-saving', () => {
  cancelAutosaveTimer();

  const { App, timers, cleared, storageWrites, idleRuns } = createApp('fallback-flush', {
    idleAvailable: false,
  });
  installAutosaveService(App);

  scheduleAutosave(App);
  timers[0].cb();
  assert.equal(idleRuns.length, 0);
  assert.equal(timers.length, 2);
  const fallbackTimer = timers[1];

  assert.equal(flushAutosavePending(App), true);
  assert.ok(cleared.includes(fallbackTimer.handle), 'flush should clear the pending fallback timeout');
  assert.equal(storageWrites.length, 1);

  fallbackTimer.cb();
  assert.equal(storageWrites.length, 1, 'stale cleared fallback callback must not run a second autosave');

  cancelAutosaveTimer();
});
