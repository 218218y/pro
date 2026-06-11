import type { ProjectIoLoadResultLike } from '../../../types';
import {
  normalizeProjectLoadActionResult,
  normalizeProjectRestoreActionResult,
  type ProjectLoadActionResult,
  type ProjectRestoreActionResult,
} from '../services/api.js';
import { hasQuietActionReason, readActionMessage, readActionReason } from './action_feedback_shared.js';
import {
  emitProjectActionToast,
  type ProjectActionToastLike,
  type ProjectFeedbackLike,
} from './project_action_feedback_shared.js';

export function getProjectLoadToast(
  result: ProjectLoadActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  if (!result) return { message: 'טעינת קובץ נכשלה', type: 'error' };
  const normalized = normalizeProjectLoadActionResult(result, 'error');
  if (normalized.ok === true) {
    return normalized.pending === true ? null : { message: 'הפרויקט נטען בהצלחה!', type: 'success' };
  }
  const failure = normalized;
  const reason = readActionReason(failure.reason);
  const message = readActionMessage(failure.message);
  if (hasQuietActionReason(reason, 'missing-file', 'superseded')) return null;
  if (reason === 'busy') return { message: 'טעינת פרויקט אחרת כבר מתבצעת כרגע', type: 'info' };
  if (reason === 'not-installed') return { message: 'טעינת קובץ לא זמינה כרגע', type: 'error' };
  if (reason === 'invalid') return { message: 'קובץ הפרויקט לא תקין', type: 'error' };
  if (reason === 'error' && message) return { message, type: 'error' };
  return { message: 'טעינת קובץ נכשלה', type: 'error' };
}

export function reportProjectLoadResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectLoadActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return emitProjectActionToast(fb, getProjectLoadToast(result));
}

export function getProjectRestoreToast(
  result: ProjectRestoreActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  if (!result) return { message: 'שחזור העריכה לא זמין כרגע', type: 'error' };
  const normalized = normalizeProjectRestoreActionResult(result, 'error');
  if (normalized.ok === true) {
    return normalized.pending === true ? null : { message: 'העריכה שוחזרה בהצלחה!', type: 'success' };
  }
  const failure = normalized;
  const reason = readActionReason(failure.reason);
  const message = readActionMessage(failure.message);
  if (hasQuietActionReason(reason, 'missing-autosave', 'cancelled', 'superseded')) return null;
  if (reason === 'busy') return { message: 'פעולת פרויקט אחרת כבר מתבצעת כרגע', type: 'info' };
  if (reason === 'not-installed') return { message: 'שחזור העריכה לא זמין כרגע', type: 'error' };
  if (reason === 'invalid') return { message: 'נתוני השחזור לא תקינים', type: 'error' };
  if (reason === 'error' && message) return { message, type: 'error' };
  return { message: 'שחזור העריכה נכשל', type: 'error' };
}

export function reportProjectRestoreResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectRestoreActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return emitProjectActionToast(fb, getProjectRestoreToast(result));
}
