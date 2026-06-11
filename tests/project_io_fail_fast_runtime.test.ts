import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectIoOrchestrator } from '../esm/native/io/project_io_orchestrator.ts';
import { withSuppressedConsole } from './_console_silence.ts';

type ProjectIoTestApp = {
  actions: Record<string, unknown>;
  services: Record<string, unknown>;
  store: { getState: () => Record<string, unknown> };
};

function createProjectIoApp(overrides?: {
  applyProjectSnapshot?:
    | ((snapshot: Record<string, unknown>, meta?: Record<string, unknown>) => unknown)
    | null;
  patch?: ((patch: Record<string, unknown>, meta?: Record<string, unknown>) => unknown) | null;
  commitUiSnapshot?: ((snapshot: Record<string, unknown>, meta?: Record<string, unknown>) => unknown) | null;
  setDirty?: ((next: boolean, meta?: Record<string, unknown>) => unknown) | null;
  resetBaseline?: ((meta?: Record<string, unknown>) => unknown) | null;
  resetAllEditModes?: (() => void) | null;
  autosaveData?: string | null;
  confirmOpen?:
    | ((title: unknown, message: unknown, onYes?: (() => void) | null, onNo?: (() => void) | null) => void)
    | null;
}) {
  const calls: string[] = [];
  const autosaveCalls: string[] = [];
  const editStateCalls: string[] = [];
  const reports: Array<{ op: string; message: string }> = [];
  const runtimeFlags: Array<{ key: string; value: unknown }> = [];
  const toasts: Array<{ message: unknown; type: unknown }> = [];

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

  if (overrides?.applyProjectSnapshot !== null) {
    (actions.config as Record<string, unknown>).applyProjectSnapshot =
      overrides?.applyProjectSnapshot === undefined
        ? (_snapshot: Record<string, unknown>, meta?: Record<string, unknown>) => {
            calls.push(`config:${String(meta?.source || '')}`);
          }
        : overrides.applyProjectSnapshot;
  }

  if (overrides?.commitUiSnapshot !== null) {
    actions.commitUiSnapshot =
      overrides?.commitUiSnapshot === undefined
        ? (_snapshot: Record<string, unknown>, meta?: Record<string, unknown>) => {
            calls.push(`commit:${String(meta?.source || '')}`);
          }
        : overrides.commitUiSnapshot;
  }

  if (overrides?.setDirty !== null) {
    (actions.meta as Record<string, unknown>).setDirty =
      overrides?.setDirty === undefined
        ? (next: boolean, meta?: Record<string, unknown>) => {
            calls.push(`dirty:${next}:${String(meta?.source || '')}`);
          }
        : overrides.setDirty;
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
        forceSaveNow() {
          autosaveCalls.push('force');
          return true;
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
                    }
                  : overrides.resetAllEditModes,
            },
      history:
        overrides?.resetBaseline === null
          ? { system: {} }
          : {
              system: {
                resetBaseline:
                  overrides?.resetBaseline === undefined
                    ? (meta?: Record<string, unknown>) => {
                        calls.push(`history:${String(meta?.source || '')}`);
                      }
                    : overrides.resetBaseline,
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
        return {
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
          meta: {},
        };
      },
    },
  };

  const orchestrator = createProjectIoOrchestrator({
    App: App as never,
    showToast(message, type) {
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

  return { App, calls, autosaveCalls, editStateCalls, reports, runtimeFlags, toasts, orchestrator };
}

const VALID_PROJECT = {
  settings: {
    width: 120,
    height: 240,
    depth: 60,
    doors: 4,
    wardrobeType: 'hinged',
  },
  toggles: {},
};

test('project io fail-fast: full project loads now fail closed when canonical config apply seam is missing', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, calls, autosaveCalls, runtimeFlags } = createProjectIoApp({
      applyProjectSnapshot: null,
    });

    const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'error');
    assert.match(
      String(result.message || ''),
      /project\.load config apply|actions\.config\.applyProjectSnapshot/i
    );
    assert.deepEqual(calls, []);
    assert.deepEqual(autosaveCalls, ['cancel']);
    assert.deepEqual(runtimeFlags, [
      { key: 'restoring', value: true },
      { key: 'restoring', value: false },
    ]);
  });
});

