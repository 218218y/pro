import { reportSavedModelsActionResult } from './structure_tab_saved_models_action_feedback.js';
import {
  applySavedModel,
  moveSavedModel,
  toggleSavedModelLock,
} from './structure_tab_saved_models_command_flows.js';
import type {
  SavedModelsCommandController,
  CreateSavedModelsCommandControllerArgs,
} from './structure_tab_saved_models_controller_shared.js';
import { resolveCommandTargetId } from './structure_tab_saved_models_controller_shared.js';

export function createSavedModelsSelectionCommands(
  args: CreateSavedModelsCommandControllerArgs
): Pick<SavedModelsCommandController, 'applySelected' | 'toggleLock' | 'moveById' | 'moveSelected'> {
  const { fb, modelsApi, selectedId } = args;

  return {
    applySelected(idOverride?: string) {
      const id = resolveCommandTargetId(selectedId, idOverride);
      reportSavedModelsActionResult(fb, applySavedModel(modelsApi, id));
    },

    async toggleLock(idOverride?: string) {
      const id = resolveCommandTargetId(selectedId, idOverride);
      reportSavedModelsActionResult(fb, await toggleSavedModelLock(modelsApi, id));
    },

    async moveById(id: string, dir) {
      reportSavedModelsActionResult(fb, await moveSavedModel(modelsApi, id, dir));
    },

    async moveSelected(dir) {
      if (!selectedId) {
        reportSavedModelsActionResult(fb, { ok: false, kind: 'move', reason: 'missing-selection', dir });
        return;
      }
      reportSavedModelsActionResult(fb, await moveSavedModel(modelsApi, selectedId, dir));
    },
  };
}
