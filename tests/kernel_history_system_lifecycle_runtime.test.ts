import test from 'node:test';
import assert from 'node:assert/strict';

import { createKernelHistorySystem } from '../esm/native/kernel/kernel_history_system.ts';

type AnyRecord = Record<string, any>;

type TimerQueue = Map<number, () => void>;

function createHarness() {
  const queued: TimerQueue = new Map();
  const reports: Array<{ op: string; msg: string }> = [];
  let nextTimerId = 1;
  let restoring = true;
  let snapshot = { runtime: {}, ui: {} } as AnyRecord;
  let currentUiSnapshot = {} as AnyRecord;
  let resumeCount = 0;
  let updateButtonsCount = 0;
  let ensureBaselineCount = 0;
  let loadCount = 0;
  let lastLoadedState: AnyRecord | null = null;
  let timerCalls = 0;

  const setTimeoutImpl = (handler: () => void) => {
    const id = nextTimerId++;
    timerCalls += 1;
    queued.set(id, handler);
    return id;
  };

  const system = createKernelHistorySystem({
    App: {} as never,
    existing: {},
    asRecord(value: unknown, fallback: AnyRecord = {}) {
      return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : fallback;
    },
    isRecord(value: unknown): value is AnyRecord {
      return !!value && typeof value === 'object' && !Array.isArray(value);
    },
    isRestoring: () => restoring,
    getTimers: () => ({ setTimeout: setTimeoutImpl }),
    getProjectUndoSnapshot: () => snapshot,
    captureSavedNotes: () => null,
    getCurrentUiSnapshot: () => currentUiSnapshot,
    loadProjectSnapshot(next: AnyRecord) {
      loadCount += 1;
      snapshot = next;
      lastLoadedState = next;
    },
    flushPendingPushViaAccess: () => false,
    schedulePushViaAccess: () => undefined,
    reportNonFatal(op: string, error: unknown) {
      reports.push({ op, msg: error instanceof Error ? error.message : String(error) });
    },
  });

  const resumeBase = system.resume.bind(system);
  system.resume = () => {
    resumeCount += 1;
    resumeBase();
  };

  const updateButtonsBase = system.updateButtons.bind(system);
  system.updateButtons = meta => {
    updateButtonsCount += 1;
    updateButtonsBase(meta);
  };

  const ensureBaselineBase = system.ensureBaseline.bind(system);
  system.ensureBaseline = () => {
    ensureBaselineCount += 1;
    ensureBaselineBase();
  };

  const flushOne = () => {
    const first = queued.keys().next();
    if (first.done) return false;
    const id = first.value;
    const fn = queued.get(id) || null;
    queued.delete(id);
    fn?.();
    return true;
  };

  return {
    system,
    reports,
    setSnapshot(next: AnyRecord) {
      snapshot = next;
    },
    setCurrentUiSnapshot(next: AnyRecord) {
      currentUiSnapshot = next;
    },
    setRestoring(value: boolean) {
      restoring = value;
    },
    flushOne,
    flushAll(max = 20) {
      let steps = 0;
      while (steps < max && flushOne()) steps += 1;
      return steps;
    },
    get queueSize() {
      return queued.size;
    },
    get timerCalls() {
      return timerCalls;
    },
    get resumeCount() {
      return resumeCount;
    },
    get updateButtonsCount() {
      return updateButtonsCount;
    },
    get ensureBaselineCount() {
      return ensureBaselineCount;
    },
    get loadCount() {
      return loadCount;
    },
    get lastLoadedState() {
      return lastLoadedState;
    },
  };
}

test('kernel history lifecycle: resumeAfterRestore keeps only the latest pending wait loop active', () => {
  const h = createHarness();

  h.system.resumeAfterRestore(800);
  assert.equal(h.queueSize, 1);
  assert.equal(h.timerCalls, 1);

  h.system.resumeAfterRestore(800);
  assert.equal(h.queueSize, 2);
  assert.equal(h.timerCalls, 2);

  h.flushOne();
  assert.equal(h.queueSize, 1);
  assert.equal(h.resumeCount, 0);
  assert.equal(h.updateButtonsCount, 0);

  h.flushOne();
  assert.equal(h.queueSize, 1);
  assert.equal(h.resumeCount, 0);
  assert.equal(h.updateButtonsCount, 0);

  h.setRestoring(false);
  h.flushAll();
  assert.equal(h.resumeCount, 1);
  assert.equal(h.updateButtonsCount, 1);
  assert.equal(h.queueSize, 0);
  assert.deepEqual(h.reports, []);
});