test('project io fail-fast: missing commitUiSnapshot seam no longer lets project loads limp forward', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, calls, autosaveCalls } = createProjectIoApp({ commitUiSnapshot: null });

    const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'error');
    assert.match(String(result.message || ''), /project\.load ui snapshot commit|actions\.commitUiSnapshot/i);
    assert.deepEqual(calls, ['config:project.load']);
    assert.deepEqual(autosaveCalls, ['cancel']);
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
    assert.deepEqual(missingHistory.autosaveCalls, ['cancel', 'force']);

    const historyApply = missingHistory.orchestrator.loadProjectData(VALID_PROJECT as never, {
      toast: false,
      meta: { source: 'history.undoRedo' },
    });
    assert.deepEqual(historyApply, { ok: true, restoreGen: 2 });
    assert.deepEqual(missingHistory.autosaveCalls, ['cancel', 'force', 'cancel']);
  });
});

test('project io restoreLastSession preserves precise restore failure toasts through the shared load-result seam', () => {
  return withSuppressedConsole(async () => {
    const { orchestrator, toasts } = createProjectIoApp({
      autosaveData: JSON.stringify(VALID_PROJECT),
      applyProjectSnapshot: () => {
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

test('project io handleFileLoad now delegates through canonical project file ingress and preserves final success semantics', async () => {
  const file = new Blob([JSON.stringify(VALID_PROJECT)], { type: 'application/json' }) as Blob & {
    name: string;
  };
  file.name = 'project.json';
  const { orchestrator, toasts, calls, autosaveCalls } = createProjectIoApp();

  const result = await orchestrator.handleFileLoad(file as never);

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(toasts, [{ message: 'הפרויקט נטען בהצלחה!', type: 'success' }]);
  assert.deepEqual(calls, [
    'config:project.load',
    'commit:project.load',
    'dirty:false:project.load',
    'history:project.load',
  ]);
  assert.deepEqual(autosaveCalls, ['cancel', 'force']);
});

test('project io load clears active edit modes so transient authoring state does not leak across project roundtrips', () => {
  const { orchestrator, editStateCalls } = createProjectIoApp();

  const result = orchestrator.loadProjectData(VALID_PROJECT as never, { toast: false });

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(editStateCalls, ['reset']);
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

test('project io load uses one canonical root patch when the installed actions surface supports it', () => {
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
  assert.equal(rootPatches.length, 1);
  assert.deepEqual(calls, ['history:project.load']);
  assert.deepEqual(autosaveCalls, ['cancel', 'force']);
  assert.deepEqual(runtimeFlags, [{ key: 'restoring', value: true }]);
  assert.equal(rootPatches[0].meta?.source, 'project.load');
  assert.equal(rootPatches[0].patch.runtime?.sketchMode, true);
  assert.equal(rootPatches[0].patch.runtime?.restoring, false);
  assert.equal(rootPatches[0].patch.meta?.dirty, false);
  assert.equal(rootPatches[0].patch.ui?.orderPdfEditorZoom, 1.25);
  assert.deepEqual(rootPatches[0].patch.ui?.orderPdfEditorDraft, { id: 'draft-1' });
  assert.equal(rootPatches[0].patch.ui?.__snapshot, true);
  assert.equal(typeof rootPatches[0].patch.ui?.__capturedAt, 'number');
  assert.deepEqual(rootPatches[0].patch.config?.removedDoorsMap, {});
  assert.deepEqual(rootPatches[0].patch.config?.drawerDividersMap, {});
  assert.equal(rootPatches[0].patch.config?.__replace?.removedDoorsMap, true);
  assert.equal(rootPatches[0].patch.config?.__replace?.drawerDividersMap, true);
});

test('project io handleFileLoad now preserves canonical file-read/load errors instead of hiding behind pending legacy results', async () => {
  await withSuppressedConsole(async () => {
    const file = new Blob([JSON.stringify(VALID_PROJECT)], { type: 'application/json' }) as Blob & {
      name: string;
    };
    file.name = 'project.json';
    const { orchestrator, toasts } = createProjectIoApp({
      applyProjectSnapshot: () => {
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

test('project io load accepts persisted numeric-string ui dims instead of rejecting saved-model snapshots as invalid', () => {
  const { orchestrator, calls, autosaveCalls } = createProjectIoApp();

  const result = orchestrator.loadProjectData(
    {
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

  assert.deepEqual(result, { ok: true, restoreGen: 1 });
  assert.deepEqual(autosaveCalls, ['cancel', 'force']);
  assert.deepEqual(calls, [
    'config:project.load',
    'commit:project.load',
    'dirty:false:project.load',
    'history:project.load',
  ]);
});
