import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProjectIoUiState,
  readProjectLoadToastMessage,
} from '../esm/native/io/project_io_orchestrator_shared.ts';
import { createProjectLoadAcceptedResult } from '../esm/native/runtime/project_load_action_result.ts';

test('project io shared normalizes ui snapshots without leaking null raw payloads', () => {
  assert.deepEqual(normalizeProjectIoUiState({ projectName: 'A', raw: null }), { projectName: 'A' });
  assert.deepEqual(normalizeProjectIoUiState({ raw: { doors: 4 }, activeTab: 'notes' }), {
    raw: { doors: 4 },
    activeTab: 'notes',
  });
  assert.deepEqual(normalizeProjectIoUiState(null), {});
});

test('project io shared load toast reader preserves canonical result semantics', () => {
  assert.equal(readProjectLoadToastMessage({ ok: true }), 'הפרויקט נטען בהצלחה!');
  assert.equal(
    readProjectLoadToastMessage(createProjectLoadAcceptedResult(Promise.resolve({ ok: true }), 2, 1)),
    null
  );
  assert.equal(readProjectLoadToastMessage({ ok: false, reason: 'invalid' }), 'קובץ הפרויקט לא תקין');
  assert.equal(readProjectLoadToastMessage({ ok: false, reason: 'missing_file' } as never), null);
  assert.equal(
    readProjectLoadToastMessage({ ok: false, reason: 'error', message: 'real failure' }),
    'real failure'
  );
});