test('kernel history lifecycle: owner snapshot restores stacks, coalescing, pause, and derived status', () => {
  const { system } = createHarness();
  system.undoStack = ['undo-before'];
  system.redoStack = ['redo-before'];
  system.lastSavedJSON = 'saved-before';
  system.isPaused = true;
  system._lastCoalesceKey = 'notes:n1';
  system._lastCoalesceAt = 77;
  system.__isApplyingState = true;
  const before = system.captureSnapshot();

  system.resetBaseline({ source: 'test:baseline' });
  system.__isApplyingState = false;
  system.restoreSnapshot(before, { source: 'test:rollback' });

  assert.deepEqual(system.captureSnapshot(), before);
  assert.deepEqual(system.getStatus(), {
    canUndo: true,
    canRedo: true,
    undoCount: 1,
    redoCount: 1,
    isPaused: true,
  });
});

test('kernel history lifecycle: applyState uses the same latest-token restore resume path', () => {
  const h = createHarness();

  h.system.applyState(JSON.stringify({ runtime: { restoring: true }, ui: {} }));
  h.system.applyState(JSON.stringify({ runtime: { restoring: true, v: 2 }, ui: {} }));

  assert.equal(h.loadCount, 2);
  assert.equal(h.queueSize, 2);

  h.flushOne();
  assert.equal(h.queueSize, 1);
  assert.equal(h.resumeCount, 0);

  h.setRestoring(false);
  h.flushAll();
  assert.equal(h.resumeCount, 1);
  assert.equal(h.updateButtonsCount, 1);
  assert.deepEqual(h.reports, []);
});

test('kernel history lifecycle: init keeps retrying through the injected timer seam until restore finishes', () => {
  const h = createHarness();

  h.system.init();
  assert.equal(h.ensureBaselineCount, 0);
  assert.equal(h.queueSize, 1);
  assert.equal(h.timerCalls, 1);

  h.flushOne();
  assert.equal(h.ensureBaselineCount, 0);
  assert.equal(h.queueSize, 1);
  assert.equal(h.timerCalls, 2);

  h.setRestoring(false);
  h.flushAll();
  assert.equal(h.ensureBaselineCount, 1);
  assert.equal(h.queueSize, 0);
  assert.deepEqual(h.reports, []);
});

test('kernel history lifecycle: semantically identical snapshots with different key order do not push duplicate undo states', () => {
  const h = createHarness();

  h.setRestoring(false);

  const firstSnapshot = {
    runtime: {
      modules: {
        alpha: { width: 10, depth: 20 },
        beta: { enabled: true, mode: 'shelf' },
      },
    },
    ui: {},
  };
  const reorderedSnapshot = {
    runtime: {
      modules: {
        beta: { mode: 'shelf', enabled: true },
        alpha: { depth: 20, width: 10 },
      },
    },
    ui: {},
  };

  h.setSnapshot(firstSnapshot);

  h.system.init();
  assert.equal(h.system.undoStack.length, 0);

  h.system.pushState();
  assert.equal(h.system.undoStack.length, 0);

  h.setSnapshot(reorderedSnapshot);

  h.system.pushState();
  assert.equal(h.system.undoStack.length, 0);
  assert.equal(h.system.redoStack.length, 0);
  assert.deepEqual(h.reports, []);
});

