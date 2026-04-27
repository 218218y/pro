import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyOrderPdfOverlayDraftActionToast,
  getOrderPdfOverlayDraftActionToast,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_draft_action_feedback.js';
import type { InlineDetailsConfirmState } from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.js';

const inlineConfirm: InlineDetailsConfirmState = {
  open: true,
  title: 'עדכון',
  message: 'message',
  preview: 'preview',
  nextOk: null,
  nextCancel: null,
  toastOk: { text: 'שמרתי את השילוב', kind: 'success' },
};

test('getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error', () => {
  assert.deepEqual(
    getOrderPdfOverlayDraftActionToast({ ok: false, kind: 'initial-load', reason: 'not-ready' }),
    { message: 'עורך PDF לא נטען (חסר API)', kind: 'error' }
  );
});

test('getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess', () => {
  assert.equal(
    getOrderPdfOverlayDraftActionToast({ ok: true, kind: 'refresh-auto', confirm: inlineConfirm }),
    null
  );
});

test('getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text', () => {
  assert.deepEqual(
    getOrderPdfOverlayDraftActionToast({ ok: true, kind: 'confirm-inline-ok', next: null }, inlineConfirm),
    { message: 'שמרתי את השילוב', kind: 'success' }
  );
});

test('applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists', () => {
  const calls: Array<{ message: string; kind: string }> = [];
  const toast = applyOrderPdfOverlayDraftActionToast({
    fb: { toast: (message, kind) => calls.push({ message, kind }) },
    result: { ok: true, kind: 'confirm-inline-cancel', next: null },
    inlineConfirm: {
      open: true,
      title: 'עדכון',
      message: 'message',
      preview: 'preview',
      nextOk: null,
      nextCancel: null,
    },
  });

  assert.deepEqual(toast, { message: 'בוטל', kind: 'info' });
  assert.deepEqual(calls, [{ message: 'בוטל', kind: 'info' }]);
});
