import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectIoLoadResult,
  normalizeProjectIoUiState,
  readProjectLoadToastMessage,
  readProjectRestoreToastMessage,
} from '../esm/native/io/project_io_orchestrator_shared.ts';

test('project io shared normalizes ui snapshots without leaking null raw payloads', () => {
  assert.deepEqual(normalizeProjectIoUiState({ projectName: 'A', raw: null }), { projectName: 'A' });
  assert.deepEqual(normalizeProjectIoUiState({ raw: { doors: 4 }, activeTab: 'notes' }), {
    raw: { doors: 4 },
    activeTab: 'notes',
  });
  assert.deepEqual(normalizeProjectIoUiState(null), {});
});

test('project io shared toast readers preserve canonical result semantics', () => {
  assert.equal(readProjectLoadToastMessage(buildProjectIoLoadResult(true)), 'הפרויקט נטען בהצלחה!');
  assert.equal(readProjectLoadToastMessage(buildProjectIoLoadResult(true, { pending: true })), null);
  assert.equal(
    readProjectLoadToastMessage(buildProjectIoLoadResult(false, { reason: 'invalid' })),
    'קובץ הפרויקט לא תקין'
  );
  assert.equal(readProjectLoadToastMessage({ ok: false, reason: 'missing_file' } as never), null);
  assert.equal(
    readProjectLoadToastMessage(
      buildProjectIoLoadResult(false, { reason: 'error', message: 'real failure' })
    ),
    'real failure'
  );

  assert.equal(
    readProjectRestoreToastMessage(buildProjectIoLoadResult(false, { reason: 'missing-autosave' })),
    null
  );
  assert.equal(readProjectRestoreToastMessage({ ok: false, reason: 'missing_autosave' } as never), null);
  assert.equal(
    readProjectRestoreToastMessage(buildProjectIoLoadResult(false, { reason: 'not-installed' })),
    'שחזור העריכה לא זמין כרגע'
  );
  assert.equal(
    readProjectRestoreToastMessage({ ok: false, reason: 'not installed' } as never),
    'שחזור העריכה לא זמין כרגע'
  );
  assert.equal(
    readProjectRestoreToastMessage(
      buildProjectIoLoadResult(false, { reason: 'error', message: 'restore exploded' })
    ),
    'restore exploded'
  );
});
