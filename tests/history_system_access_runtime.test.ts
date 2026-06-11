import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getHistorySystemMaybe,
  getHistoryServiceMaybe,
  hasHistoryServiceMethodMaybe,
  callHistoryServiceMethodMaybe,
  flushHistoryPendingPushMaybe,
  scheduleHistoryPushMaybe,
  flushOrPushHistoryStateMaybe,
  getHistoryStatusMaybe,
  subscribeHistoryStatusMaybe,
  runHistoryUndoMaybe,
  runHistoryRedoMaybe,
  resetHistoryBaselineRequiredOrThrow,
} from '../esm/native/runtime/history_system_access.ts';

test('history system access runtime: prefers canonical actions.history.getSystem over services.history.system', () => {
  const svcSystem = { id: 'service' };
  const actionSystem = { id: 'action' };
  const App: any = {
    actions: {
      history: {
        getSystem: () => actionSystem,
      },
    },
    services: {
      history: {
        system: svcSystem,
      },
    },
  };

  assert.equal(getHistorySystemMaybe(App), actionSystem);
});

test('history system access runtime: exposes canonical history service method probing in one place', () => {
  const calls: string[] = [];
  const historyService = {
    system: { id: 'service-system' },
    schedulePush(meta?: unknown) {
      calls.push(`schedule:${String((meta as any)?.source || '')}`);
      return true;
    },
  };
  const App: any = { services: { history: historyService } };

  assert.equal(getHistoryServiceMaybe(App), historyService);
  assert.equal(hasHistoryServiceMethodMaybe(App, 'schedulePush'), true);
  assert.equal(hasHistoryServiceMethodMaybe(App, 'flushPendingPush'), false);
  assert.equal(callHistoryServiceMethodMaybe(App, 'schedulePush', { source: 'runtime:test' }), true);
  assert.deepEqual(calls, ['schedule:runtime:test']);
});

test('history system access runtime: schedule/flush route through canonical actions history seam', () => {
  const calls: string[] = [];
  const App: any = {
    actions: {
      history: {
        schedulePush: () => {
          calls.push('schedule');
          return true;
        },
        flushPendingPush: () => {
          calls.push('flush');
          return true;
        },
        flushOrPush: () => {
          calls.push('flushOrPush');
          return true;
        },
      },
    },
  };

  assert.equal(scheduleHistoryPushMaybe(App), true);
  assert.equal(flushHistoryPendingPushMaybe(App), true);
  assert.equal(flushOrPushHistoryStateMaybe(App), true);
  assert.deepEqual(calls, ['schedule', 'flush', 'flushOrPush']);
});

test('history system access runtime: status subscription and undo/redo route through the canonical history system', () => {
  const calls: string[] = [];
  let listener: ((status: unknown, meta?: unknown) => void) | null = null;
  const App: any = {
    services: {
      history: {
        system: {
          getStatus() {
            return { canUndo: true, canRedo: false, undoCount: 2, redoCount: 0, isPaused: false };
          },
          subscribeStatus(cb: (status: unknown, meta?: unknown) => void) {
            listener = cb;
            return () => {
              listener = null;
            };
          },
          undo() {
            calls.push('undo');
          },
          redo() {
            calls.push('redo');
          },
        },
      },
    },
  };

  assert.deepEqual(getHistoryStatusMaybe(App), {
    canUndo: true,
    canRedo: false,
    undoCount: 2,
    redoCount: 0,
    isPaused: false,
  });
  const received: any[] = [];
  const unsubscribe = subscribeHistoryStatusMaybe(App, status => {
    received.push(status);
  });
  listener?.({ canUndo: false, canRedo: true, undoCount: 0, redoCount: 1, isPaused: false });
  unsubscribe();

  assert.deepEqual(received, [
    { canUndo: false, canRedo: true, undoCount: 0, redoCount: 1, isPaused: false },
  ]);
  assert.equal(runHistoryUndoMaybe(App), true);
  assert.equal(runHistoryRedoMaybe(App), true);
  assert.deepEqual(calls, ['undo', 'redo']);
});

test('history system access runtime: strict baseline reset helper preserves the real failure reason', () => {
  const AppMissing: any = { services: { history: { system: {} } } };
  assert.throws(
    () =>
      resetHistoryBaselineRequiredOrThrow(AppMissing, { source: 'strict:test' }, 'history baseline strict'),
    /history baseline strict|resetBaseline/i
  );

  const AppExplode: any = {
    services: {
      history: {
        system: {
          resetBaseline() {
            throw new Error('history baseline exploded');
          },
        },
      },
    },
  };

  assert.throws(
    () =>
      resetHistoryBaselineRequiredOrThrow(AppExplode, { source: 'strict:test' }, 'history baseline strict'),
    /history baseline exploded/
  );
});

test('history system access runtime: fallback onStatusChange subscriptions unlink cleanly without dropping later listeners', () => {
  const events: string[] = [];
  const originalStatuses: any[] = [];
  let currentStatus = { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0, isPaused: false };
  const original = (status: unknown) => {
    originalStatuses.push(status);
    events.push(`original:${String((status as any)?.undoCount ?? '')}`);
  };
  const App: any = {
    services: {
      history: {
        system: {
          onStatusChange: original,
          getStatus() {
            return currentStatus;
          },
        },
      },
    },
  };

  const unsubscribeFirst = subscribeHistoryStatusMaybe(App, status => {
    events.push(`first:${status.undoCount}`);
  });
  const unsubscribeSecond = subscribeHistoryStatusMaybe(App, status => {
    events.push(`second:${status.undoCount}`);
  });

  App.services.history.system.onStatusChange?.({
    undoCount: 2,
    redoCount: 0,
    canUndo: false,
    canRedo: false,
  });
  assert.deepEqual(events, ['second:2', 'first:2', 'original:2']);

  unsubscribeFirst();
  events.length = 0;
  App.services.history.system.onStatusChange?.({
    undoCount: 3,
    redoCount: 0,
    canUndo: false,
    canRedo: false,
  });
  assert.deepEqual(events, ['second:3', 'original:3']);

  unsubscribeSecond();
  events.length = 0;
  currentStatus = { undoCount: 4, redoCount: 0, canUndo: false, canRedo: false, isPaused: false };
  App.services.history.system.onStatusChange?.(currentStatus);
  assert.deepEqual(events, ['original:4']);
  assert.equal(App.services.history.system.onStatusChange, original);
  assert.equal(originalStatuses[0]?.canUndo, true);
  assert.equal(originalStatuses[1]?.canUndo, true);
  assert.equal(originalStatuses[2], currentStatus);
});
