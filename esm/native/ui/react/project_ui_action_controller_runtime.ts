import { openProjectLoadInput, runProjectUiLoadInputChange } from './project_ui_action_controller_load.js';
import {
  runProjectUiRestoreLastSession,
  runProjectUiResetToDefault,
} from './project_ui_action_controller_recovery.js';
import { runProjectUiSaveAction } from './project_ui_action_controller_save.js';

import type {
  CreateProjectUiActionControllerArgs,
  ProjectInputRefLike,
  ProjectUiActionController,
} from './project_ui_action_controller_shared.js';

export type {
  ProjectInputRefLike,
  ProjectUiActionController,
  CreateProjectUiActionControllerArgs,
} from './project_ui_action_controller_shared.js';

export { openProjectLoadInput } from './project_ui_action_controller_load.js';

export function createProjectUiActionController(
  args: CreateProjectUiActionControllerArgs
): ProjectUiActionController {
  return {
    openLoadInput(ref: ProjectInputRefLike | null | undefined) {
      openProjectLoadInput(ref);
    },

    async handleLoadInputChange(evt) {
      await runProjectUiLoadInputChange(args, evt);
    },

    restoreLastSession() {
      return runProjectUiRestoreLastSession(args);
    },

    resetToDefault() {
      return runProjectUiResetToDefault(args);
    },

    saveProject() {
      return runProjectUiSaveAction(args);
    },
  };
}

export { clearProjectLoadInputEventTarget as resetProjectLoadInputTarget } from '../project_action_execution.js';
