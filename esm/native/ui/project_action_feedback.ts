import type { ProjectIoLoadResultLike } from '../../../types';
import type {
  ProjectLoadActionResult,
  ProjectResetDefaultActionResult,
  ProjectRestoreActionResult,
  ProjectSaveActionResult,
} from '../services/api.js';
import {
  buildProjectActionErrorResult as buildProjectActionErrorResultImpl,
  type ProjectActionErrorResult,
  type ProjectActionToastLike,
  type ProjectFeedbackLike,
  type ToastLevel,
} from './project_action_feedback_shared.js';
import {
  getProjectLoadToast as getProjectLoadToastImpl,
  getProjectRestoreToast as getProjectRestoreToastImpl,
  reportProjectLoadResult as reportProjectLoadResultImpl,
  reportProjectRestoreResult as reportProjectRestoreResultImpl,
} from './project_action_feedback_load_restore.js';
import {
  getProjectSaveToast as getProjectSaveToastImpl,
  getResetDefaultToast as getResetDefaultToastImpl,
  reportProjectSaveResult as reportProjectSaveResultImpl,
  reportResetDefaultResult as reportResetDefaultResultImpl,
} from './project_action_feedback_save_reset.js';

export type { ToastLevel, ProjectActionToastLike, ProjectFeedbackLike, ProjectSaveActionResult };

export function buildProjectActionErrorResult(
  error: unknown,
  fallbackMessage: string
): ProjectActionErrorResult {
  return buildProjectActionErrorResultImpl(error, fallbackMessage);
}

export function getProjectLoadToast(
  result: ProjectLoadActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return getProjectLoadToastImpl(result);
}

export function reportProjectLoadResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectLoadActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return reportProjectLoadResultImpl(fb, result);
}

export function getProjectRestoreToast(
  result: ProjectRestoreActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return getProjectRestoreToastImpl(result);
}

export function reportProjectRestoreResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectRestoreActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return reportProjectRestoreResultImpl(fb, result);
}

export function getProjectSaveToast(
  result: ProjectSaveActionResult | null | undefined
): ProjectActionToastLike | null {
  return getProjectSaveToastImpl(result);
}

export function reportProjectSaveResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectSaveActionResult | null | undefined
): ProjectActionToastLike | null {
  return reportProjectSaveResultImpl(fb, result);
}

export function getResetDefaultToast(
  result: ProjectResetDefaultActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return getResetDefaultToastImpl(result);
}

export function reportResetDefaultResult(
  fb: ProjectFeedbackLike | null | undefined,
  result: ProjectResetDefaultActionResult | ProjectIoLoadResultLike | null | undefined
): ProjectActionToastLike | null {
  return reportResetDefaultResultImpl(fb, result);
}
