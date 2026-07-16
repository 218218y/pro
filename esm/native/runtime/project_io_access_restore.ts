import type { ProjectLoadFailFastOpts, ProjectLoadInputLike, ProjectLoadOpts } from '../../../types';

import { readAutosavePayloadFromStorageResult } from './autosave_access.js';
import {
  buildProjectRestoreActionErrorResult,
  normalizeProjectRestoreActionResult,
  type ProjectRestoreActionResult,
} from './project_recovery_action_result.js';
import {
  buildAutosaveRestoreLoadOpts,
  getProjectIoServiceMaybe,
  reportProjectIoAccessNonFatal,
} from './project_io_access_shared.js';

export type ProjectAutosavePayloadReadResult =
  | { ok: true; data: ProjectLoadInputLike; opts: ProjectLoadFailFastOpts }
  | { ok: false; reason: 'missing-autosave' | 'invalid' };

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

export function restoreProjectAutosaveFailFastResultViaService(
  App: unknown,
  opts?: ProjectLoadFailFastOpts,
  defaultErrorMessage = '[WardrobePro] Restore session load failed.'
): ProjectRestoreActionResult {
  const service = getProjectIoServiceMaybe(App);
  const restoreAutosaveFailFast =
    service && typeof service.restoreAutosaveFailFast === 'function' ? service.restoreAutosaveFailFast : null;
  if (!restoreAutosaveFailFast) return { ok: false, reason: 'not-installed' };

  try {
    return normalizeProjectRestoreActionResult(
      restoreAutosaveFailFast({ ...opts, queueIfBusy: false }),
      'error'
    );
  } catch (error) {
    try {
      reportProjectIoAccessNonFatal(App, 'projectIO.restoreAutosaveFailFast.ownerRejected', error);
    } catch {
      // Diagnostics cannot replace the terminal recovery result.
    }
    return buildProjectRestoreActionErrorResult(error, defaultErrorMessage);
  }
}
