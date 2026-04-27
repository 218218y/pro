import test from 'node:test';
import assert from 'node:assert/strict';

import {
  installHistoryService,
  schedulePush,
  flushPendingPush,
  cancelPendingPush,
} from '../esm/native/services/history.ts';
import {
  installAutosaveService,
  captureAutosaveSnapshot,
  commitAutosaveNow,
} from '../esm/native/services/autosave.ts';
import { installNotesService } from '../esm/native/ui/notes_service.ts';
import { setHistorySystem, getHistorySystem } from '../esm/native/kernel/history_access.ts';
import { cfgSetScalar } from '../esm/native/runtime/cfg_access.ts';
import { normalizeProjectData } from '../esm/native/io/project_schema.ts';

type AnyRecord = Record<string, unknown>;

type StoreLike = {
  getState: () => AnyRecord;
  patch: (payload: AnyRecord, meta?: AnyRecord, opts?: AnyRecord) => unknown;
  subscribe: (fn: (state: AnyRecord, meta?: AnyRecord) => void) => () => void;
};

function makeStore(state: AnyRecord): StoreLike {
  const subs: Array<(state: AnyRecord, meta?: AnyRecord) => void> = [];
  return {
    getState: () => state,
    patch: (payload: AnyRecord, meta?: AnyRecord) => {
      if (payload && typeof payload === 'object') {
        const p = payload as AnyRecord;
        if (p.config && typeof p.config === 'object')
          Object.assign(state.config as AnyRecord, p.config as AnyRecord);
        if (p.ui && typeof p.ui === 'object') Object.assign(state.ui as AnyRecord, p.ui as AnyRecord);
        if (p.runtime && typeof p.runtime === 'object')
          Object.assign(state.runtime as AnyRecord, p.runtime as AnyRecord);
        if (p.mode && typeof p.mode === 'object') Object.assign(state.mode as AnyRecord, p.mode as AnyRecord);
        if (p.meta && typeof p.meta === 'object') Object.assign(state.meta as AnyRecord, p.meta as AnyRecord);
      }
      const silent = !!(meta && (meta as AnyRecord).silent);
      if (!silent) {
        for (const fn of subs.slice()) {
          try {
            fn(state, meta as AnyRecord);
          } catch {
            // ignore
          }
        }
      }
      return undefined;
    },
    subscribe: fn => {
      subs.push(fn);
      return () => {
        const idx = subs.indexOf(fn);
        if (idx >= 0) subs.splice(idx, 1);
      };
    },
  };
}

test('runtime services parity: history service debounced push flushes once and ignores silent/noHistory/restoring', async () => {
  const pushes: AnyRecord[] = [];
  const App: AnyRecord = {
    services: { history: { system: { pushState: (a: AnyRecord) => pushes.push(a) } } },
    store: makeStore({ runtime: { restoring: false }, ui: {}, config: {}, mode: {}, meta: {} }),
  };

  const svc = installHistoryService(App as any);
  assert.equal(typeof svc.schedulePush, 'function');
  assert.equal(typeof svc.flushPendingPush, 'function');

  schedulePush(App as any, { noHistory: true, source: 'skip:noHistory' });
  schedulePush(App as any, { silent: true, source: 'skip:silent' });
  flushPendingPush(App as any);
  assert.equal(pushes.length, 0);

  schedulePush(App as any, { source: 'keep', kind: 'cfg' });
  flushPendingPush(App as any, { from: 'flush' });
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].source, 'keep');
  assert.equal(pushes[0].from, 'flush');

  App.store.patch({ runtime: { restoring: true } }, { silent: true });
  schedulePush(App as any, { source: 'skip:restoring' });
  flushPendingPush(App as any);
  assert.equal(pushes.length, 1);

  cancelPendingPush(App as any);
});

