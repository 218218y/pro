import type { AppContainer } from '../../../types';

import type { ProjectFeedbackLike } from './project_action_feedback.js';
import { reportResetDefaultResult } from './project_action_feedback.js';
import {
  buildProjectResetDefaultActionErrorResult,
  type ProjectResetDefaultActionResult,
} from '../services/api.js';
import { runProjectRecoveryActionResult } from './project_recovery_runtime_shared.js';

export function runProjectResetDefaultAction(
  App: AppContainer,
  feedback: ProjectFeedbackLike | null | undefined,
  resetToDefaultProject?: ((app: AppContainer) => Promise<ProjectResetDefaultActionResult>) | null
): Promise<ProjectResetDefaultActionResult> {
  return runProjectRecoveryActionResult<ProjectResetDefaultActionResult>({
    app: App,
    feedback,
    run: resetToDefaultProject,
    report: reportResetDefaultResult,
    buildError: buildProjectResetDefaultActionErrorResult,
    fallbackMessage: 'האיפוס נכשל',
    createNotInstalled: () => ({ ok: false, reason: 'not-installed' }),
    createBusy: () => ({ ok: false, reason: 'busy' }),
    flightKey: 'reset',
  });
}
