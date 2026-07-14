import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectIoOrchestrator } from '../esm/native/io/project_io_orchestrator.ts';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../esm/shared/project_schema_constants.ts';
import { withSuppressedConsole } from './_console_silence.ts';

type ProjectIoTestApp = {
  actions: Record<string, unknown>;
  services: Record<string, unknown>;
  store: { getState: () => Record<string, unknown> };
};

function createProjectIoApp(overrides?: {
  commitProjectLoadSnapshot?:
    ((snapshot: Record<string, any>, meta?: Record<string, unknown>) => unknown) | null;
  patch?: ((patch: Record<string, unknown>, meta?: Record<string, unknown>) => unknown) | null;
  resetBaseline?: ((meta?: Record<string, unknown>) => unknown) | null;
  resetAllEditModes?: (() => void) | null;
  autosaveData?: string | null;
  flushAutosaveResult?: boolean;
  historyFaultAfterMutation?: boolean;
  showToastError?: Error;
  buildResult?: boolean;
  supersedeOnEditReset?: boolean;
  confirmOpen?:
    | ((title: unknown, message: unknown, onYes?: (() => void) | null, onNo?: (() => void) | null) => void)
    | null;
}) {
  const calls: string[] = [];
  const autosaveCalls: string[] = [];
  const editStateCalls: string[] = [];
  const events: string[] = [];
  const buildCalls: Array<{ uiOverride: unknown; meta?: Record<string, unknown> }> = [];
  const reports: Array<{ op: string; message: string }> = [];
  const runtimeFlags: Array<{ key: string; value: unknown }> = [];
  const toasts: Array<{ message: unknown; type: unknown }> = [];
  const historyState = {
    undoStack: ['before-undo'],
    redoStack: ['before-redo'],
    maxSteps: 30,
    lastSavedJSON: 'before-json' as string | null,
    isPaused: true,
    lastCoalesceKey: 'before-key',
    lastCoalesceAt: 42,
    didInit: true,
    isApplyingState: false,
  };
  const state: Record<string, any> = {
    ui: {
      width: 120,
      height: 240,
      depth: 60,
      doors: 4,
      activeTab: 'design',
      site2TabsGateOpen: true,
    },
    config: {},
    runtime: {},
    mode: {},
    meta: { dirty: true },
  };

  const actions: Record<string, unknown> = {
    config: {},
    meta: {},
    runtime: {
      setScalar(key: string, value: unknown) {
        runtimeFlags.push({ key, value });
      },
    },
  };

  if (overrides?.patch !== null) {
    actions.patch =
      overrides?.patch === undefined
        ? undefined
        : (patch: Record<string, unknown>, meta?: Record<string, unknown>) => {
            overrides.patch?.(patch, meta);
          };
  }

  if (overrides?.commitProjectLoadSnapshot !== null) {
    actions.commitProjectLoadSnapshot =
      overrides?.commitProjectLoadSnapshot === undefined
        ? (snapshot: Record<string, any>, meta?: Record<string, unknown>) => {
            const before = structuredClone(state);
            const source = String(meta?.source || '');
            calls.push(`transaction:${source}`);
            events.push(`transaction:${source}`);
            state.ui = structuredClone(snapshot.ui);
            state.config = { ...state.config, ...structuredClone(snapshot.config) };
            state.runtime = { ...state.runtime, ...structuredClone(snapshot.runtime) };
            state.meta = { ...state.meta, ...structuredClone(snapshot.meta) };
            runtimeFlags.push({ key: 'sketchMode', value: snapshot.runtime.sketchMode });
            runtimeFlags.push({ key: 'wardrobeTypeProfiles', value: snapshot.runtime.wardrobeTypeProfiles });
            return {
              rollback() {
                Object.assign(state, structuredClone(before));
              },
            };
          }
        : overrides.commitProjectLoadSnapshot;
  }

  const App: ProjectIoTestApp = {
    actions,
    services: {
      projectIO: { runtime: {} },
      autosave: {
        cancelPending() {
          autosaveCalls.push('cancel');
          return true;
        },
        flushPending() {
          autosaveCalls.push('flush');
          return overrides?.flushAutosaveResult !== false;
        },
        forceSaveNow() {
          autosaveCalls.push('force');
          return true;
        },
        suspend() {
          autosaveCalls.push('suspend');
          let active = true;
          return {
            commit() {
              if (!active) return;
              active = false;
              autosaveCalls.push('commit');
            },
            resume() {
              if (!active) return;
              active = false;
              autosaveCalls.push('resume');
            },
          };
        },
      },
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString(key: string) {
          return key === 'autosave-key'
            ? overrides?.autosaveData === undefined
              ? null
              : overrides.autosaveData
            : null;
        },
      },
      editState:
        overrides?.resetAllEditModes === null
          ? {}
          : {
              resetAllEditModes:
                overrides?.resetAllEditModes === undefined
                  ? () => {
                      editStateCalls.push('reset');
                      if (overrides?.supersedeOnEditReset) {
                        const runtime = (App.services.projectIO as any).runtime;
                        runtime.restoreGen = Number(runtime.restoreGen || 0) + 1;
                      }
                    }
                  : overrides.resetAllEditModes,
            },
      notes: {
        restoreFromSave() {},
      },
      history:
        overrides?.resetBaseline === null
          ? { system: {} }
          : {
              system: {
                resetBaseline:
                  overrides?.resetBaseline === undefined
                    ? (meta?: Record<string, unknown>) => {
                        historyState.undoStack = [];
                        historyState.redoStack = [];
                        historyState.lastSavedJSON = 'loaded-json';
                        historyState.isPaused = false;
                        historyState.lastCoalesceKey = '';
                        historyState.lastCoalesceAt = 0;
                        calls.push(`history:${String(meta?.source || '')}`);
                        events.push(`history:${String(meta?.source || '')}`);
                        if (overrides?.historyFaultAfterMutation) {
                          throw new Error('history finalize fault');
                        }
                      }
                    : overrides.resetBaseline,
                captureSnapshot() {
                  return structuredClone(historyState);
                },
                restoreSnapshot(snapshot: typeof historyState) {
                  Object.assign(historyState, structuredClone(snapshot));
                },
              },
            },
      builder: {
        requestBuild(uiOverride: unknown, meta?: Record<string, unknown>) {
          buildCalls.push({ uiOverride, meta });
          events.push(`build:${String(meta?.reason || meta?.source || '')}`);
          return overrides?.buildResult !== false;
        },
      },
      platform: {
        util: {
          log() {},
        },
        reportError() {},
        triggerRender() {},
      },
    },
    store: {
      getState() {
        return state;
      },
    },
  };

  const orchestrator = createProjectIoOrchestrator({
    App: App as never,
    showToast(message, type) {
      if (overrides?.showToastError) throw overrides.showToastError;
      toasts.push({ message, type });
    },
    openCustomConfirm(title, message, onYes, onNo) {
      if (overrides?.confirmOpen) {
        overrides.confirmOpen(title, message, onYes as any, onNo as any);
        return;
      }
      if (typeof onYes === 'function') onYes();
    },
    userAgent: 'node:test',
    schemaId: 'schema:test',
    schemaVersion: 1,
    reportNonFatal(op, err) {
      reports.push({ op, message: err instanceof Error ? err.message : String(err) });
    },
  });

  (App.services.projectIO as Record<string, unknown>).loadProjectData = orchestrator.loadProjectData;
  (App.services.projectIO as Record<string, unknown>).restoreLastSession = orchestrator.restoreLastSession;

  return {
    App,
    state,
    calls,
    autosaveCalls,
    editStateCalls,
    events,
    buildCalls,
    reports,
    runtimeFlags,
    toasts,
    historyState,
    orchestrator,
  };
}