test('runtime services parity: autosave captures project snapshot + pdf draft and writes via storage', () => {
  const writes: AnyRecord[] = [];
  const App: AnyRecord = {
    services: {
      project: {
        capture: (mode: string) => ({ mode, config: { a: 1 } }),
      },
      storage: {
        setString: (key: string, value: string) => {
          writes.push({ key, value });
          return true;
        },
      },
    },
    util: { log: () => undefined },
    store: makeStore({
      ui: {
        orderPdfEditorDraft: { pages: [{ id: 1 }] },
        orderPdfEditorZoom: 1.5,
      },
      config: {},
      runtime: { systemReady: true, restoring: false },
      mode: {},
      meta: {},
    }),
  };

  const svc = installAutosaveService(App as any);
  assert.equal(typeof svc.forceSaveNow, 'function');
  assert.equal(typeof svc.flushPending, 'function');

  const snap = captureAutosaveSnapshot(App as any) as AnyRecord;
  assert.equal(snap.mode, 'persist');
  assert.deepEqual(snap.orderPdfEditorDraft, { pages: [{ id: 1 }] });
  assert.equal(snap.orderPdfEditorZoom, 1.5);

  assert.equal(commitAutosaveNow(App as any), true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'wardrobe_autosave_latest');
  const parsed = JSON.parse(String(writes[0].value));
  assert.equal(parsed.version, '2.1');
  assert.equal(parsed.mode, 'persist');
  assert.equal(parsed.orderPdfEditorZoom, 1.5);

  App.store.patch({ runtime: { restoring: true } }, { silent: true });
  assert.equal(commitAutosaveNow(App as any), false);
  assert.equal(writes.length, 1);
});

test('runtime services parity: notes restore/clear/persist routes through canonical actions surfaces', () => {
  const calls: AnyRecord[] = [];
  const state = {
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
    config: {
      savedNotes: [{ text: '<b>Old</b>' }],
    },
  };

  const App: AnyRecord = {
    store: makeStore(state as any),
    actions: {
      config: {
        setSavedNotes: (next: unknown, meta: AnyRecord) => {
          calls.push({ op: 'actions.config.setSavedNotes', next, meta });
          (state.config as AnyRecord).savedNotes = Array.isArray(next) ? next : [];
          return next;
        },
      },
      meta: {
        persist: (meta: AnyRecord) => calls.push({ op: 'actions.meta.persist', meta }),
      },
    },
  };

  const notes = installNotesService(App as any);

  const initial = notes.getForSave?.() || [];
  assert.equal(Array.isArray(initial), true);
  assert.equal(initial.length, 1);
  // No DOM => sanitizer falls back to text stripping.
  assert.equal(initial[0]?.text, 'Old');

  notes.restoreFromSave?.([
    { text: '<script>x</script><b>Hello</b>', style: { left: '10px', top: '20px' }, doorsOpen: true },
  ]);
  notes.clear?.();
  notes.persist?.({ source: 'test:notes:ui' });

  const ops = calls.map(c => c.op);
  assert.deepEqual(ops, [
    'actions.config.setSavedNotes',
    'actions.config.setSavedNotes',
    'actions.meta.persist',
  ]);

  const restore = calls[0] as AnyRecord;
  assert.equal((restore.meta as AnyRecord).source, 'notes:restore');
  assert.equal((restore.meta as AnyRecord).noHistory, true);
  assert.equal((restore.meta as AnyRecord).noBuild, true);
  assert.equal(Array.isArray(restore.next as AnyRecord[]), true);
  assert.equal((restore.next as AnyRecord[] as any[])[0].text, 'xHello');

  const clear = calls[1] as AnyRecord;
  assert.equal((clear.meta as AnyRecord).source, 'notes:clear');
  assert.deepEqual(clear.next as AnyRecord, []);

  const persist = calls[2] as AnyRecord;
  assert.equal((persist.meta as AnyRecord).source, 'test:notes:ui');
  assert.equal((persist.meta as AnyRecord).noBuild, true);
  assert.equal((persist.meta as AnyRecord).noHistory, true);
});

