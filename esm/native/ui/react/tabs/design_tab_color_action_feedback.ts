import type { UiFeedbackToastKind } from '../../../../../types';

import type { DesignTabFeedbackApi } from './design_tab_shared.js';
import type {
  DesignTabColorActionFailureResult,
  DesignTabColorActionResult,
} from './design_tab_color_action_result.js';
import { normalizeDesignTabColorActionResult } from './design_tab_color_action_result.js';
import { readDesignTabColorActionMessage } from './design_tab_color_action_result_helpers.js';

export type DesignTabColorActionToast = {
  message: string;
  type: UiFeedbackToastKind;
};

function readFailureMessage(result: DesignTabColorActionFailureResult | null | undefined): string {
  return readDesignTabColorActionMessage(result) || '';
}

function getDesignTabColorFailureToast(
  result: DesignTabColorActionFailureResult
): DesignTabColorActionToast | null {
  const { kind, reason } = result;
  const message = readFailureMessage(result);
  if (reason === 'cancelled') return null;

  switch (kind) {
    case 'toggle-lock':
      if (reason === 'missing-selection') return { message: 'בחר גוון כדי לנעול/לשחרר', type: 'warning' };
      if (reason === 'missing') return { message: 'הגוון לא נמצא', type: 'error' };
      if (reason === 'error' && message) return { message, type: 'error' };
      return { message: 'שינוי נעילה נכשל', type: 'error' };
    case 'delete-color':
      if (reason === 'busy') return { message: 'פעולת גוונים אחרת כבר מתבצעת כרגע', type: 'info' };
      if (reason === 'missing-selection') return { message: 'בחר גוון למחיקה', type: 'warning' };
      if (reason === 'missing') return { message: 'הגוון לא נמצא', type: 'error' };
      if (reason === 'locked') return { message: 'הגוון נעול. שחרר נעילה כדי למחוק.', type: 'warning' };
      if (reason === 'error' && message) return { message, type: 'error' };
      return { message: 'מחיקת גוון נכשלה', type: 'error' };
    case 'upload-texture':
      if (reason === 'busy') return { message: 'פעולת גוונים אחרת כבר מתבצעת כרגע', type: 'info' };
      if (reason === 'missing-file') return { message: 'לא נבחר קובץ', type: 'info' };
      if (reason === 'unavailable') {
        return { message: message || 'טעינת תמונה לא זמינה כרגע', type: 'error' };
      }
      if (message) return { message, type: 'error' };
      return { message: 'טעינת תמונה נכשלה', type: 'error' };
    case 'save-custom-color':
      if (reason === 'busy') return { message: 'פעולת גוונים אחרת כבר מתבצעת כרגע', type: 'info' };
      if (reason === 'missing-input') return { message: 'בחר צבע או העלה טקסטורה כדי לשמור', type: 'info' };
      if (reason === 'error' && message) return { message, type: 'error' };
      return { message: 'שמירת גוון נכשלה', type: 'error' };
    default:
      return { message: 'פעולת הגוונים נכשלה', type: 'error' };
  }
}

export function getDesignTabColorActionToast(
  result: DesignTabColorActionResult | null | undefined
): DesignTabColorActionToast | null {
  const normalized = normalizeDesignTabColorActionResult(result);
  if (!normalized) return null;

  if (normalized.ok === false) return getDesignTabColorFailureToast(normalized);

  switch (normalized.kind) {
    case 'reorder-swatches':
      return { message: 'סדר הצבעים עודכן', type: 'success' };
    case 'toggle-lock':
      return { message: normalized.locked ? 'הגוון ננעל' : 'הנעילה בוטלה', type: 'success' };
    case 'delete-color':
      return { message: 'הגוון נמחק', type: 'success' };
    case 'upload-texture':
      return { message: 'תמונה נטענה!', type: 'success' };
    case 'save-custom-color':
      return { message: 'נשמר גוון חדש', type: 'success' };
    case 'remove-texture':
      return null;
    default:
      return null;
  }
}

export function reportDesignTabColorActionResult(
  feedback: Pick<DesignTabFeedbackApi, 'toast'>,
  result: DesignTabColorActionResult | null | undefined
): DesignTabColorActionToast | null {
  const toast = getDesignTabColorActionToast(result);
  if (toast && typeof feedback.toast === 'function') feedback.toast(toast.message, toast.type);
  return toast;
}
