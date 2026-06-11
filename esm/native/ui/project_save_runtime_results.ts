import type { ProjectExportResultLike } from '../../../types';

import type { BrowserFileDownloadResult } from './browser_file_download.js';
import { reportProjectSaveResult, type ProjectSaveActionResult } from './project_action_feedback.js';
import type { ProjectSaveRuntimeToastFn } from './project_save_runtime_contracts.js';
import type { ProjectExportAccessResult, ProjectSaveFailureReason } from '../services/api.js';

export function buildProjectSaveFailureResult(
  reason: ProjectSaveFailureReason,
  message?: string
): ProjectSaveActionResult {
  const trimmedMessage = typeof message === 'string' && message.trim() ? message.trim() : undefined;
  return trimmedMessage ? { ok: false, reason, message: trimmedMessage } : { ok: false, reason };
}

export function buildProjectSaveExportFailureResult(
  result: Extract<ProjectExportAccessResult, { ok: false }>
): ProjectSaveActionResult {
  if (result.reason === 'not-installed' || result.reason === 'invalid') {
    return buildProjectSaveFailureResult(
      result.reason,
      result.message || 'שמירה לא זמינה כרגע (exportCurrentProject)'
    );
  }
  return buildProjectSaveFailureResult('error', result.message);
}

export function buildProjectSaveDownloadFailureResult(
  result: Extract<BrowserFileDownloadResult, { ok: false }>
): ProjectSaveActionResult {
  return buildProjectSaveFailureResult(result.reason, result.message);
}

export function buildProjectSaveDefaultName(exported: ProjectExportResultLike): string {
  return (
    (typeof exported.defaultBaseName === 'string' ? exported.defaultBaseName.trim() : '') ||
    'wardrobe_project_' + new Date().toISOString().slice(0, 10)
  );
}

export function reportSaveResultWithToast(
  toast: ProjectSaveRuntimeToastFn,
  result: ProjectSaveActionResult
): ProjectSaveActionResult {
  reportProjectSaveResult({ toast }, result);
  return result;
}

export function scheduleSaveResultToast(
  toast: ProjectSaveRuntimeToastFn,
  result: ProjectSaveActionResult
): void {
  try {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        reportProjectSaveResult({ toast }, result);
      });
      return;
    }
  } catch {
    // fall through to immediate reporting
  }
  reportProjectSaveResult({ toast }, result);
}
