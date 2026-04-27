import type {
  InlineDetailsConfirmState,
  OrderPdfOverlayDraftActionResult,
} from './order_pdf_overlay_contracts.js';
import type { ToastLevel } from './order_pdf_overlay_controller_shared.js';

export type OrderPdfOverlayDraftActionToast = {
  message: string;
  kind: ToastLevel;
};

function fallbackInlineConfirmToast(
  inlineConfirm: InlineDetailsConfirmState | null | undefined,
  mode: 'ok' | 'cancel',
  hasNext: boolean
): OrderPdfOverlayDraftActionToast {
  const configured = mode === 'ok' ? inlineConfirm?.toastOk : inlineConfirm?.toastCancel;
  if (configured?.text) {
    return {
      message: configured.text,
      kind: configured.kind || 'success',
    };
  }
  if (hasNext) {
    return { message: 'עודכן מהפרויקט', kind: 'success' };
  }
  return { message: 'בוטל', kind: 'info' };
}

function withDetail(base: string, detail?: string): string {
  const suffix = String(detail || '').trim();
  return suffix ? `${base}: ${suffix}` : base;
}

export function getOrderPdfOverlayDraftActionToast(
  result: OrderPdfOverlayDraftActionResult,
  inlineConfirm?: InlineDetailsConfirmState | null | undefined
): OrderPdfOverlayDraftActionToast | null {
  switch (result.kind) {
    case 'initial-load':
      if (result.ok) return null;
      if (result.reason === 'not-ready') return { message: 'עורך PDF לא נטען (חסר API)', kind: 'error' };
      return { message: withDetail('טעינת טיוטת PDF נכשלה', result.detail), kind: 'error' };
    case 'refresh-auto':
      if (!result.ok) {
        if (result.reason === 'not-ready') return { message: 'עדכון אוטומטי לא זמין כרגע', kind: 'error' };
        return { message: withDetail('עדכון מהפרויקט נכשל', result.detail), kind: 'error' };
      }
      if (result.confirm) return null;
      return { message: 'עודכן מהפרויקט', kind: 'success' };
    case 'confirm-inline-ok':
      if (!result.ok && result.reason === 'cancelled') return null;
      return fallbackInlineConfirmToast(inlineConfirm, 'ok', !!result.next);
    case 'confirm-inline-cancel':
      if (!result.ok && result.reason === 'cancelled') return null;
      return fallbackInlineConfirmToast(inlineConfirm, 'cancel', !!result.next);
    default:
      return null;
  }
}

export function applyOrderPdfOverlayDraftActionToast(args: {
  fb: { toast?: ((message: string, kind: ToastLevel) => void) | null | undefined };
  result: OrderPdfOverlayDraftActionResult;
  inlineConfirm?: InlineDetailsConfirmState | null | undefined;
}): OrderPdfOverlayDraftActionToast | null {
  const { fb, result, inlineConfirm } = args;
  const toast = getOrderPdfOverlayDraftActionToast(result, inlineConfirm);
  if (toast && typeof fb.toast === 'function') fb.toast(toast.message, toast.kind);
  return toast;
}
