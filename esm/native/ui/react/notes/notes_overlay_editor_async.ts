import type { MutableRefObject } from 'react';

import { getBrowserTimers } from '../../../services/api.js';

export type NotesEditorAnimationHandle = ReturnType<
  ReturnType<typeof getBrowserTimers>['requestAnimationFrame']
>;
export type NotesEditorTimeoutHandle = ReturnType<ReturnType<typeof getBrowserTimers>['setTimeout']>;

export type NotesEditorAsyncState = {
  token: number;
  firstFrameHandle: NotesEditorAnimationHandle | null;
  secondFrameHandle: NotesEditorAnimationHandle | null;
  fallbackHandle: NotesEditorTimeoutHandle | null;
};

export type NotesEditorAsyncStateRef = MutableRefObject<NotesEditorAsyncState>;

export function createNotesEditorAsyncState(): NotesEditorAsyncState {
  return {
    token: 0,
    firstFrameHandle: null,
    secondFrameHandle: null,
    fallbackHandle: null,
  };
}

function clearTimeoutHandle(App: unknown, handle: NotesEditorTimeoutHandle | null | undefined): void {
  if (handle == null) return;
  try {
    getBrowserTimers(App).clearTimeout(handle);
  } catch {
    // ignore
  }
}

function cancelAnimationHandle(App: unknown, handle: NotesEditorAnimationHandle | null | undefined): void {
  if (handle == null) return;
  try {
    getBrowserTimers(App).cancelAnimationFrame(handle);
  } catch {
    // ignore
  }
}

export function clearNotesEditorAsync(App: unknown, state: NotesEditorAsyncState): void {
  state.token += 1;
  cancelAnimationHandle(App, state.firstFrameHandle);
  cancelAnimationHandle(App, state.secondFrameHandle);
  clearTimeoutHandle(App, state.fallbackHandle);
  state.firstFrameHandle = null;
  state.secondFrameHandle = null;
  state.fallbackHandle = null;
}

function completeNotesEditorAsyncRun(state: NotesEditorAsyncState): void {
  state.firstFrameHandle = null;
  state.secondFrameHandle = null;
  state.fallbackHandle = null;
}

function scheduleNotesEditorAsync(args: {
  App: unknown;
  state: NotesEditorAsyncState;
  run: () => void;
  report: (op: string, err: unknown) => void;
  op: string;
  frames: 1 | 2;
  fallbackDelayMs: number;
}): void {
  const { App, state, run, report, op, frames, fallbackDelayMs } = args;

  clearNotesEditorAsync(App, state);

  const token = state.token;
  const timers = getBrowserTimers(App);

  const runOnce = () => {
    if (state.token !== token) return;
    completeNotesEditorAsyncRun(state);
    try {
      run();
    } catch (err) {
      report(op, err);
    }
  };

  const fallbackHandle = timers.setTimeout(() => {
    if (state.token !== token || state.fallbackHandle !== fallbackHandle) return;
    runOnce();
  }, fallbackDelayMs);
  state.fallbackHandle = fallbackHandle;

  if (frames === 1) {
    const firstFrameHandle = timers.requestAnimationFrame(() => {
      if (state.token !== token || state.firstFrameHandle !== firstFrameHandle) return;
      runOnce();
    });
    state.firstFrameHandle = firstFrameHandle;
    return;
  }

  const firstFrameHandle = timers.requestAnimationFrame(() => {
    if (state.token !== token || state.firstFrameHandle !== firstFrameHandle) return;
    state.firstFrameHandle = null;

    const secondFrameHandle = timers.requestAnimationFrame(() => {
      if (state.token !== token || state.secondFrameHandle !== secondFrameHandle) return;
      runOnce();
    });

    state.secondFrameHandle = secondFrameHandle;
  });

  state.firstFrameHandle = firstFrameHandle;
}

export function scheduleNotesEditorNextFrame(args: {
  App: unknown;
  state: NotesEditorAsyncState;
  run: () => void;
  report: (op: string, err: unknown) => void;
  op: string;
  fallbackDelayMs?: number;
}): void {
  scheduleNotesEditorAsync({
    ...args,
    frames: 1,
    fallbackDelayMs: args.fallbackDelayMs ?? 48,
  });
}

export function scheduleNotesEditorAfterPaint(args: {
  App: unknown;
  state: NotesEditorAsyncState;
  run: () => void;
  report: (op: string, err: unknown) => void;
  op: string;
  fallbackDelayMs?: number;
}): void {
  scheduleNotesEditorAsync({
    ...args,
    frames: 2,
    fallbackDelayMs: args.fallbackDelayMs ?? 72,
  });
}
