// React UI actions: project save/load/restore

import type { AppContainer, ProjectFileLoadEventLike } from '../../../../../types';
import {
  handleProjectFileLoadViaService,
  normalizeProjectLoadActionResult,
  saveProjectResultViaActions,
  type ProjectLoadActionResult,
  type ProjectResetDefaultActionResult,
  type ProjectRestoreActionResult,
} from '../../../services/api.js';
import type { ProjectSaveActionResult } from '../../project_action_feedback.js';
import {
  resetProjectToDefaultWithConfirm,
  restoreProjectSessionWithConfirm,
} from '../../project_session_commands.js';

export function saveProject(app: AppContainer): ProjectSaveActionResult {
  return saveProjectResultViaActions(app, 'not-installed');
}

export async function loadFromFileEvent(
  app: AppContainer,
  evt: ProjectFileLoadEventLike | unknown
): Promise<ProjectLoadActionResult> {
  return normalizeProjectLoadActionResult(await handleProjectFileLoadViaService(app, evt), 'not-installed');
}

export async function restoreLastSession(app: AppContainer): Promise<ProjectRestoreActionResult> {
  return await restoreProjectSessionWithConfirm(app);
}

export async function resetToDefaultProject(app: AppContainer): Promise<ProjectResetDefaultActionResult> {
  return await resetProjectToDefaultWithConfirm(app);
}
