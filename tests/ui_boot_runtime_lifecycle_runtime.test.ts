import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginUiBootSession,
  clearUiBootRuntimeState,
  installUiBootReadyTimers,
} from '../esm/native/services/ui_boot_runtime.ts';
import { getUiBootRuntimeState } from '../esm/native/runtime/ui_boot_state_access.ts';

type TimeoutTask = { id: number; fn: () => void; due: number; active: boolean };

function createTimerHarness() {
  let now = 0;
  let nextId = 1;
  const tasks: TimeoutTask[] = [];

  return {
    now: () => now,
    setTimeout(fn: () => void, ms?: number) {
      const task: TimeoutTask = {
        id: nextId++,
        fn,
        due: now + (typeof ms === 'number' ? ms : 0),
        active: true,
      };
      tasks.push(task);
      return task.id;
    },
    clearTimeout(id?: number) {
      const task = tasks.find(entry => entry.id === id);
      if (task) task.active = false;
    },
    advance(ms: number) {
      now += ms;
      let ran = true;
      while (ran) {
        ran = false;
        for (const task of [...tasks]) {
          if (!task.active || task.due > now) continue;
          task.active = false;
          ran = true;
          task.fn();
        }
      }
    },
    activeCount() {
      return tasks.filter(task => task.active).length;
    },
  };
}

function createAppHarness() {
  const readyWrites: Array<{ on: boolean; source: string }> = [];
  const logs: string[] = [];
  const timers = createTimerHarness();
  const doc = {
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  } as Document;
  const nav = { userAgent: 'node-test' } as Navigator;
  const loc = { href: 'http://localhost/', search: '' } as Location;
  const win = {
    document: doc,
    navigator: nav,
    location: loc,
    setTimeout: (cb: () => void, ms?: number) => timers.setTimeout(cb, ms),
    clearTimeout: (id?: number) => timers.clearTimeout(id),
    setInterval,
    clearInterval,
    requestAnimationFrame: (cb: FrameRequestCallback) => timers.setTimeout(() => cb(timers.now()), 16),
    cancelAnimationFrame: (handle: number) => timers.clearTimeout(handle),
  } as Window;
  const App: any = {
    actions: {
      runtime: {
        setScalar(key: string, value: unknown, meta: { source: string }) {
          if (key === 'systemReady') readyWrites.push({ on: !!value, source: meta.source });
        },
      },
    },
    services: {
      autosave: {},
      platform: {
        util: {
          log: (...args: unknown[]) => logs.push(args.join(' ')),
        },
      },
    },
    deps: {
      browser: {
        document: doc,
        navigator: nav,
        location: loc,
        window: win,
      },
    },
  };

  return { App, logs, readyWrites, timers };
}

test('ui boot runtime lifecycle owns boot session flags and ready timers', () => {
  const { App, logs, readyWrites, timers } = createAppHarness();

  assert.equal(beginUiBootSession(App), true);
  assert.equal(beginUiBootSession(App), false);

  installUiBootReadyTimers(App);
  assert.equal(timers.activeCount(), 2);

  timers.advance(1100);

  assert.deepEqual(readyWrites, [
    { on: false, source: 'ui/boot_main' },
    { on: true, source: 'ui/boot_main' },
  ]);
  assert.equal(App.services.autosave.allow, true);
  assert.ok(logs.some(line => line.includes('System Ready. Autosave active.')));

  clearUiBootRuntimeState(App);
  assert.deepEqual(getUiBootRuntimeState(App), {
    didInit: true,
    booting: false,
    bootBuildScheduled: false,
    bootBuildArgs: null,
  });
});

test('ui boot runtime lifecycle keeps one ready-timer owner and stale callbacks cannot publish after clear/reschedule', () => {
  const { App, logs, readyWrites, timers } = createAppHarness();

  beginUiBootSession(App);
  installUiBootReadyTimers(App);
  const firstPending = timers.activeCount();
  assert.equal(firstPending, 2);

  installUiBootReadyTimers(App);
  assert.equal(timers.activeCount(), 2, 'reschedule should keep only the latest ready/clear timers active');

  clearUiBootRuntimeState(App);
  assert.equal(timers.activeCount(), 0, 'clear should cancel both pending ui boot timers');

  timers.advance(3000);
  assert.deepEqual(readyWrites, [
    { on: false, source: 'ui/boot_main' },
    { on: false, source: 'ui/boot_main' },
  ]);
  assert.equal(logs.length, 0);
  assert.equal(App.services.autosave.allow, undefined);
  assert.deepEqual(getUiBootRuntimeState(App), {
    didInit: true,
    booting: false,
    bootBuildScheduled: false,
    bootBuildArgs: null,
  });
});