const VALID_PROJECT = {
  __schema: PROJECT_SCHEMA_ID,
  __version: PROJECT_SCHEMA_VERSION,
  settings: {
    width: 120,
    height: 240,
    depth: 60,
    doors: 4,
    wardrobeType: 'hinged',
  },
  toggles: {},
};

test('project io fail-fast: full project loads require the atomic state transaction seam', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, calls, autosaveCalls, runtimeFlags } = createProjectIoApp({
      commitProjectLoadSnapshot: null,
    });

    const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'error');
    assert.match(
      String(result.message || ''),
      /project\.load requires canonical actions\.commitProjectLoadSnapshot/i
    );
    assert.deepEqual(calls, []);
    assert.deepEqual(autosaveCalls, []);
    assert.deepEqual(runtimeFlags, []);
  });
});

test('project io fail-fast: a rejected atomic commit does not run finalize work', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, calls, autosaveCalls, editStateCalls } = createProjectIoApp({
      commitProjectLoadSnapshot() {
        throw new Error('atomic project commit rejected');
      },
    });

    const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'error');
    assert.match(String(result.message || ''), /atomic project commit rejected/i);
    assert.deepEqual(calls, []);
    assert.deepEqual(autosaveCalls, ['suspend', 'resume']);
    assert.deepEqual(editStateCalls, []);
  });
});

