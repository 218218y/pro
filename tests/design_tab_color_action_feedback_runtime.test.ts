import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDesignTabColorActionToast,
  reportDesignTabColorActionResult,
} from '../esm/native/ui/react/tabs/design_tab_color_action_feedback.js';

test('getDesignTabColorActionToast maps success and locked-delete failure cleanly', () => {
  assert.deepEqual(
    getDesignTabColorActionToast({ ok: true, kind: 'save-custom-color', id: 'saved_1', name: 'חדש' }),
    { message: 'נשמר גוון חדש', type: 'success' }
  );

  assert.deepEqual(
    getDesignTabColorActionToast({ ok: false, kind: 'delete-color', reason: 'locked', id: 'saved_1' }),
    { message: 'הגוון נעול. שחרר נעילה כדי למחוק.', type: 'warning' }
  );

  assert.equal(
    getDesignTabColorActionToast({ ok: false, kind: 'delete-color', reason: 'cancelled', id: 'saved_1' }),
    null
  );
});

test('reportDesignTabColorActionResult forwards toast exactly once when mapped', () => {
  const calls: Array<{ message: string; kind?: string }> = [];
  const toast = reportDesignTabColorActionResult(
    {
      toast(message, kind) {
        calls.push({ message, kind });
      },
    },
    { ok: false, kind: 'upload-texture', reason: 'read-failed' }
  );

  assert.deepEqual(toast, { message: 'טעינת תמונה נכשלה', type: 'error' });
  assert.deepEqual(calls, [{ message: 'טעינת תמונה נכשלה', kind: 'error' }]);
});

test('getDesignTabColorActionToast preserves real prompt/confirm failure messages', () => {
  assert.deepEqual(
    getDesignTabColorActionToast({
      ok: false,
      kind: 'save-custom-color',
      reason: 'error',
      message: 'prompt exploded',
    }),
    { message: 'prompt exploded', type: 'error' }
  );
  assert.deepEqual(
    getDesignTabColorActionToast({
      ok: false,
      kind: 'delete-color',
      reason: 'error',
      message: 'confirm exploded',
    }),
    { message: 'confirm exploded', type: 'error' }
  );
});

test('getDesignTabColorActionToast preserves upload-texture read failure message', () => {
  assert.deepEqual(
    getDesignTabColorActionToast({
      ok: false,
      kind: 'upload-texture',
      reason: 'read-failed',
      message: 'reader exploded',
    }),
    { message: 'reader exploded', type: 'error' }
  );
});

test('getDesignTabColorActionToast normalizes unavailable texture uploads and unknown delete reasons', () => {
  assert.deepEqual(
    getDesignTabColorActionToast({
      ok: false,
      kind: 'upload-texture',
      reason: 'unsupported',
      message: 'אין file reader',
    } as never),
    { message: 'אין file reader', type: 'error' }
  );
  assert.deepEqual(
    getDesignTabColorActionToast({
      ok: false,
      kind: 'delete-color',
      reason: 'wat',
      message: 'confirm exploded',
    } as never),
    { message: 'confirm exploded', type: 'error' }
  );
});

test('getDesignTabColorActionToast reports busy design color actions as info toasts', () => {
  assert.deepEqual(getDesignTabColorActionToast({ ok: false, kind: 'save-custom-color', reason: 'busy' }), {
    message: 'פעולת גוונים אחרת כבר מתבצעת כרגע',
    type: 'info',
  });
  assert.deepEqual(getDesignTabColorActionToast({ ok: false, kind: 'upload-texture', reason: 'busy' }), {
    message: 'פעולת גוונים אחרת כבר מתבצעת כרגע',
    type: 'info',
  });
});
