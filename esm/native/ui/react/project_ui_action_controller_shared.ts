import type { AppContainer, ProjectFileLoadEventLike } from '../../../../types';

import type { ProjectFeedbackLike, ProjectSaveActionResult } from '../project_action_feedback.js';
import type {
  ProjectLoadActionResult,
  ProjectResetDefaultActionResult,
  ProjectRestoreActionResult,
} from '../../services/api.js';

export type ProjectInputRefLike = {
  current: {
    click?: (() => void) | null;
  } | null;
};

export type ProjectUiActionController = {
  openLoadInput: (ref: ProjectInputRefLike | null | undefined) => void;
  handleLoadInputChange: (evt: ProjectFileLoadEventLike | unknown) => Promise<void>;
  restoreLastSession: () => Promise<void>;
  resetToDefault: () => Promise<void>;
  saveProject: () => ProjectSaveActionResult;
};

export type CreateProjectUiActionControllerArgs = {
  app: AppContainer;
  fb: ProjectFeedbackLike | null | undefined;
  loadFromFileEvent: (
    app: AppContainer,
    evt: ProjectFileLoadEventLike | unknown
  ) => Promise<ProjectLoadActionResult>;
  restoreLastSession?: ((app: AppContainer) => Promise<ProjectRestoreActionResult>) | null;
  resetToDefaultProject?: ((app: AppContainer) => Promise<ProjectResetDefaultActionResult>) | null;
  saveProject: (app: AppContainer) => ProjectSaveActionResult;
};