test('project io fail-fast: full project loads require canonical history baseline reset, but history replay does not', () => {
  return withSuppressedConsole(async () => {
    const missingHistory = createProjectIoApp({ resetBaseline: null });

    const fullLoad = missingHistory.orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });
    assert.equal(fullLoad.ok, false);
    assert.equal(fullLoad.reason, 'error');
    assert.match(
      String(fullLoad.message || ''),
      /project\.load history baseline|canonical history system|resetBaseline/i
    );
    assert.deepEqual(missingHistory.autosaveCalls, []);

    const historyApply = missingHistory.orchestrator.loadProjectData(VALID_PROJECT as never, {
      toast: false,
      meta: { source: 'history.undoRedo' },
    });
    assert.deepEqual(historyApply, { ok: true, restoreGen: 1 });
    assert.deepEqual(missingHistory.autosaveCalls, ['suspend', 'commit']);
  });
});

test('project io restoreLastSession preserves precise restore failure toasts through the shared load-result seam', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, toasts } = createProjectIoApp({
      autosaveData: JSON.stringify(VALID_PROJECT),
      commitProjectLoadSnapshot: () => {
        throw new Error('restore snapshot apply exploded');
      },
    });

    const pending = orchestrator.restoreLastSession();
    assert.deepEqual(pending, { ok: true, pending: true });
    assert.deepEqual(toasts, [{ message: 'restore snapshot apply exploded', type: 'error' }]);
  });
});

test('project io restoreLastSession reports invalid autosave payloads as immediate invalid results', () => {
  const { orchestrator, toasts } = createProjectIoApp({ autosaveData: '{bad-json' });

  const result = orchestrator.restoreLastSession();
  assert.deepEqual(result, { ok: false, reason: 'invalid' });
  assert.deepEqual(toasts, [{ message: 'נתוני השחזור לא תקינים', type: 'error' }]);
});

test('project io restoreLastSession strips legacy autosave version metadata before load validation', () => {
  const legacyAutosave = {
    ...VALID_PROJECT,
    version: '2.1',
    timestamp: 123,
    dateString: '18:00',
  };
  const { orchestrator, toasts, calls, autosaveCalls } = createProjectIoApp({
    autosaveData: JSON.stringify(legacyAutosave),
  });

  const result = orchestrator.restoreLastSession();

  assert.deepEqual(result, { ok: true, pending: true });
  assert.deepEqual(toasts, [{ message: 'העריכה שוחזרה בהצלחה!', type: 'success' }]);
  assert.deepEqual(autosaveCalls, ['suspend', 'commit', 'force']);
  assert.deepEqual(calls, ['transaction:project.load', 'history:project.load']);
});

test('project io reset-default loads preserve last-session autosave instead of overwriting it', () => {
  const { orchestrator, autosaveCalls, calls } = createProjectIoApp();

  const result = orchestrator.loadProjectData(VALID_PROJECT as never, {
    toast: false,
    meta: { source: 'react:header:resetDefault', preserveAutosave: true },
  });

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(autosaveCalls, ['suspend', 'commit']);
  assert.deepEqual(calls, ['transaction:project.load', 'history:project.load']);
});

