import type { AppContainer } from '../../../types';

import {
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
} from '../services/api.js';
import {
  buildProjectRestoreActionErrorResult,
  normalizeProjectRestoreActionResult,
  type ProjectRestoreActionResult,
} from '../services/api.js';
import {
  PROJECT_RESTORE_SESSION_CONFIRM,
  runProjectSessionConfirmedAction,
} from './project_session_commands_shared.js';

export async function restoreProjectSessionWithConfirm(
  App: AppContainer
): Promise<ProjectRestoreActionResult> {
  const autosavePayload = readAutosaveProjectPayload(App);
  if (autosavePayload.ok === false) return normalizeProjectRestoreActionResult(autosavePayload, 'error');

  return await runProjectSessionConfirmedAction<ProjectRestoreActionResult>({
    app: App,
    key: 'restore',
    copy: PROJECT_RESTORE_SESSION_CONFIRM,
    buildError: buildProjectRestoreActionErrorResult,
    onCancelled: () => ({ ok: false, reason: 'cancelled' }),
    onBusy: () => ({ ok: false, reason: 'busy' }),
    runConfirmed: () =>
      restoreProjectAutosavePayloadActionResultViaService(
        App,
        autosavePayload,
        'error',
        'not-installed',
        '[WardrobePro] Restore session load failed.'
      ),
  });
}
