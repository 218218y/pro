import type { ProjectLoadInputLike, ProjectLoadOpts } from '../../../types';

import { readAutosavePayloadFromStorageResult } from './autosave_access.js';
import {
  normalizeProjectRestoreActionResult,
  type ProjectRestoreActionResult,
  type ProjectRestoreFailureReason,
} from './project_recovery_action_result.js';
import type { ProjectLoadFailureReason } from './project_load_action_result.js';
import {
  buildAutosaveRestoreLoadOpts,
  buildProjectIoLoadFailureMessage,
  getProjectIoServiceMaybe,
} from './project_io_access_shared.js';
import { loadProjectDataActionResultViaService } from './project_io_access_load.js';

export type ProjectAutosavePayloadReadResult =
  | { ok: true; data: ProjectLoadInputLike; opts: ProjectLoadOpts }
  | { ok: false; reason: 'missing-autosave' | 'invalid' };

export type ProjectAutosavePayloadSuccessResult = Extract<ProjectAutosavePayloadReadResult, { ok: true }>;

export function readAutosaveProjectPayload(
  App: unknown,
  opts?: ProjectLoadOpts,
  missingReason: 'missing-autosave' = 'missing-autosave',
  invalidReason: 'invalid' = 'invalid'
): ProjectAutosavePayloadReadResult {
  const autosavePayload = readAutosavePayloadFromStorageResult(App);
  if (autosavePayload.ok === false) {
    return { ok: false, reason: autosavePayload.reason === 'invalid' ? invalidReason : missingReason };
  }

  return {
    ok: true,
    data: autosavePayload.payload,
    opts: buildAutosaveRestoreLoadOpts(opts),
  };
}

export function restoreProjectAutosavePayloadActionResultViaService(
  App: unknown,
  autosavePayload: ProjectAutosavePayloadSuccessResult,
  fallbackReason: ProjectRestoreFailureReason = 'error',
  loadFallbackReason: ProjectLoadFailureReason = 'not-installed',
  errorFallback = '[WardrobePro] Restore session load failed.'
): ProjectRestoreActionResult {
  return normalizeProjectRestoreActionResult(
    loadProjectDataActionResultViaService(
      App,
      autosavePayload.data,
      autosavePayload.opts,
      loadFallbackReason,
      errorFallback
    ),
    fallbackReason
  );
}

export function restoreProjectSessionActionResultViaService(
  App: unknown,
  opts?: ProjectLoadOpts,
  missingReason: 'missing-autosave' = 'missing-autosave',
  invalidReason: 'invalid' = 'invalid',
  fallbackReason: ProjectRestoreFailureReason = 'error',
  loadFallbackReason: ProjectLoadFailureReason = 'not-installed',
  errorFallback = '[WardrobePro] Restore session load failed.'
): ProjectRestoreActionResult {
  const autosavePayload = readAutosaveProjectPayload(App, opts, missingReason, invalidReason);
  if (!autosavePayload.ok) return normalizeProjectRestoreActionResult(autosavePayload, fallbackReason);
  return restoreProjectAutosavePayloadActionResultViaService(
    App,
    autosavePayload,
    fallbackReason,
    loadFallbackReason,
    errorFallback
  );
}

export function restoreProjectSessionActionResultViaServiceOrThrow(
  App: unknown,
  opts?: ProjectLoadOpts,
  missingReason: 'missing-autosave' = 'missing-autosave',
  invalidReason: 'invalid' = 'invalid',
  fallbackReason: ProjectRestoreFailureReason = 'error',
  loadFallbackReason: ProjectLoadFailureReason = 'not-installed',
  errorFallback = '[WardrobePro] Restore session load failed.',
  label = 'projectIO.restoreLastSession'
): ProjectRestoreActionResult {
  const result = restoreProjectSessionActionResultViaService(
    App,
    opts,
    missingReason,
    invalidReason,
    fallbackReason,
    loadFallbackReason,
    errorFallback
  );
  if (result.ok && result.pending !== true) return result;
  throw new Error(buildProjectIoLoadFailureMessage(result, label, errorFallback));
}

export function restoreProjectSessionViaService(App: unknown): unknown {
  try {
    const svc = getProjectIoServiceMaybe(App);
    if (svc && typeof svc.restoreLastSession === 'function') return svc.restoreLastSession();
    return restoreProjectSessionActionResultViaService(App);
  } catch {
    return undefined;
  }
}
