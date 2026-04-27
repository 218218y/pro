import type { ProjectIoLoadResultLike } from '../../../types';
import {
  normalizeProjectResetDefaultActionResult,
  type ProjectResetDefaultActionResult,
  type ProjectSaveActionResult,
} from '../services/api.js';
import { hasQuietActionReason, readActionMessage, readActionReason } from './action_feedback_shared.js';
import {
  emitProjectActionToast,
  type ProjectActionToastLike,
  type ProjectFeedbackLike,
} from './project_action_feedback_shared.js';

export function getProjectSaveToast(
  result: ProjectSaveActionResult | null | undefined
): ProjectActionToastLike | null {
  if (!result) return { message: 'שמירת פרויקט נכשלה', type: 'error' };
  if (result.ok === true) {
    return result.pending === true ? null : { message: 'הפרויקט נשמר בהצלחה!', type: 'success' };
  }
  const failure = result;
  const reason = failure.reason;
  const message = typeof failure.message === 'string' ? failure.message.trim() : '';
  if (reason === 'cancelled' || reason === 'superseded') return null;
  if (reason === 'busy') return { message: 'פעולת פרויקט אחרת כבר מתבצעת כרגע', type: 'info' };
  if (reason === 'download-unavailable') {
    return { message: message || 'הדפדפן לא זמין לשמירה', type: 'error' };
  }
  if (reason === 'not-installed') return { message: 'שמירת פרויקט לא זמינה כרגע', type: 'error' };
  if (message) return { message, type: 'error' };
  return { message: 'שמירת פרויקט נכשלה', type: 'error' };
}

export function reportProjectSaveResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectSaveActionResult | null | undefined
): ProjectActionToastLike | null {
  return emitProjectActionToast(fb, getProjectSaveToast(result));
}

export function getResetDefaultToast(
  result: ProjectResetDefaultActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  if (!result) return { message: 'האיפוס נכשל', type: 'error' };
  const normalized = normalizeProjectResetDefaultActionResult(result, 'error');
  if (normalized.ok === true) return { message: 'הארון אופס לברירת המחדל', type: 'success' };
  const failure = normalized;
  const reason = readActionReason(failure.reason);
  const message = readActionMessage(failure.message);
  if (hasQuietActionReason(reason, 'cancelled', 'superseded')) return null;
  if (reason === 'busy') return { message: 'פעולת פרויקט אחרת כבר מתבצעת כרגע', type: 'info' };
  if (reason === 'not-installed') return { message: 'איפוס לא זמין כרגע', type: 'error' };
  if (reason === 'invalid') return { message: 'האיפוס נכשל (ברירת המחדל לא תקינה)', type: 'error' };
  if (reason === 'error' && message) return { message, type: 'error' };
  return { message: 'האיפוס נכשל', type: 'error' };
}

export function reportResetDefaultResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectResetDefaultActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return emitProjectActionToast(fb, getResetDefaultToast(result));
}
