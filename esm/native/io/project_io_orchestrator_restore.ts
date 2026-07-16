import type { ProjectLoadFailFastFn, ProjectLoadFailFastOpts } from '../../../types/index.js';

import { readAutosaveProjectPayload } from '../runtime/project_io_access.js';
import {
  buildProjectRestoreActionErrorResult,
  normalizeProjectRestoreActionResult,
  type ProjectRestoreActionResult,
} from '../runtime/project_recovery_action_result.js';
import type { ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';

export function createProjectAutosaveRestore(
  deps: ProjectIoOwnerDeps,
  loadProjectDataFailFast: ProjectLoadFailFastFn
) {
  return function restoreAutosaveFailFast(opts?: ProjectLoadFailFastOpts): ProjectRestoreActionResult {
    try {
      const autosavePayload = readAutosaveProjectPayload(deps.App, opts);
      if (!autosavePayload.ok) {
        return normalizeProjectRestoreActionResult(autosavePayload, 'error');
      }

      return normalizeProjectRestoreActionResult(
        loadProjectDataFailFast(autosavePayload.data, autosavePayload.opts),
        'error'
      );
    } catch (error) {
      try {
        deps.reportNonFatal('restoreAutosaveFailFast', error);
      } catch {
        // Diagnostics cannot replace the terminal recovery result.
      }
      return buildProjectRestoreActionErrorResult(error, '[WardrobePro] Restore session load failed.');
    }
  };
}
