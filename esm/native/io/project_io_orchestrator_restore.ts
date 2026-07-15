import {
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
} from '../runtime/project_io_access.js';
import {
  buildProjectRestoreActionErrorResult,
  buildProjectRestoreFailureResult,
  type ProjectRestoreActionResult,
} from '../runtime/project_recovery_action_result.js';
import { readProjectRestoreToastMessage, type ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';

export function createProjectSessionRestore(deps: ProjectIoOwnerDeps) {
  const { App, showToast } = deps;

  return async function restoreLastSession(): Promise<ProjectRestoreActionResult> {
    const autosavePayload = readAutosaveProjectPayload(App);
    if (autosavePayload.ok === false) {
      if (autosavePayload.reason === 'missing-autosave') {
        showToast('לא נמצאה היסטוריה לשחזור', 'error');
        return buildProjectRestoreFailureResult('missing-autosave');
      }

      showToast('נתוני השחזור לא תקינים', 'error');
      return buildProjectRestoreFailureResult('invalid');
    }

    return await new Promise<ProjectRestoreActionResult>(resolve => {
      let settled = false;
      const settle = (result: ProjectRestoreActionResult): void => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      try {
        deps.openCustomConfirm(
          'שחזור עריכה',
          'האם לטעון את העריכה האחרונה שנשמרה בזיכרון? (העריכה הנוכחית תוחלף)',
          () => {
            const restoreResult = restoreProjectAutosavePayloadActionResultViaService(
              App,
              autosavePayload,
              'error',
              'not-installed',
              '[WardrobePro] Restore session load failed.'
            );
            const toastMessage = readProjectRestoreToastMessage(restoreResult);
            if (toastMessage) showToast(toastMessage, restoreResult.ok ? 'success' : 'error');
            settle(restoreResult);
          },
          () => settle(buildProjectRestoreFailureResult('cancelled'))
        );
      } catch (error) {
        settle(buildProjectRestoreActionErrorResult(error, '[WardrobePro] Restore confirmation failed.'));
      }
    });
  };
}
