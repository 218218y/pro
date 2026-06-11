import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProjectActionErrorResult,
  getProjectLoadToast,
  getProjectRestoreToast,
  getProjectSaveToast,
  getResetDefaultToast,
  reportProjectLoadResult,
  reportProjectRestoreResult,
  reportProjectSaveResult,
  reportResetDefaultResult,
} from '../esm/native/ui/project_action_feedback.ts';

test('project ui feedback helpers map command results to stable user-facing messages', () => {
  assert.deepEqual(getProjectLoadToast({ ok: false, reason: 'not-installed' }), {
    message: 'טעינת קובץ לא זמינה כרגע',
    type: 'error',
  });
  assert.deepEqual(getProjectLoadToast({ ok: false, reason: 'invalid' }), {
    message: 'קובץ הפרויקט לא תקין',
    type: 'error',
  });

  assert.deepEqual(getProjectLoadToast({ ok: false, reason: 'error', message: 'disk read failed' }), {
    message: 'disk read failed',
    type: 'error',
  });
  assert.equal(getProjectLoadToast({ ok: false, reason: 'missing-file' }), null);
  assert.equal(getProjectLoadToast({ ok: false, reason: 'missing_file' } as any), null);
  assert.deepEqual(getProjectLoadToast({ ok: false, reason: 'not installed' } as any), {
    message: 'טעינת קובץ לא זמינה כרגע',
    type: 'error',
  });
  assert.equal(getProjectLoadToast({ ok: false, reason: 'superseded' }), null);
  assert.equal(getProjectLoadToast({ ok: true, pending: true }), null);
  assert.deepEqual(getProjectLoadToast({ ok: true }), {
    message: 'הפרויקט נטען בהצלחה!',
    type: 'success',
  });

  assert.deepEqual(getProjectRestoreToast({ ok: false, reason: 'not-installed' }), {
    message: 'שחזור העריכה לא זמין כרגע',
    type: 'error',
  });
  assert.equal(getProjectRestoreToast({ ok: false, reason: 'missing-autosave' }), null);
  assert.equal(getProjectRestoreToast({ ok: false, reason: 'cancelled' }), null);

  assert.deepEqual(getProjectRestoreToast({ ok: false, reason: 'error', message: 'restore load exploded' }), {
    message: 'restore load exploded',
    type: 'error',
  });
  assert.deepEqual(getProjectRestoreToast({ ok: true }), {
    message: 'העריכה שוחזרה בהצלחה!',
    type: 'success',
  });
  assert.equal(getProjectRestoreToast({ ok: true, pending: true }), null);

  assert.deepEqual(getProjectSaveToast({ ok: false, reason: 'not-installed' }), {
    message: 'שמירת פרויקט לא זמינה כרגע',
    type: 'error',
  });
  assert.deepEqual(getProjectSaveToast({ ok: true }), {
    message: 'הפרויקט נשמר בהצלחה!',
    type: 'success',
  });
  assert.equal(getProjectSaveToast({ ok: true, pending: true }), null);
  assert.equal(getProjectSaveToast({ ok: false, reason: 'cancelled' }), null);
  assert.deepEqual(getProjectSaveToast({ ok: false, reason: 'download-unavailable' }), {
    message: 'הדפדפן לא זמין לשמירה',
    type: 'error',
  });
  assert.deepEqual(
    getProjectSaveToast({
      ok: false,
      reason: 'download-unavailable',
      message: 'browser blob download unavailable',
    }),
    {
      message: 'browser blob download unavailable',
      type: 'error',
    }
  );
  assert.deepEqual(getProjectSaveToast({ ok: false, reason: 'error', message: 'save exploded' }), {
    message: 'save exploded',
    type: 'error',
  });

  assert.deepEqual(getResetDefaultToast({ ok: false, reason: 'not-installed' }), {
    message: 'איפוס לא זמין כרגע',
    type: 'error',
  });
  assert.equal(getResetDefaultToast({ ok: false, reason: 'cancelled' }), null);
  assert.equal(getResetDefaultToast({ ok: false, reason: 'superseded' }), null);

  assert.deepEqual(getResetDefaultToast({ ok: false, reason: 'error', message: 'default load exploded' }), {
    message: 'default load exploded',
    type: 'error',
  });
  assert.deepEqual(getResetDefaultToast({ ok: true }), {
    message: 'הארון אופס לברירת המחדל',
    type: 'success',
  });
});

test('project ui feedback reporters emit exactly one toast and stay quiet for cancelled flows', () => {
  const seen: Array<{ message: string; type?: string }> = [];
  const fb = {
    toast(message: string, type?: 'success' | 'error' | 'warning' | 'info') {
      seen.push({ message, type });
    },
  };

  assert.deepEqual(reportProjectLoadResult(fb, { ok: true }), {
    message: 'הפרויקט נטען בהצלחה!',
    type: 'success',
  });
  assert.deepEqual(reportProjectLoadResult(fb, { ok: false, reason: 'invalid' }), {
    message: 'קובץ הפרויקט לא תקין',
    type: 'error',
  });
  assert.deepEqual(reportProjectRestoreResult(fb, { ok: true }), {
    message: 'העריכה שוחזרה בהצלחה!',
    type: 'success',
  });
  assert.equal(reportProjectSaveResult(fb, { ok: true, pending: true }), null);
  assert.deepEqual(reportProjectSaveResult(fb, { ok: true }), {
    message: 'הפרויקט נשמר בהצלחה!',
    type: 'success',
  });
  assert.deepEqual(reportResetDefaultResult(fb, { ok: true }), {
    message: 'הארון אופס לברירת המחדל',
    type: 'success',
  });
  assert.equal(reportResetDefaultResult(fb, { ok: false, reason: 'cancelled' }), null);
  assert.equal(reportResetDefaultResult(fb, { ok: false, reason: 'superseded' }), null);

  assert.deepEqual(seen, [
    { message: 'הפרויקט נטען בהצלחה!', type: 'success' },
    { message: 'קובץ הפרויקט לא תקין', type: 'error' },
    { message: 'העריכה שוחזרה בהצלחה!', type: 'success' },
    { message: 'הפרויקט נשמר בהצלחה!', type: 'success' },
    { message: 'הארון אופס לברירת המחדל', type: 'success' },
  ]);
});

test('project ui feedback error helper preserves real error messages and fallback text', () => {
  assert.deepEqual(buildProjectActionErrorResult(new Error('disk read exploded'), 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'disk read exploded',
  });
  assert.deepEqual(buildProjectActionErrorResult(null, 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'טעינת קובץ נכשלה',
  });
  assert.deepEqual(buildProjectActionErrorResult('disk exploded', 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'disk exploded',
  });
  assert.deepEqual(buildProjectActionErrorResult({ message: 'record exploded' }, 'טעינת קובץ נכשלה'), {
    ok: false,
    reason: 'error',
    message: 'record exploded',
  });
});
