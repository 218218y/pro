import { asUiFeedbackPrompt, runEnsureSaveProjectAction } from '../project_save_runtime.js';
import {
  asProjectFileLoadEvent,
  asClickable,
  handleProjectSaveLoadInputChange,
  openProjectSaveLoadInput,
} from './project_save_load_controller_load.js';
import {
  ensureProjectSaveLoadAction,
  performProjectSaveLoadSave,
} from './project_save_load_controller_save.js';

import type { AppContainer } from '../../../../types';
import type { ProjectSaveRuntimeDeps } from '../project_save_runtime.js';
import type {
  CreateProjectSaveLoadInteractionActions,
  ProjectSaveLoadInteractionController,
  ProjectSaveLoadRuntimeDeps,
} from './project_save_load_controller_shared.js';

export type { ProjectSaveLoadToastFn } from './project_save_load_controller_shared.js';
export type { ProjectSaveLoadRuntimeDeps };
export type { ProjectSaveLoadInteractionController } from './project_save_load_controller_shared.js';

export function createProjectSaveLoadInteractionController(
  App: AppContainer,
  deps: ProjectSaveRuntimeDeps,
  actions: CreateProjectSaveLoadInteractionActions
): ProjectSaveLoadInteractionController {
  const { toast } = deps;

  return {
    ensureSaveProjectAction() {
      ensureProjectSaveLoadAction(App, deps, actions);
    },

    performSave() {
      performProjectSaveLoadSave(App, toast, actions);
    },

    openLoadInput(input) {
      openProjectSaveLoadInput(input);
    },

    handleLoadInputChange(evt) {
      return handleProjectSaveLoadInputChange(App, toast, evt);
    },
  };
}

export { asProjectFileLoadEvent, asUiFeedbackPrompt, asClickable, runEnsureSaveProjectAction };
