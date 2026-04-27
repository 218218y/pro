import test from 'node:test';
import assert from 'node:assert/strict';

import {
  reportProjectLoadResult,
  reportProjectRestoreResult,
  reportProjectSaveResult,
  reportResetDefaultResult,
} from '../esm/native/ui/project_action_feedback.ts';

test('project action feedback reporters keep flow semantics stable across load/restore/save/reset', () => {
  const seen: Array<{ message: string; type?: string }> = [];
  const fb = {
    toast(message: string, type?: 'success' | 'error' | 'warning' | 'info') {
      seen.push({ message, type });
    },
  };

  assert.equal(reportProjectLoadResult(fb, { ok: true, pending: true }), null);
  assert.deepEqual(reportProjectLoadResult(fb, { ok: true }), {
    message: 'הפרויקט נטען בהצלחה!',
    type: 'success',
  });
  assert.equal(reportProjectRestoreResult(fb, { ok: false, reason: 'cancelled' }), null);
  assert.equal(reportResetDefaultResult(fb, { ok: false, reason: 'cancelled' }), null);
  assert.equal(reportProjectLoadResult(fb, { ok: false, reason: 'superseded', message: 'stale load' }), null);
  assert.equal(reportProjectLoadResult(fb, { ok: false, reason: 'missing_file' } as any), null);
  assert.equal(
    reportResetDefaultResult(fb, { ok: false, reason: 'superseded', message: 'stale reset' }),
    null
  );

  assert.deepEqual(reportProjectLoadResult(fb, { ok: false, reason: 'not-installed' }), {
    message: 'טעינת קובץ לא זמינה כרגע',
    type: 'error',
  });
  assert.deepEqual(reportProjectRestoreResult(fb, { ok: false, reason: 'invalid' }), {
    message: 'נתוני השחזור לא תקינים',
    type: 'error',
  });
  assert.deepEqual(reportProjectSaveResult(fb, { ok: false, reason: 'error' }), {
    message: 'שמירת פרויקט נכשלה',
    type: 'error',
  });
  assert.deepEqual(reportResetDefaultResult(fb, { ok: false, reason: 'invalid' }), {
    message: 'האיפוס נכשל (ברירת המחדל לא תקינה)',
    type: 'error',
  });

  assert.deepEqual(seen, [
    { message: 'הפרויקט נטען בהצלחה!', type: 'success' },
    { message: 'טעינת קובץ לא זמינה כרגע', type: 'error' },
    { message: 'נתוני השחזור לא תקינים', type: 'error' },
    { message: 'שמירת פרויקט נכשלה', type: 'error' },
    { message: 'האיפוס נכשל (ברירת המחדל לא תקינה)', type: 'error' },
  ]);
});
