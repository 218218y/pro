import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearOverlayFeedbackPromptFocusTimers,
  clearOverlayFeedbackToastTimers,
  createOverlayFeedbackPromptFocusTimerState,
  createOverlayFeedbackToastTimerState,
  scheduleOverlayFeedbackPromptFocusTimers,
  scheduleOverlayFeedbackToastTimers,
} from '../esm/native/ui/react/overlay_feedback_host_timers.ts';

type TimeoutEntry = {
  id: number;
  fn: () => void;
  cleared: boolean;
};

type AnimationEntry = {
  id: number;
  fn: () => void;
  cancelled: boolean;
};

function createFeedbackTimerApp() {
  let nextTimeoutId = 1;
  let nextAnimationId = 1;
  const timeoutEntries: TimeoutEntry[] = [];
  const animationEntries: AnimationEntry[] = [];
  const clearedTimeouts: Array<number | undefined> = [];
  const cancelledAnimations: number[] = [];
  const App: any = {
    deps: {
      browser: {
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
        requestAnimationFrame(cb: FrameRequestCallback) {
          const id = nextAnimationId++;
          animationEntries.push({ id, fn: () => cb(id), cancelled: false });
          return id;
        },
        cancelAnimationFrame(id: number) {
          cancelledAnimations.push(id);
          const entry = animationEntries.find(item => item.id === id);
          if (entry) entry.cancelled = true;
        },
      },
    },
  };

  return {
    App,
    timeoutEntries,
    animationEntries,
    clearedTimeouts,
    cancelledAnimations,
    runTimeout(id: number) {
      const entry = timeoutEntries.find(item => item.id === id);
      assert.ok(entry, `missing timeout ${id}`);
      entry.fn();
    },
    runAnimation(id: number) {
      const entry = animationEntries.find(item => item.id === id);
      assert.ok(entry, `missing animation ${id}`);
      entry.fn();
    },
  };
}

test('overlay feedback toast timers keep one active lifecycle and ignore stale callbacks after reschedule', () => {
  const timers = createFeedbackTimerApp();
  const state = createOverlayFeedbackToastTimerState();
  const shown: boolean[] = [];
  const removed: number[] = [];
  const reports: string[] = [];

  scheduleOverlayFeedbackToastTimers({
    App: timers.App,
    state,
    itemId: 7,
    setShown(value) {
      shown.push(value);
    },
    onRemove(id) {
      removed.push(id);
    },
    report(op) {
      reports.push(op);
    },
  });

  assert.equal(state.showHandle, 1);
  assert.equal(state.hideHandle, 2);
  assert.deepEqual(timers.clearedTimeouts, []);

  scheduleOverlayFeedbackToastTimers({
    App: timers.App,
    state,
    itemId: 7,
    setShown(value) {
      shown.push(value ? true : false);
    },
    onRemove(id) {
      removed.push(id);
    },
    report(op) {
      reports.push(op);
    },
  });

  assert.deepEqual(timers.clearedTimeouts, [1, 2]);
  assert.equal(state.showHandle, 3);
  assert.equal(state.hideHandle, 4);

  timers.runTimeout(1);
  timers.runTimeout(2);
  assert.deepEqual(shown, []);
  assert.deepEqual(removed, []);

  timers.runTimeout(3);
  assert.deepEqual(shown, [true]);
  timers.runTimeout(4);
  assert.deepEqual(shown, [true, false]);
  assert.equal(state.removeHandle, 5);

  clearOverlayFeedbackToastTimers(timers.App, state);
  assert.deepEqual(timers.clearedTimeouts, [1, 2, 5]);
  assert.equal(state.removeHandle, null);

  timers.runTimeout(5);
  assert.deepEqual(removed, []);
  assert.deepEqual(reports, []);
});

test('overlay feedback prompt focus timers use injected browser timers and suppress stale animation/timeout callbacks', () => {
  const timers = createFeedbackTimerApp();
  const state = createOverlayFeedbackPromptFocusTimerState();
  const focusCalls: string[] = [];
  const reports: string[] = [];

  scheduleOverlayFeedbackPromptFocusTimers({
    App: timers.App,
    state,
    report(op) {
      reports.push(op);
    },
    scheduleAnimationFrame(focusAndSelect) {
      return timers.App.deps.browser.requestAnimationFrame(focusAndSelect);
    },
    runFocusAndSelect() {
      focusCalls.push('focus');
    },
  });

  assert.equal(timers.animationEntries.length, 1);
  assert.equal(state.immediateHandle, 1);
  assert.equal(state.fallbackHandle, 2);

  scheduleOverlayFeedbackPromptFocusTimers({
    App: timers.App,
    state,
    report(op) {
      reports.push(op);
    },
    scheduleAnimationFrame(focusAndSelect) {
      return timers.App.deps.browser.requestAnimationFrame(focusAndSelect);
    },
    runFocusAndSelect() {
      focusCalls.push('focus:new');
    },
  });

  assert.deepEqual(timers.cancelledAnimations, [1]);
  assert.deepEqual(timers.clearedTimeouts, [1, 2]);
  assert.equal(state.animationHandle, 2);
  assert.equal(state.immediateHandle, 3);
  assert.equal(state.fallbackHandle, 4);

  timers.runAnimation(1);
  timers.runTimeout(1);
  timers.runTimeout(2);
  assert.deepEqual(focusCalls, []);

  timers.runAnimation(2);
  assert.deepEqual(focusCalls, ['focus:new']);

  clearOverlayFeedbackPromptFocusTimers(timers.App, state);
  assert.deepEqual(timers.cancelledAnimations, [1]);
  assert.deepEqual(timers.clearedTimeouts, [1, 2, 3, 4]);

  timers.runTimeout(3);
  timers.runTimeout(4);
  assert.deepEqual(focusCalls, ['focus:new']);
  assert.deepEqual(reports, []);
});