test('runtime services parity: history undo/redo seam uses canonical stateKernel/services surfaces (deps fallback removed)', () => {
  const hs = {
    undoCalls: 0,
    redoCalls: 0,
    undo() {
      this.undoCalls += 1;
    },
    redo() {
      this.redoCalls += 1;
    },
  };

  const App: AnyRecord = {
    services: {},
    deps: { historySystem: { legacyOnly: true } },
  };

  const attached = setHistorySystem(App as any, hs as any);
  assert.equal(attached, hs as any);
  assert.equal(getHistorySystem(App as any), hs as any);

  // Mirror surface should also resolve.
  assert.equal((App.services as AnyRecord).history.system, hs);

  // If state_api is present, kernel helper should prefer the centralized actions.history getter/setter seam.
  let hs2UndoCalls = 0;
  let hs2RedoCalls = 0;
  const hs2 = {
    id: 'hs2',
    undo() {
      hs2UndoCalls += 1;
    },
    redo() {
      hs2RedoCalls += 1;
    },
  };
  App.actions = {
    patch: () => undefined,
    history: {
      getSystem: () => hs2,
      setSystem: (next: AnyRecord) => {
        (App.services as AnyRecord).history = { system: next };
        return next;
      },
    },
  };
  assert.equal(getHistorySystem(App as any), hs2 as any);
  const attachedViaActions = setHistorySystem(App as any, hs2 as any);
  assert.equal(attachedViaActions, hs2 as any);
  assert.equal((App.services as AnyRecord).history.system, hs2 as any);
  (getHistorySystem(App as any) as any)?.undo?.();
  (getHistorySystem(App as any) as any)?.redo?.();
  assert.equal(hs.undoCalls, 0);
  assert.equal(hs.redoCalls, 0);
  assert.equal(hs2UndoCalls, 1);
  assert.equal(hs2RedoCalls, 1);

  // Final delete-pass behavior: deps-only fallback is intentionally not used anymore.
  assert.equal(getHistorySystem({ deps: { historySystem: hs } } as any), null);
});

test('runtime services parity: import/load schema normalization preserves canonical payload shape', () => {
  const raw = {
    payload: {
      settings: { width: 120 },
      splitDoorsMap: {
        split_d3_full: true,
        split_d3_bot: false,
      },
      splitDoorsBottomMap: {
        splitBottom_d9_top: true,
      },
    },
  };

  const normalized = normalizeProjectData(raw as any);
  assert.ok(normalized);

  // Canonical since stage4:
  // schema normalization may stamp additional defaults beyond user-provided scalars.
  // We validate the important invariants without forbidding new defaults.
  assert.equal((normalized?.settings as AnyRecord).width, 120);
  assert.equal((normalized?.settings as AnyRecord).globalHandleType, 'standard');
  assert.equal((normalized?.settings as AnyRecord).stackSplitLowerDepthManual, false);
  assert.equal((normalized?.settings as AnyRecord).stackSplitLowerDoorsManual, false);
  assert.equal((normalized?.settings as AnyRecord).stackSplitLowerWidthManual, false);

  // Key normalization is core import/load parity hardening (fixes runtime mismatches after project load).
  assert.equal((normalized?.splitDoorsMap as AnyRecord).split_d3, false);
  assert.equal((normalized?.splitDoorsBottomMap as AnyRecord).splitb_d9, true);
});

test('runtime services parity: texture/custom-upload cfg write path uses canonical cfgSetScalar surface', () => {
  const calls: AnyRecord[] = [];
  const state = { ui: {}, runtime: {}, mode: {}, meta: {}, config: {} };
  const App: AnyRecord = {
    store: makeStore(state),
    actions: {
      patch: (partial: AnyRecord, meta: AnyRecord) => {
        calls.push({ op: 'actions.patch', partial, meta });
        // emulate root patch
        if (partial.config && typeof partial.config === 'object')
          Object.assign(state.config as AnyRecord, partial.config as AnyRecord);
      },
      config: {
        patch: (patch: AnyRecord, meta: AnyRecord) => {
          calls.push({ op: 'actions.config.patch', patch, meta });
          Object.assign(state.config as AnyRecord, patch);
          return patch;
        },
      },
    },
  };

  const meta1 = { source: 'test:texture:upload' };
  const res1 = cfgSetScalar(App as any, 'customUploadedDataURL', 'data:image/png;base64,abc', meta1 as any);
  assert.equal(res1, 'data:image/png;base64,abc');

  const meta2 = { source: 'test:texture:remove' };
  const res2 = cfgSetScalar(App as any, 'customUploadedDataURL', null, meta2 as any);
  assert.equal(res2, null);

  assert.equal((state.config as AnyRecord).customUploadedDataURL, null);
  // Ensure we committed through canonical config patch surface at least once.
  assert.ok(
    calls.some(c => c.op === 'actions.config.patch' && (c.meta as AnyRecord).source === 'test:texture:upload')
  );
  assert.ok(
    calls.some(c => c.op === 'actions.config.patch' && (c.meta as AnyRecord).source === 'test:texture:remove')
  );
});
