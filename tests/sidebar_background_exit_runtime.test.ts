import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSidebarBackgroundExit,
  createSidebarBackgroundExitState,
  scheduleSidebarBackgroundExit,
} from '../esm/native/ui/react/sidebar_background_exit.ts';

type TimeoutEntry = {
  id: number;
  fn: () => void;
  cleared: boolean;
};

function createSidebarApp(opts?: { withQueueMicrotask?: boolean }) {
  let nextTimeoutId = 1;
  const timeoutEntries: TimeoutEntry[] = [];
  const clearedTimeouts: Array<number | undefined> = [];
  const microtasks: Array<() => void> = [];
  const browser: any = {
    setTimeout(fn: () => void) {
      const id = nextTimeoutId++;
      timeoutEntries.push({ id, fn, cleared: false });
      return id;
    },
    clearTimeout(id?: number) {
      clearedTimeouts.push(id);
      const entry = timeoutEntries.find(item => item.id === id);
      if (entry) entry.cleared = true;
    },
  };
  if (opts?.withQueueMicrotask) {
    browser.queueMicrotask = (fn: () => void) => {
      microtasks.push(fn);
    };
  }

  return {
    App: { deps: { browser } } as any,
    timeoutEntries,
    clearedTimeouts,
    microtasks,
    runTimeout(id: number) {
      const entry = timeoutEntries.find(item => item.id === id);
      assert.ok(entry, `missing timeout ${id}`);
      entry.fn();
    },
    flushMicrotasks() {
      while (microtasks.length) {
        const fn = microtasks.shift();
        fn?.();
      }
    },
  };
}

test('sidebar background exit prefers browser queueMicrotask and keeps only the latest exit intent live', () => {
  const timers = createSidebarApp({ withQueueMicrotask: true });
  const state = createSidebarBackgroundExitState();
  const exits: string[] = [];

  scheduleSidebarBackgroundExit({
    App: timers.App,
    state,
    exitPrimaryMode() {
      exits.push('first');
    },
  });
  scheduleSidebarBackgroundExit({
    App: timers.App,
    state,
    exitPrimaryMode() {
      exits.push('second');
    },
  });

  assert.equal(timers.timeoutEntries.length, 0);
  assert.equal(timers.microtasks.length, 2);

  timers.flushMicrotasks();
  assert.deepEqual(exits, ['second']);
});

test('sidebar background exit fallback timeout clears pending work and suppresses stale late callbacks', () => {
  const originalQueueMicrotask = globalThis.queueMicrotask;
  try {
    // Force the fallback path instead of Node's global queueMicrotask.
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const timers = createSidebarApp();
    const state = createSidebarBackgroundExitState();
    const exits: string[] = [];

    scheduleSidebarBackgroundExit({
      App: timers.App,
      state,
      exitPrimaryMode() {
        exits.push('first');
      },
    });

    assert.equal(state.timeoutHandle, 1);

    scheduleSidebarBackgroundExit({
      App: timers.App,
      state,
      exitPrimaryMode() {
        exits.push('second');
      },
    });

    assert.deepEqual(timers.clearedTimeouts, [1]);
    assert.equal(state.timeoutHandle, 2);

    timers.runTimeout(1);
    assert.deepEqual(exits, []);

    clearSidebarBackgroundExit(timers.App, state);
    assert.deepEqual(timers.clearedTimeouts, [1, 2]);
    assert.equal(state.timeoutHandle, null);

    timers.runTimeout(2);
    assert.deepEqual(exits, []);
  } finally {
    Object.defineProperty(globalThis, 'queueMicrotask', {
      configurable: true,
      writable: true,
      value: originalQueueMicrotask,
    });
  }
});
