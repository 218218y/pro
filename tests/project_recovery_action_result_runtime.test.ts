import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectResetDefaultActionErrorResult,
  buildProjectRestoreActionErrorResult,
  normalizeProjectResetDefaultActionResult,
  normalizeProjectRestoreActionResult,
} from '../esm/native/runtime/project_recovery_action_result.ts';

test('project recovery action results normalize restore/reset reasons and sanitize success payloads', () => {
  assert.deepEqual(normalizeProjectRestoreActionResult({ ok: true, restoreGen: '7.9', pending: false }), {
    ok: true,
    restoreGen: 7,
  });
  assert.deepEqual(normalizeProjectRestoreActionResult({ ok: false, reason: 'missing_autosave' }), {
    ok: false,
    reason: 'missing-autosave',
  });
  assert.deepEqual(
    normalizeProjectResetDefaultActionResult({
      ok: false,
      reason: 'reset',
      message: 'default load exploded',
    }),
    {
      ok: false,
      reason: 'error',
      message: 'default load exploded',
    }
  );
  assert.deepEqual(normalizeProjectResetDefaultActionResult(false, 'not-installed'), {
    ok: false,
    reason: 'not-installed',
  });
});

test('project recovery action errors preserve actionable messages from strings and records', () => {
  assert.deepEqual(buildProjectRestoreActionErrorResult('restore exploded', 'fallback'), {
    ok: false,
    reason: 'error',
    message: 'restore exploded',
  });
  assert.deepEqual(buildProjectResetDefaultActionErrorResult({ message: 'reset exploded' }, 'fallback'), {
    ok: false,
    reason: 'error',
    message: 'reset exploded',
  });
});
