import type { AppContainer, SaveProjectAction } from '../../../../types';

import type { ProjectSaveActionResult } from '../project_action_feedback.js';
import type { ProjectSaveRuntimeDeps, ProjectSaveRuntimeToastFn } from '../project_save_runtime.js';

export type ProjectSaveLoadToastFn = ProjectSaveRuntimeToastFn;
export type { ProjectSaveRuntimeDeps as ProjectSaveLoadRuntimeDeps };

export type ProjectSaveLoadInteractionController = {
  ensureSaveProjectAction: () => void;
  performSave: () => void;
  openLoadInput: (input: unknown) => void;
  handleLoadInputChange: (evt: Event | unknown) => Promise<void>;
};

export type CreateProjectSaveLoadInteractionActions = {
  getSaveProjectAction: (app: AppContainer) => unknown;
  setSaveProjectAction: (app: AppContainer, fn: SaveProjectAction | null) => void;
  saveProjectResultViaActions?: ((app: AppContainer) => ProjectSaveActionResult) | null;
  saveProjectViaActions: (app: AppContainer) => boolean;
};
