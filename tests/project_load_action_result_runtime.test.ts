import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectLoadActionErrorResult,
  normalizeProjectLoadActionResult,
  normalizeProjectLoadFailureReason,
} from '../esm/native/runtime/project_load_action_result.ts';

test('project load action result normalization keeps file-load outcomes canonical', () => {
  assert.deepEqual(normalizeProjectLoadActionResult(true), { ok: true });
  assert.deepEqual(normalizeProjectLoadActionResult(false, 'not-installed'), {
    ok: false,
    reason: 'not-installed',
  });
  assert.deepEqual(normalizeProjectLoadActionResult({ ok: true, pending: true, restoreGen: 7 }), {
    ok: true,
    pending: true,
    restoreGen: 7,
  });
  assert.deepEqual(
    normalizeProjectLoadActionResult({ ok: false, reason: 'missing_file', message: ' pick a file ' }),
    { ok: false, reason: 'missing-file', message: 'pick a file' }
  );
  assert.deepEqual(normalizeProjectLoadActionResult({ ok: false, reason: 'not installed', restoreGen: 4 }), {
    ok: false,
    reason: 'not-installed',
    restoreGen: 4,
  });
  assert.deepEqual(
    normalizeProjectLoadActionResult({ ok: false, reason: 'load', message: 'loader exploded' }),
    { ok: false, reason: 'error', message: 'loader exploded' }
  );
  assert.deepEqual(normalizeProjectLoadActionResult(undefined, 'invalid'), { ok: false, reason: 'invalid' });
});

test('project load action result error builder preserves actionable messages', () => {
  assert.deepEqual(buildProjectLoadActionErrorResult(new Error('disk exploded'), 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'disk exploded',
  });
  assert.deepEqual(buildProjectLoadActionErrorResult('blob exploded', 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'blob exploded',
  });
  assert.deepEqual(buildProjectLoadActionErrorResult({ message: 'record exploded' }, 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'record exploded',
  });
});

test('project load failure reason normalization handles legacy aliases', () => {
  assert.equal(normalizeProjectLoadFailureReason('missing file'), 'missing-file');
  assert.equal(normalizeProjectLoadFailureReason('not_installed'), 'not-installed');
  assert.equal(normalizeProjectLoadFailureReason('result'), 'error');
  assert.equal(normalizeProjectLoadFailureReason('bogus', 'invalid'), 'invalid');
});
