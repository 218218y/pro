import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSettingsBackupActionToast,
  reportSettingsBackupActionResult,
} from '../esm/native/ui/settings_backup_action_feedback.ts';

test('settings backup feedback maps export/import results to precise toast messages', () => {
  assert.deepEqual(
    getSettingsBackupActionToast({ ok: true, kind: 'export', modelsCount: 3, colorsCount: 5 }),
    { message: 'נוצר קובץ גיבוי (3 דגמים, 5 גוונים)', type: 'success' }
  );

  assert.deepEqual(
    getSettingsBackupActionToast({ ok: true, kind: 'import', modelsAdded: 2, colorsAdded: 4 }),
    { message: 'השחזור הסתיים בהצלחה! (נוספו 2 דגמים ו-4 גוונים)', type: 'success' }
  );

  assert.equal(getSettingsBackupActionToast({ ok: false, kind: 'import', reason: 'cancelled' }), null);
  assert.deepEqual(getSettingsBackupActionToast({ ok: false, kind: 'import', reason: 'invalid-json' }), {
    message: 'שחזור נכשל: הקובץ אינו JSON תקין',
    type: 'error',
  });
  assert.deepEqual(
    getSettingsBackupActionToast({ ok: false, kind: 'import', reason: 'models-unavailable' }),
    { message: 'שחזור נכשל: מסלול ייבוא הדגמים אינו זמין כרגע', type: 'error' }
  );
  assert.deepEqual(
    getSettingsBackupActionToast({ ok: false, kind: 'export', reason: 'download-unavailable' }),
    { message: 'ייצוא הגדרות לא זמין כרגע', type: 'error' }
  );
  assert.deepEqual(
    getSettingsBackupActionToast({
      ok: false,
      kind: 'export',
      reason: 'download-unavailable',
      message: 'browser blob download unavailable',
    }),
    { message: 'browser blob download unavailable', type: 'error' }
  );
  assert.deepEqual(getSettingsBackupActionToast({ ok: false, kind: 'import', reason: 'busy' }), {
    message: 'פעולת גיבוי הגדרות אחרת כבר מתבצעת כרגע',
    type: 'info',
  });
  assert.deepEqual(getSettingsBackupActionToast({ ok: false, kind: 'export', reason: 'busy' }), {
    message: 'פעולת גיבוי הגדרות אחרת כבר מתבצעת כרגע',
    type: 'info',
  });
});

test('settings backup feedback reporter emits exactly one toast and stays quiet for cancelled imports', () => {
  const seen: Array<{ message: string; type?: string }> = [];
  const toast = reportSettingsBackupActionResult(
    {
      toast(message: string, type?: string) {
        seen.push({ message, type });
      },
    },
    { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 2 }
  );

  assert.deepEqual(toast, {
    message: 'השחזור הסתיים בהצלחה! (נוספו 1 דגמים ו-2 גוונים)',
    type: 'success',
  });
  assert.deepEqual(seen, [
    {
      message: 'השחזור הסתיים בהצלחה! (נוספו 1 דגמים ו-2 גוונים)',
      type: 'success',
    },
  ]);

  const none = reportSettingsBackupActionResult(
    {
      toast() {
        throw new Error('cancelled import should not show a toast');
      },
    },
    { ok: false, kind: 'import', reason: 'cancelled' }
  );
  assert.equal(none, null);
});

test('settings backup feedback normalizes soft results before creating toasts', () => {
  assert.deepEqual(
    getSettingsBackupActionToast({ ok: true, kind: 'import', modelsAdded: '2.9', colorsAdded: -5 } as any),
    { message: 'השחזור הסתיים בהצלחה! (נוספו 2 דגמים ו-0 גוונים)', type: 'success' }
  );
  assert.deepEqual(
    getSettingsBackupActionToast({ ok: false, kind: 'import', reason: 'invalid_backup' } as any),
    { message: 'שגיאה: הקובץ שנבחר אינו קובץ גיבוי הגדרות מערכת.', type: 'error' }
  );
});