test('project io reset-default commits its autosave suspension without flushing preserved data', () => {
  const { orchestrator, autosaveCalls } = createProjectIoApp({ flushAutosaveResult: false });

  const result = orchestrator.loadProjectData(VALID_PROJECT as never, {
    toast: false,
    meta: { source: 'react:header:resetDefault', preserveAutosave: true },
  });

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(autosaveCalls, ['suspend', 'commit']);
});

test('project io handleFileLoad now delegates through canonical project file ingress and preserves final success semantics', async () => {
  const file = new Blob([JSON.stringify(VALID_PROJECT)], { type: 'application/json' }) as Blob & {
    name: string;
  };
  file.name = 'project.json';
  const { orchestrator, toasts, calls, autosaveCalls } = createProjectIoApp();

  const result = await orchestrator.handleFileLoad(file as never);

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(toasts, [{ message: 'הפרויקט נטען בהצלחה!', type: 'success' }]);
  assert.deepEqual(calls, ['transaction:project.load', 'history:project.load']);
  assert.deepEqual(autosaveCalls, ['suspend', 'commit', 'force']);
});

test('project io load clears active edit modes so transient authoring state does not leak across project roundtrips', () => {
  const { orchestrator, editStateCalls } = createProjectIoApp();

  const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(editStateCalls, ['reset']);
});

test('project io load restores state after a history-baseline fault following commit', () => {
  return withSuppressedConsole(async () => {
    const harness = createProjectIoApp({ historyFaultAfterMutation: true });
    const before = structuredClone(harness.state);
    const historyBefore = structuredClone(harness.historyState);

    const result = harness.orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

    assert.equal(result.ok, false);
    assert.match(String(result.message || ''), /history finalize fault/);
    assert.deepEqual(harness.state, before);
    assert.deepEqual(harness.historyState, historyBefore);
    assert.deepEqual(harness.autosaveCalls, ['suspend', 'resume']);
    assert.deepEqual(harness.buildCalls, []);
  });
});

test('project io load never rolls back a committed project when the success toast throws', () => {
  const harness = createProjectIoApp({ showToastError: new Error('toast exploded') });

  const result = harness.orchestrator.loadProjectData(VALID_PROJECT as never);

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.equal(harness.state.meta.dirty, false);
  assert.deepEqual(harness.historyState.undoStack, []);
  assert.equal(
    harness.reports.some(
      report => report.op === 'project.load.successToast' && /toast exploded/.test(report.message)
    ),
    true
  );
});

test('project io load reports an unaccepted rebuild as committed success with a typed warning', () => {
  const harness = createProjectIoApp({ buildResult: false });

  const result = harness.orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.warnings : undefined, [
    {
      effect: 'build',
      message: 'Project loaded, but the required rebuild was not accepted.',
    },
  ]);
  assert.equal(harness.state.meta.dirty, false);
});

test('project io load stops post-commit effects as soon as a reentrant load supersedes it', () => {
  const harness = createProjectIoApp({ supersedeOnEditReset: true });

  const result = harness.orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

  assert.deepEqual(result, { ok: false, reason: 'superseded', restoreGen: 1 });
  assert.deepEqual(harness.buildCalls, []);
});

test('project io load syncs persisted sketch mode into the runtime SSOT', () => {
  const { orchestrator, runtimeFlags } = createProjectIoApp();

  const result = orchestrator.loadProjectData(
    {
      ...VALID_PROJECT,
      toggles: { sketchMode: true },
    } as never,
    { toast: false }
  );

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.equal(
    runtimeFlags.some(flag => flag.key === 'sketchMode' && flag.value === true),
    true
  );
});

test('project io load clears wardrobe-type profile cache in fallback runtime writes', () => {
  const { orchestrator, runtimeFlags } = createProjectIoApp();

  const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.equal(
    runtimeFlags.some(flag => flag.key === 'wardrobeTypeProfiles' && flag.value === null),
    true
  );
});

