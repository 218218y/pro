import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectSaveActionErrorResult,
  normalizeProjectSaveActionResult,
} from '../esm/native/runtime/project_save_action_result.ts';

test('project save action result normalization keeps reasons canonical and strips junk from success results', () => {
  const settled = Promise.resolve({ ok: true } as const);
  assert.deepEqual(normalizeProjectSaveActionResult(true), { ok: true });
  assert.deepEqual(normalizeProjectSaveActionResult(false), { ok: false, reason: 'not-installed' });
  assert.deepEqual(
    normalizeProjectSaveActionResult({
      accepted: true,
      reused: false,
      operationId: 'save-1',
      requestedAt: 100,
      acceptedAt: 123,
      settled,
      reason: 'error',
      message: 'ignore me',
    }),
    {
      accepted: true,
      reused: false,
      operationId: 'save-1',
      requestedAt: 100,
      acceptedAt: 123,
      settled,
    }
  );
  assert.deepEqual(normalizeProjectSaveActionResult({ ok: true, pending: true }), {
    ok: false,
    reason: 'invalid',
    message: 'Legacy project save pending results are not supported; return an accepted operation handle.',
  });
  assert.deepEqual(
    normalizeProjectSaveActionResult({
      accepted: true,
      reused: false,
      operationId: 'save-without-request-time',
      acceptedAt: 123,
      settled,
    }),
    {
      ok: false,
      reason: 'invalid',
      message: 'Project save accepted result is missing its terminal operation handle.',
    }
  );
  assert.deepEqual(normalizeProjectSaveActionResult({ ok: true, outcome: 'browser-delivery-completed' }), {
    ok: true,
    outcome: 'browser-delivery-completed',
  });
  assert.deepEqual(
    normalizeProjectSaveActionResult({
      ok: false,
      reason: ' download_unavailable ',
      message: '  blob missing  ',
    }),
    { ok: false, reason: 'download-unavailable', message: 'blob missing' }
  );
  assert.deepEqual(normalizeProjectSaveActionResult({ ok: false, reason: ' busy ', message: ' wait ' }), {
    ok: false,
    reason: 'busy',
    message: 'wait',
  });
  assert.deepEqual(
    normalizeProjectSaveActionResult(
      { ok: false, reason: 'nonsense-reason', message: '  keep me  ' },
      'invalid'
    ),
    { ok: false, reason: 'invalid', message: 'keep me' }
  );
  assert.deepEqual(normalizeProjectSaveActionResult({ nope: true }), { ok: false, reason: 'not-installed' });
});

test('project save action error result preserves actionable messages from thrown strings and records', () => {
  assert.deepEqual(buildProjectSaveActionErrorResult('save string exploded', 'fallback message'), {
    ok: false,
    reason: 'error',
    message: 'save string exploded',
  });
  assert.deepEqual(
    buildProjectSaveActionErrorResult({ message: 'save record exploded' }, 'fallback message'),
    {
      ok: false,
      reason: 'error',
      message: 'save record exploded',
    }
  );
});
