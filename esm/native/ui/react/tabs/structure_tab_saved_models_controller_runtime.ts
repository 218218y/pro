import {
  type CreateSavedModelsCommandControllerArgs,
  type SavedModelsCommandController,
} from './structure_tab_saved_models_controller_shared.js';
import { createSavedModelsMutationCommands } from './structure_tab_saved_models_controller_mutations.js';
import { createSavedModelsSelectionCommands } from './structure_tab_saved_models_controller_selection.js';

export type {
  CreateSavedModelsCommandControllerArgs,
  SavedModelsCommandController,
} from './structure_tab_saved_models_controller_shared.js';
export { syncSelectedSavedModelId } from './structure_tab_saved_models_controller_shared.js';

export function createSavedModelsCommandController(
  args: CreateSavedModelsCommandControllerArgs
): SavedModelsCommandController {
  return {
    ...createSavedModelsSelectionCommands(args),
    ...createSavedModelsMutationCommands(args),
  };
}
