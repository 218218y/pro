import type { AppContainer, ProjectLoadOpts } from '../../../types';

import {
  resetProjectToDefaultActionResult,
  buildProjectResetDefaultActionErrorResult,
  getCloudSyncServiceMaybe,
  type ProjectResetDefaultActionResult,
} from '../services/api.js';
import {
  PROJECT_RESET_DEFAULT_CONFIRM,
  runProjectSessionConfirmedAction,
} from './project_session_commands_shared.js';

async function resetProjectAndClearCloudSketch(
  App: AppContainer,
  opts?: ProjectLoadOpts | null
): Promise<ProjectResetDefaultActionResult> {
  const resetResult = resetProjectToDefaultActionResult(App, {
    ...(opts && typeof opts === 'object' ? opts : {}),
    toast: false,
  });
  if (!resetResult.ok) return resetResult;

  const cloudSync = getCloudSyncServiceMaybe(App);
  if (!cloudSync || typeof cloudSync.syncSketchNow !== 'function') return resetResult;

  const clearResult = await cloudSync.syncSketchNow({ mode: 'clear' });
  if (clearResult.ok === true) return resetResult;
  const suffix =
    clearResult.reason === 'busy'
      ? 'פעולת סנכרון אחרת כבר מתבצעת.'
      : clearResult.reason === 'error' &&
          typeof clearResult.message === 'string' &&
          clearResult.message.trim()
        ? clearResult.message.trim()
        : 'נסה שוב.';
  return {
    ok: false,
    reason: 'error',
    message: `הארון אופס, אך ניקוי סנכרון הסקיצה נכשל. ${suffix}`,
  };
}

export async function resetProjectToDefaultWithConfirm(
  App: AppContainer,
  opts?: ProjectLoadOpts | null
): Promise<ProjectResetDefaultActionResult> {
  return await runProjectSessionConfirmedAction<ProjectResetDefaultActionResult>({
    app: App,
    key: 'reset',
    copy: PROJECT_RESET_DEFAULT_CONFIRM,
    buildError: buildProjectResetDefaultActionErrorResult,
    onCancelled: () => ({ ok: false, reason: 'cancelled' }),
    onBusy: () => ({ ok: false, reason: 'busy' }),
    runConfirmed: () => resetProjectAndClearCloudSketch(App, opts),
  });
}