test('project io load emits exactly one final builder request after a valid load and none for invalid input', () => {
  const valid = createProjectIoApp();

  const result = valid.orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(valid.events, ['transaction:project.load', 'history:project.load', 'build:project.load']);
  assert.equal(valid.buildCalls.length, 1);
  assert.deepEqual(valid.buildCalls[0], {
    uiOverride: null,
    meta: {
      reason: 'project.load',
      immediate: true,
      force: true,
    },
  });

  const invalid = createProjectIoApp();
  const invalidResult = invalid.orchestrator.loadProjectData(
    { settings: { wardrobeType: 'hinged' } } as never,
    { toast: false }
  );

  assert.deepEqual(invalidResult, { ok: false, reason: 'invalid' });
  assert.deepEqual(invalid.events, []);
  assert.deepEqual(invalid.buildCalls, []);
});

test('project io load uses explicit snapshot APIs even when a root patch surface exists', () => {
  const rootPatches: Array<{ patch: Record<string, unknown>; meta?: Record<string, unknown> }> = [];
  const { orchestrator, calls, autosaveCalls, runtimeFlags } = createProjectIoApp({
    patch(patch, meta) {
      rootPatches.push({ patch, meta });
    },
  });

  const result = orchestrator.loadProjectData(
    {
      ...VALID_PROJECT,
      toggles: { sketchMode: true },
      orderPdfEditorDraft: { id: 'draft-1' },
      orderPdfEditorZoom: 1.25,
    } as never,
    { toast: false }
  );

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.equal(rootPatches.length, 0);
  assert.deepEqual(calls, ['transaction:project.load', 'history:project.load']);
  assert.deepEqual(autosaveCalls, ['suspend', 'commit', 'force']);
  assert.deepEqual(runtimeFlags, [
    { key: 'sketchMode', value: true },
    { key: 'wardrobeTypeProfiles', value: null },
  ]);
});

test('project io handleFileLoad now preserves canonical file-read/load errors instead of hiding behind pending legacy results', async () => {
  await withSuppressedConsole(async () => {
    const file = new Blob([JSON.stringify(VALID_PROJECT)], { type: 'application/json' }) as Blob & {
      name: string;
    };
    file.name = 'project.json';
    const { orchestrator, toasts } = createProjectIoApp({
      commitProjectLoadSnapshot: () => {
        throw new Error('file snapshot apply exploded');
      },
    });

    const result = await orchestrator.handleFileLoad(file as never);

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'error');
    assert.equal(result.message, 'file snapshot apply exploded');
    assert.deepEqual(toasts, [{ message: 'file snapshot apply exploded', type: 'error' }]);
  });
});

test('project io fail-fast: partial project payloads fail closed before mutating app state or history', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, calls, autosaveCalls, toasts } = createProjectIoApp();

    const result = orchestrator.loadProjectData({ settings: { wardrobeType: 'hinged' } } as never, {
      toast: true,
    });

    assert.deepEqual(result, { ok: false, reason: 'invalid' });
    assert.deepEqual(calls, []);
    assert.deepEqual(autosaveCalls, []);
    assert.deepEqual(toasts, [{ message: 'קובץ לא תקין', type: 'error' }]);
  });
});

test('project io load rejects numeric-string dimensions before mutating state', () => {
  const { orchestrator, calls, autosaveCalls } = createProjectIoApp();

  const result = orchestrator.loadProjectData(
    {
      __schema: PROJECT_SCHEMA_ID,
      __version: PROJECT_SCHEMA_VERSION,
      settings: {
        width: '160',
        height: '240',
        depth: '55',
        doors: '4',
        wardrobeType: 'hinged',
      },
      toggles: {},
    } as never,
    { toast: false }
  );

  assert.deepEqual(result, { ok: false, reason: 'invalid' });
  assert.deepEqual(autosaveCalls, []);
  assert.deepEqual(calls, []);
});