test('kernel history lifecycle: applyState preserves a detached sanitized orderPdfEditorDraft from the live UI snapshot', () => {
  const h = createHarness();

  const toxicDraft: AnyRecord = {
    pages: [{ id: 'p1', html: '<p>hello</p>' }],
    meta: {
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      keep: { accent: 'oak' },
      badBigInt: BigInt(7),
    },
    badCycle: {},
  };
  toxicDraft.badCycle.self = toxicDraft.badCycle;

  h.setCurrentUiSnapshot({
    orderPdfEditorDraft: toxicDraft,
    orderPdfEditorZoom: 1.5,
  });

  h.system.applyState(JSON.stringify({ runtime: { restoring: true }, ui: {} }));

  assert.equal(h.loadCount, 1);
  assert.ok(h.lastLoadedState);
  assert.notEqual(h.lastLoadedState?.orderPdfEditorDraft, toxicDraft);
  assert.deepEqual(h.lastLoadedState?.orderPdfEditorDraft, {
    pages: [{ id: 'p1', html: '<p>hello</p>' }],
    meta: {
      createdAt: '2026-01-02T03:04:05.000Z',
      keep: { accent: 'oak' },
    },
    badCycle: {},
  });
  assert.equal((h.lastLoadedState?.orderPdfEditorDraft as AnyRecord)?.meta?.badBigInt, undefined);
  assert.equal(h.lastLoadedState?.orderPdfEditorZoom, 1.5);

  toxicDraft.meta.keep.accent = 'walnut';
  assert.equal((h.lastLoadedState?.orderPdfEditorDraft as AnyRecord)?.meta?.keep?.accent, 'oak');
  assert.deepEqual(h.reports, []);
});

test('kernel history lifecycle: undo/redo reset coalesce boundaries so later same-key edits stay undoable', () => {
  const h = createHarness();
  h.setRestoring(false);

  h.setSnapshot({ runtime: { version: 0 }, ui: {} });
  h.system.init();

  h.setSnapshot({ runtime: { version: 1 }, ui: {} });
  h.system.pushState({ coalesceKey: 'notes:id:n1', coalesceMs: 1200 });
  assert.equal(h.system.undoStack.length, 1);
  assert.equal(h.system._lastCoalesceKey, 'notes:id:n1');

  h.system.undo();
  assert.equal(h.system.undoStack.length, 0);
  assert.equal(h.system.redoStack.length, 1);
  assert.equal(h.system._lastCoalesceKey, '');
  assert.equal(h.system._lastCoalesceAt, 0);

  h.setSnapshot({ runtime: { version: 2 }, ui: {} });
  h.system.pushState({ coalesceKey: 'notes:id:n1', coalesceMs: 1200 });
  assert.equal(h.system.undoStack.length, 1);
  assert.equal(h.system.redoStack.length, 0);
});

test('kernel history lifecycle: coalesceAcrossIdle keeps create plus first note text as one undo step', () => {
  const h = createHarness();
  h.setRestoring(false);

  const realNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    h.setSnapshot({ savedNotes: [], runtime: {}, ui: {} });
    h.system.init();

    h.setSnapshot({
      savedNotes: [{ id: 'n1', text: '', style: { left: '0px', top: '0px' } }],
      runtime: {},
      ui: {},
    });
    h.system.pushState({ coalesceKey: 'notes:id:n1', coalesceMs: 1200 });
    assert.equal(h.system.undoStack.length, 1);

    now += 60_000;
    h.setSnapshot({
      savedNotes: [{ id: 'n1', text: '<p>first text</p>', style: { left: '0px', top: '0px' } }],
      runtime: {},
      ui: {},
    });
    h.system.pushState({ coalesceKey: 'notes:id:n1', coalesceMs: 1200, coalesceAcrossIdle: true });

    assert.equal(h.system.undoStack.length, 1);
    h.system.undo();
    assert.deepEqual(h.lastLoadedState?.savedNotes, []);
    assert.equal(h.system.redoStack.length, 1);

    h.system.redo();
    assert.deepEqual(h.lastLoadedState?.savedNotes, [
      { id: 'n1', text: '<p>first text</p>', style: { left: '0px', top: '0px' } },
    ]);
  } finally {
    Date.now = realNow;
  }
});

test('kernel history lifecycle: no-op duplicate stack entries are pruned before undo/redo navigation', () => {
  const h = createHarness();
  h.setRestoring(false);

  h.setSnapshot({ savedNotes: [], runtime: {}, ui: {} });
  h.system.init();

  const baseline = h.system.lastSavedJSON;
  assert.ok(baseline);
  h.system.undoStack.push(baseline);

  h.system.undo();
  assert.equal(h.system.undoStack.length, 0);
  assert.equal(h.system.redoStack.length, 0);
  assert.equal(h.loadCount, 0);
});
