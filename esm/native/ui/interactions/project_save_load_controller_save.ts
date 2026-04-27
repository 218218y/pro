import type { AppContainer } from '../../../../types';

import { buildProjectSaveActionErrorResult, normalizeProjectSaveActionResult } from '../../services/api.js';
import { reportProjectSaveResult, type ProjectSaveActionResult } from '../project_action_feedback.js';
import { executeProjectActionResult } from '../project_action_execution.js';
import { runEnsureSaveProjectAction, type ProjectSaveRuntimeDeps } from '../project_save_runtime.js';
import type {
  CreateProjectSaveLoadInteractionActions,
  ProjectSaveLoadToastFn,
} from './project_save_load_controller_shared.js';

export function ensureProjectSaveLoadAction(
  App: AppContainer,
  deps: ProjectSaveRuntimeDeps,
  actions: Pick<CreateProjectSaveLoadInteractionActions, 'getSaveProjectAction' | 'setSaveProjectAction'>
): void {
  if (!App || typeof App !== 'object') return;
  if (typeof actions.getSaveProjectAction(App) === 'function') return;
  const saveProject = runEnsureSaveProjectAction(App, deps);
  if (typeof saveProject === 'function') actions.setSaveProjectAction(App, saveProject);
}

export function performProjectSaveLoadSave(
  App: AppContainer,
  toast: ProjectSaveLoadToastFn | null | undefined,
  actions: Pick<
    CreateProjectSaveLoadInteractionActions,
    'saveProjectResultViaActions' | 'saveProjectViaActions'
  >
): ProjectSaveActionResult {
  return executeProjectActionResult<
    { toast: ProjectSaveLoadToastFn | null | undefined },
    ProjectSaveActionResult
  >({
    feedback: { toast },
    run: () =>
      typeof actions.saveProjectResultViaActions === 'function'
        ? actions.saveProjectResultViaActions(App)
        : normalizeProjectSaveActionResult(actions.saveProjectViaActions(App), 'not-installed'),
    report: reportProjectSaveResult,
    buildError: buildProjectSaveActionErrorResult,
    fallbackMessage: 'שמירת פרויקט נכשלה',
  });
}
