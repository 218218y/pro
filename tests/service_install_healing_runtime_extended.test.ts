import test from 'node:test';
import assert from 'node:assert/strict';

import { installAutosaveService } from '../esm/native/services/autosave.ts';
import { installCameraService } from '../esm/native/services/camera_runtime.ts';
import { installConfigCompoundsService } from '../esm/native/services/config_compounds_runtime.ts';

test('service install healing: autosave preserves canonical refs and heals missing methods in place', () => {
  const App: any = {
    actions: { ui: { setScalarSoft() {} } },
    services: {
      storage: {
        getString() {
          return null;
        },
        setString() {
          return true;
        },
      },
      project: {
        capture() {
          return { settings: { width: 120 } };
        },
      },
      platform: { util: {} },
    },
    store: {
      getState() {
        return {
          ui: {},
          config: {},
          runtime: { systemReady: true, restoring: false },
          mode: {},
          meta: {},
        };
      },
    },
  };

  const svc = installAutosaveService(App);
  const scheduleRef = svc.schedule;
  const flushRef = svc.flushPending;
  const forceRef = svc.forceSaveNow;

  assert.equal(typeof scheduleRef, 'function');
  assert.equal(typeof flushRef, 'function');
  assert.equal(typeof forceRef, 'function');

  const sameSvc = installAutosaveService(App);
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.schedule, scheduleRef);
  assert.equal(sameSvc.flushPending, flushRef);
  assert.equal(sameSvc.forceSaveNow, forceRef);

  delete (svc as Record<string, unknown>).flushPending;
  const healedFlush = installAutosaveService(App);
  assert.equal(healedFlush, svc);
  assert.equal(healedFlush.schedule, scheduleRef);
  assert.equal(typeof healedFlush.flushPending, 'function');
  assert.equal(healedFlush.forceSaveNow, forceRef);

  delete (svc as Record<string, unknown>).schedule;
  delete (svc as Record<string, unknown>).forceSaveNow;
  const healedAll = installAutosaveService(App);
  assert.equal(healedAll, svc);
  assert.equal(typeof healedAll.schedule, 'function');
  assert.equal(typeof healedAll.forceSaveNow, 'function');
  assert.equal(healedAll.flushPending, healedFlush.flushPending);
});

test('service install healing: camera preserves canonical moveTo and heals missing move handler in place', () => {
  const App: any = { services: Object.create(null) };

  const svc = installCameraService(App);
  const moveRef = svc.moveTo;
  assert.equal(typeof moveRef, 'function');

  const sameSvc = installCameraService(App);
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.moveTo, moveRef);

  delete (svc as Record<string, unknown>).moveTo;
  const healedSvc = installCameraService(App);
  assert.equal(healedSvc, svc);
  assert.equal(typeof healedSvc.moveTo, 'function');
  assert.equal(
    healedSvc.moveTo,
    moveRef,
    'healed missing moveTo should restore the canonical handler rather than churn a fresh wrapper'
  );
  assert.equal((healedSvc as Record<string, unknown>).__wpMoveTo, moveRef);
});

test('service install healing: config compounds preserves canonical methods, heals missing ones, and refreshes cloned options', () => {
  const App: any = { services: Object.create(null) };

  const svc = installConfigCompoundsService(App, { maxAttempts: 2, retryDelayMs: 5 });
  const seedRef = svc.seed;
  const seededRef = svc.isSeeded;

  assert.equal(typeof seedRef, 'function');
  assert.equal(typeof seededRef, 'function');
  assert.deepEqual(svc.options, { maxAttempts: 2, retryDelayMs: 5 });

  const sameSvc = installConfigCompoundsService(App, { maxAttempts: 7, retryDelayMs: 9 });
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.seed, seedRef);
  assert.equal(sameSvc.isSeeded, seededRef);
  assert.deepEqual(sameSvc.options, { maxAttempts: 7, retryDelayMs: 9 });

  delete (svc as Record<string, unknown>).seed;
  const healedSeed = installConfigCompoundsService(App, { maxAttempts: 4, retryDelayMs: 1 });
  assert.equal(healedSeed, svc);
  assert.equal(typeof healedSeed.seed, 'function');
  assert.equal(healedSeed.isSeeded, seededRef);
  assert.deepEqual(healedSeed.options, { maxAttempts: 4, retryDelayMs: 1 });

  delete (svc as Record<string, unknown>).isSeeded;
  const healedAll = installConfigCompoundsService(App, { maxAttempts: 1, retryDelayMs: 0 });
  assert.equal(healedAll, svc);
  assert.equal(typeof healedAll.seed, 'function');
  assert.equal(typeof healedAll.isSeeded, 'function');
  assert.deepEqual(healedAll.options, { maxAttempts: 1, retryDelayMs: 0 });
});
