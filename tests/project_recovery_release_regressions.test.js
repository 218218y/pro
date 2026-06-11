import test from 'node:test';
import assert from 'node:assert/strict';

import { readAutosaveProjectPayload } from '../dist/esm/native/runtime/project_io_access.js';
import { createKernelHistorySystem } from '../dist/esm/native/kernel/kernel_history_system.js';
import { restoreProjectSessionWithConfirm } from '../dist/esm/native/ui/project_session_commands.js';

function asRecord(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

test('project recovery hardening clears invalid autosave payloads and does not open restore confirmation for them', async () => {
  const calls = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString(key) {
          calls.push(['getString', key]);
          return '{bad-json';
        },
        remove(key) {
          calls.push(['remove', key]);
          return true;
        },
      },
      uiFeedback: {
        confirm() {
          calls.push(['confirm']);
        },
      },
      projectIO: {
        loadProjectData() {
          calls.push(['loadProjectData']);
          return { ok: true };
        },
      },
    },
  };

  assert.deepEqual(readAutosaveProjectPayload(App), { ok: false, reason: 'invalid' });
  assert.deepEqual(await restoreProjectSessionWithConfirm(App), { ok: false, reason: 'invalid' });
  assert.deepEqual(calls, [
    ['getString', 'autosave-key'],
    ['remove', 'autosave-key'],
    ['getString', 'autosave-key'],
    ['remove', 'autosave-key'],
  ]);
});

test('project recovery hardening also clears autosave payloads that parse to a non-project array', () => {
  const removals = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-key' },
        getString() {
          return JSON.stringify([{ settings: {} }]);
        },
        remove(key) {
          removals.push(key);
          return true;
        },
      },
    },
  };

  assert.deepEqual(readAutosaveProjectPayload(App), { ok: false, reason: 'invalid' });
  assert.deepEqual(removals, ['autosave-key']);
});

test('project recovery hardening clones preserved PDF draft during undo/redo apply and reports failures canonically', () => {
  const pdfDraft = {
    manualEnabled: true,
    nested: { value: 1 },
    items: [1, { keep: true }],
  };
  const seen = [];
  const nonFatal = [];

  const historySystem = createKernelHistorySystem({
    App: {},
    existing: {},
    asRecord,
    isRecord,
    isRestoring: () => false,
    getTimers: () => ({ setTimeout: handler => setTimeout(handler, 0) }),
    getProjectUndoSnapshot: () => ({ settings: { width: 120 } }),
    captureSavedNotes: () => [{ id: 'n1', text: 'keep' }],
    getCurrentUiSnapshot: () => ({
      orderPdfEditorDraft: pdfDraft,
      orderPdfEditorZoom: '2.75',
    }),
    loadProjectSnapshot: snapshot => {
      seen.push(snapshot);
      if (snapshot.settings?.width === 240) {
        throw new Error('history apply exploded');
      }
    },
    flushPendingPushViaAccess: () => false,
    schedulePushViaAccess: () => {},
    reportNonFatal: (op, error) => {
      nonFatal.push([op, error instanceof Error ? error.message : String(error)]);
    },
  });

  historySystem.applyState(JSON.stringify({ settings: { width: 120 } }));
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0].savedNotes, [{ id: 'n1', text: 'keep' }]);
  assert.notEqual(seen[0].orderPdfEditorDraft, pdfDraft);
  assert.deepEqual(seen[0].orderPdfEditorDraft, {
    manualEnabled: true,
    nested: { value: 1 },
    items: [1, { keep: true }],
  });
  assert.equal(seen[0].orderPdfEditorZoom, 2.75);
  pdfDraft.nested.value = 9;
  assert.equal(seen[0].orderPdfEditorDraft.nested.value, 1);
  assert.equal(historySystem.isPaused, false);

  historySystem.applyState(JSON.stringify({ settings: { width: 240 } }));
  historySystem.applyState('{bad-json');
  assert.deepEqual(nonFatal, [
    ['kernelHistorySystem.applyState', 'history apply exploded'],
    [
      'kernelHistorySystem.applyState',
      "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
    ],
  ]);
  assert.equal(historySystem.isPaused, false);
});
