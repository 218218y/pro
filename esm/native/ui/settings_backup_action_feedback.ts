import type {
  SettingsBackupActionResult,
  SettingsBackupFailureResult,
  SettingsBackupImportFailureResult,
} from './settings_backup_contracts.js';
import { normalizeSettingsBackupActionResult } from './settings_backup_action_result.js';

export type SettingsBackupToastInfo = {
  message: string;
  type: 'success' | 'error' | 'info';
};

export type SettingsBackupFeedbackLike = {
  toast?: ((message: string, kind?: string) => void) | null;
};

function readFailureMessage(result: SettingsBackupFailureResult): string {
  return typeof result.message === 'string' ? result.message.trim() : '';
}

function getImportFailureToast(result: SettingsBackupImportFailureResult): SettingsBackupToastInfo | null {
  const message = readFailureMessage(result);
  switch (result.reason) {
    case 'cancelled':
      return null;
    case 'invalid-json':
      return { message: 'שחזור נכשל: הקובץ אינו JSON תקין', type: 'error' };
    case 'invalid-backup':
      return { message: 'שגיאה: הקובץ שנבחר אינו קובץ גיבוי הגדרות מערכת.', type: 'error' };
    case 'read-failed':
      return { message: message || 'קריאת קובץ הגיבוי נכשלה', type: 'error' };
    case 'models-unavailable':
      return { message: 'שחזור נכשל: מסלול ייבוא הדגמים אינו זמין כרגע', type: 'error' };
    case 'busy':
      return { message: 'פעולת גיבוי הגדרות אחרת כבר מתבצעת כרגע', type: 'info' };
    default:
      return { message: message || 'ייבוא הגדרות נכשל', type: 'error' };
  }
}

export function getSettingsBackupActionToast(
  result: SettingsBackupActionResult | null | undefined
): SettingsBackupToastInfo | null {
  if (!result) return null;
  const normalized = normalizeSettingsBackupActionResult(
    result,
    result.kind === 'import' ? 'import' : 'export'
  );

  if (normalized.ok === true) {
    if (normalized.kind === 'export') {
      return {
        message: `נוצר קובץ גיבוי (${normalized.modelsCount} דגמים, ${normalized.colorsCount} גוונים)`,
        type: 'success',
      };
    }
    return {
      message: `השחזור הסתיים בהצלחה! (נוספו ${normalized.modelsAdded} דגמים ו-${normalized.colorsAdded} גוונים)`,
      type: 'success',
    };
  }

  const failure = normalized;
  if (failure.kind === 'import') return getImportFailureToast(failure);

  const message = readFailureMessage(failure);
  switch (failure.reason) {
    case 'download-unavailable':
      return { message: message || 'ייצוא הגדרות לא זמין כרגע', type: 'error' };
    case 'busy':
      return { message: 'פעולת גיבוי הגדרות אחרת כבר מתבצעת כרגע', type: 'info' };
    default:
      return { message: message || 'ייצוא הגדרות נכשל', type: 'error' };
  }
}

export function reportSettingsBackupActionResult(
  fb: SettingsBackupFeedbackLike | null | undefined,
  result: SettingsBackupActionResult | null | undefined
): SettingsBackupToastInfo | null {
  const toast = getSettingsBackupActionToast(result);
  if (toast && fb && typeof fb.toast === 'function') fb.toast(toast.message, toast.type);
  return toast;
}
