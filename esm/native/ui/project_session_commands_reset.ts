import type { AppContainer, ProjectLoadOpts } from '../../../types';

import {
  resetProjectToDefaultActionResult,
  buildProjectResetDefaultActionErrorResult,
  type ProjectResetDefaultActionResult,
} from '../services/api.js';
import {
  PROJECT_RESET_DEFAULT_CONFIRM,
  runProjectSessionConfirmedAction,
} from './project_session_commands_shared.js';

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
    runConfirmed: () =>
      resetProjectToDefaultActionResult(App, {
        ...(opts && typeof opts === 'object' ? opts : {}),
        toast: false,
      }),
  });
}
