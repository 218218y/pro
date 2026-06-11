import { useStructureTabSavedModelsCommandController } from './use_structure_tab_saved_models_commands_controller.js';
import type { UseStructureTabSavedModelsCommandsResult } from './use_structure_tab_saved_models_commands_contracts.js';
import { useStructureTabSavedModelsCommandState } from './use_structure_tab_saved_models_commands_state.js';

export type { UseStructureTabSavedModelsCommandsResult } from './use_structure_tab_saved_models_commands_contracts.js';

export function useStructureTabSavedModelsCommands(): UseStructureTabSavedModelsCommandsResult {
  const state = useStructureTabSavedModelsCommandState();
  const commands = useStructureTabSavedModelsCommandController(state);
  return {
    ...state,
    ...commands,
  };
}
