import {
  readAutosaveProjectPayload,
  restoreProjectAutosavePayloadActionResultViaService,
} from '../runtime/project_io_access.js';
import {
  buildProjectRecoverySuccessResult,
  buildProjectRestoreFailureResult,
  type ProjectRestoreActionResult,
} from '../runtime/project_recovery_action_result.js';
import { readProjectRestoreToastMessage, type ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';

export function createProjectSessionRestore(deps: ProjectIoOwnerDeps) {
  const { App, showToast } = deps;

  return function restoreLastSession(): ProjectRestoreActionResult {
    const autosavePayload = readAutosaveProjectPayload(App);
    if (autosavePayload.ok === false) {
      if (autosavePayload.reason === 'missing-autosave') {
        showToast('לא נמצאה היסטוריה לשחזור', 'error');
        return buildProjectRestoreFailureResult('missing-autosave');
      }

      showToast('נתוני השחזור לא תקינים', 'error');
      return buildProjectRestoreFailureResult('invalid');
    }

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
        if (restoreResult.ok) {
          if (restoreResult.pending !== true) showToast('העריכה שוחזרה בהצלחה!', 'success');
          return;
        }

        const toastMessage = readProjectRestoreToastMessage(restoreResult);
        if (toastMessage) showToast(toastMessage, 'error');
      }
    );

    return buildProjectRecoverySuccessResult({ pending: true });
  };
}
