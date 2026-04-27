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
