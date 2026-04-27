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

    toggleLock(idOverride?: string) {
      const id = resolveCommandTargetId(selectedId, idOverride);
      reportSavedModelsActionResult(fb, toggleSavedModelLock(modelsApi, id));
    },

    moveById(id: string, dir) {
      reportSavedModelsActionResult(fb, moveSavedModel(modelsApi, id, dir));
    },

    moveSelected(dir) {
      if (!selectedId) {
        reportSavedModelsActionResult(fb, { ok: false, kind: 'move', reason: 'missing-selection', dir });
        return;
      }
      reportSavedModelsActionResult(fb, moveSavedModel(modelsApi, selectedId, dir));
    },
  };
}
