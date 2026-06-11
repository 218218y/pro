import { reportSavedModelsActionResult } from './structure_tab_saved_models_action_feedback.js';
import {
  runDeleteSavedModelFlow,
  runOverwriteSavedModelFlow,
  runSaveCurrentModelFlow,
} from './structure_tab_saved_models_command_flows.js';
import { buildActionFailure } from './structure_tab_saved_models_command_results.js';
import type {
  SavedModelsCommandController,
  CreateSavedModelsCommandControllerArgs,
} from './structure_tab_saved_models_controller_shared.js';
import { resolveCommandTargetId } from './structure_tab_saved_models_controller_shared.js';
import { runSavedModelsMutationSingleFlight } from './structure_tab_saved_models_mutation_singleflight.js';

export function createSavedModelsMutationCommands(
  args: CreateSavedModelsCommandControllerArgs
): Pick<SavedModelsCommandController, 'saveCurrent' | 'overwriteById' | 'deleteById'> {
  const { fb, modelsApi, models, selectedId, setSelected } = args;

  return {
    saveCurrent() {
      return runSavedModelsMutationSingleFlight({
        owner: modelsApi,
        key: 'save',
        onBusy: () => {
          reportSavedModelsActionResult(fb, buildActionFailure('save', 'busy'));
        },
        run: async () => {
          const result = await runSaveCurrentModelFlow({ fb, modelsApi, models });
          if (result.ok && result.id) setSelected(result.id);
          reportSavedModelsActionResult(fb, result);
        },
      });
    },

    overwriteById(idOverride?: string) {
      const id = resolveCommandTargetId(selectedId, idOverride);
      return runSavedModelsMutationSingleFlight({
        owner: modelsApi,
        key: `overwrite:${id}`,
        onBusy: () => {
          reportSavedModelsActionResult(fb, buildActionFailure('overwrite', 'busy', { id }));
        },
        run: async () => {
          const result = await runOverwriteSavedModelFlow({ fb, modelsApi, id });
          reportSavedModelsActionResult(fb, result);
        },
      });
    },

    deleteById(idOverride?: string) {
      const id = resolveCommandTargetId(selectedId, idOverride);
      return runSavedModelsMutationSingleFlight({
        owner: modelsApi,
        key: `delete:${id}`,
        onBusy: () => {
          reportSavedModelsActionResult(fb, buildActionFailure('delete', 'busy', { id }));
        },
        run: async () => {
          const result = await runDeleteSavedModelFlow({ fb, modelsApi, id });
          if (result.ok && id === selectedId) setSelected('');
          reportSavedModelsActionResult(fb, result);
        },
      });
    },
  };
}
