import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearNotesEditorAsync,
  createNotesEditorAsyncState,
  scheduleNotesEditorAfterPaint,
  scheduleNotesEditorNextFrame,
} from '../esm/native/ui/react/notes/notes_overlay_editor_async.js';

type FrameEntry = { id: number; fn: () => void; canceled: boolean };
type TimeoutEntry = { id: number; fn: () => void; cleared: boolean };

function createAsyncApp() {
  let nextId = 1;
  const frames: FrameEntry[] = [];
  const timeouts: TimeoutEntry[] = [];
  const canceledFrames: number[] = [];
  const clearedTimeouts: Array<number | undefined> = [];

  const App: any = {
    deps: {
      browser: {
        requestAnimationFrame(fn: () => void) {
          const id = nextId++;
          frames.push({ id, fn, canceled: false });
          return id;
        },
        cancelAnimationFrame(id: number) {
          canceledFrames.push(id);
          const entry = frames.find(item => item.id === id);
          if (entry) entry.canceled = true;
        },
        setTimeout(fn: () => void) {
          const id = nextId++;
          timeouts.push({ id, fn, cleared: false });
          return id;
        },
        clearTimeout(id?: number) {
          clearedTimeouts.push(id);
          const entry = timeouts.find(item => item.id === id);
          if (entry) entry.cleared = true;
        },
      },
    },
  };

  return {
    App,
    frames,
    timeouts,
    canceledFrames,
    clearedTimeouts,
    runFrame(id: number) {
      const entry = frames.find(item => item.id === id);
      assert.ok(entry, `missing frame ${id}`);
      entry.fn();
    },
    runTimeout(id: number) {
      const entry = timeouts.find(item => item.id === id);
      assert.ok(entry, `missing timeout ${id}`);
      entry.fn();
    },
  };
}

test('notes editor async next-frame scheduling keeps one live job and suppresses stale callbacks', () => {
  const timers = createAsyncApp();
  const state = createNotesEditorAsyncState();
  const runs: string[] = [];

  scheduleNotesEditorNextFrame({
    App: timers.App,
    state,
    run: () => runs.push('first'),
    report: (op, err) => {
      throw new Error(`${op}:${String(err)}`);
    },
    op: 'notes:next:first',
  });

  assert.equal(timers.frames.length, 1);
  assert.equal(timers.timeouts.length, 1);

  scheduleNotesEditorNextFrame({
    App: timers.App,
    state,
    run: () => runs.push('second'),
    report: (op, err) => {
      throw new Error(`${op}:${String(err)}`);
    },
    op: 'notes:next:second',
  });

  assert.deepEqual(timers.canceledFrames, [2]);
  assert.deepEqual(timers.clearedTimeouts, [1]);

  timers.runFrame(2);
  timers.runTimeout(1);
  assert.deepEqual(runs, []);

  timers.runFrame(4);
  assert.deepEqual(runs, ['second']);

  timers.runTimeout(3);
  assert.deepEqual(runs, ['second']);
  assert.equal(state.firstFrameHandle, null);
  assert.equal(state.secondFrameHandle, null);
  assert.equal(state.fallbackHandle, null);
});

test('notes editor async after-paint fallback runs once and late second-frame callbacks stay stale', () => {
  const timers = createAsyncApp();
  const state = createNotesEditorAsyncState();
  const runs: string[] = [];

  scheduleNotesEditorAfterPaint({
    App: timers.App,
    state,
    run: () => runs.push('after-paint'),
    report: (op, err) => {
      throw new Error(`${op}:${String(err)}`);
    },
    op: 'notes:after-paint',
  });

  assert.equal(timers.frames.length, 1);
  assert.equal(timers.timeouts.length, 1);

  timers.runFrame(2);
  assert.equal(timers.frames.length, 2);

  timers.runTimeout(1);
  assert.deepEqual(runs, ['after-paint']);

  timers.runFrame(3);
  assert.deepEqual(runs, ['after-paint']);

  clearNotesEditorAsync(timers.App, state);
  assert.equal(state.firstFrameHandle, null);
  assert.equal(state.secondFrameHandle, null);
  assert.equal(state.fallbackHandle, null);
});
