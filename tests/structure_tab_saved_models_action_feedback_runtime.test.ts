import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSavedModelsActionToast,
  reportSavedModelsActionResult,
} from '../esm/native/ui/react/tabs/structure_tab_saved_models_action_feedback.ts';

test('saved-model feedback maps key command outcomes to stable user-facing toasts', () => {
  assert.deepEqual(getSavedModelsActionToast({ ok: true, kind: 'apply', name: 'דגם זהב' }), {
    message: 'הדגם "דגם זהב" נטען בהצלחה',
    type: 'success',
  });
  assert.deepEqual(getSavedModelsActionToast({ ok: false, kind: 'save', reason: 'duplicate-locked' }), {
    message: 'כבר קיים דגם בשם זה והוא נעול. בטל נעילה כדי לעדכן.',
    type: 'warning',
  });
  assert.deepEqual(getSavedModelsActionToast({ ok: true, kind: 'reorder', listType: 'preset' }), {
    message: 'סדר הדגמים המובנים עודכן',
    type: 'success',
  });
  assert.deepEqual(getSavedModelsActionToast({ ok: false, kind: 'move', reason: 'overPreset' }), {
    message: 'לא ניתן להזיז דגם שמור מעל הדגמים המובנים',
    type: 'info',
  });
  assert.equal(getSavedModelsActionToast({ ok: false, kind: 'delete', reason: 'cancelled' }), null);
  assert.equal(getSavedModelsActionToast({ ok: false, kind: 'apply', reason: 'superseded' }), null);
  assert.deepEqual(getSavedModelsActionToast({ ok: false, kind: 'save', reason: 'busy' }), {
    message: 'פעולת דגמים אחרת כבר מתבצעת כרגע',
    type: 'info',
  });
});

test('saved-model feedback reporter emits exactly one toast for actionable outcomes', () => {
  const seen: Array<{ message: string; type?: string }> = [];
  const toast = reportSavedModelsActionResult(
    {
      toast(message: string, type?: string) {
        seen.push({ message, type });
      },
    } as any,
    { ok: false, kind: 'overwrite', reason: 'locked' }
  );

  assert.deepEqual(toast, {
    message: 'הדגם נעול. בטל נעילה כדי לעדכן.',
    type: 'warning',
  });
  assert.deepEqual(seen, [{ message: 'הדגם נעול. בטל נעילה כדי לעדכן.', type: 'warning' }]);

  const superseded = reportSavedModelsActionResult(
    {
      toast() {
        throw new Error('toast should not run for superseded result');
      },
    } as any,
    { ok: false, kind: 'apply', reason: 'superseded' }
  );
  assert.equal(superseded, null);

  const none = reportSavedModelsActionResult(
    {
      toast() {
        throw new Error('toast should not run for cancelled result');
      },
    } as any,
    { ok: false, kind: 'delete', reason: 'cancelled' }
  );
  assert.equal(none, null);
});

test('saved-model feedback prefers preserved apply error messages over generic fallback text', () => {
  assert.deepEqual(
    getSavedModelsActionToast({
      ok: false,
      kind: 'apply',
      reason: 'error',
      message: 'snapshot apply failed',
    }),
    { message: 'snapshot apply failed', type: 'error' }
  );
});

test('saved-model action feedback prefers explicit error messages for confirm-backed failures', () => {
  assert.deepEqual(
    getSavedModelsActionToast({
      ok: false,
      kind: 'overwrite',
      reason: 'error',
      message: 'confirm exploded',
    } as any),
    { message: 'confirm exploded', type: 'error' }
  );
  assert.deepEqual(
    getSavedModelsActionToast({
      ok: false,
      kind: 'delete',
      reason: 'error',
      message: 'confirm exploded',
    } as any),
    { message: 'confirm exploded', type: 'error' }
  );
});
