import type { AppContainer } from '../../../types';

import type { ProjectFeedbackLike } from './project_action_feedback.js';
import { reportProjectRestoreResult } from './project_action_feedback.js';
import { buildProjectRestoreActionErrorResult, type ProjectRestoreActionResult } from '../services/api.js';
import { runProjectRecoveryActionResult } from './project_recovery_runtime_shared.js';

export function runProjectRestoreAction(
  App: AppContainer,
  feedback: ProjectFeedbackLike | null | undefined,
  restoreLastSession?: ((app: AppContainer) => Promise<ProjectRestoreActionResult>) | null
): Promise<ProjectRestoreActionResult> {
  return runProjectRecoveryActionResult<ProjectRestoreActionResult>({
    app: App,
    feedback,
    run: restoreLastSession,
    report: reportProjectRestoreResult,
    buildError: buildProjectRestoreActionErrorResult,
    fallbackMessage: 'שחזור העריכה נכשל',
    createNotInstalled: () => ({ ok: false, reason: 'not-installed' }),
    createBusy: () => ({ ok: false, reason: 'busy' }),
    flightKey: 'restore',
  });
}
