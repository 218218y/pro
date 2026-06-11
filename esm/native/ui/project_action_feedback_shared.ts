import type { ProjectLoadFailureResult, ProjectSaveActionResult } from '../services/api.js';
import { buildProjectLoadActionErrorResult } from '../services/api.js';

export type ToastLevel = 'success' | 'error' | 'warning' | 'info';

export type ProjectActionToastLike = {
  message: string;
  type: ToastLevel;
};

export type ProjectFeedbackLike = {
  toast?: ((message: string, type?: ToastLevel) => void) | null;
};

export type ProjectActionErrorResult = ProjectLoadFailureResult & {
  ok: false;
  reason: 'error';
  message: string;
};

export type { ProjectSaveActionResult };

export function buildProjectActionErrorResult(
  error: unknown,
  fallbackMessage: string
): ProjectActionErrorResult {
  return buildProjectLoadActionErrorResult(error, fallbackMessage);
}

export function emitProjectActionToast(
  fb: ProjectFeedbackLike | null | undefined,
  toast: ProjectActionToastLike | null
): ProjectActionToastLike | null {
  if (toast && fb && typeof fb.toast === 'function') fb.toast(toast.message, toast.type);
  return toast;
}
