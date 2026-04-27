import { useStructureTabSavedModelsCommands } from './use_structure_tab_saved_models_commands.js';
import type { StructureTabSavedModelsController } from './use_structure_tab_saved_models_controller_contracts.js';
import { useStructureTabSavedModelsDnd } from './use_structure_tab_saved_models_dnd.js';

export type { StructureTabSavedModelsController } from './use_structure_tab_saved_models_controller_contracts.js';

export function useStructureTabSavedModelsController(): StructureTabSavedModelsController {
  const commands = useStructureTabSavedModelsCommands();
  const dnd = useStructureTabSavedModelsDnd({
    modelsApi: commands.modelsApi,
    fb: commands.fb,
    presetModels: commands.presetModels,
    savedModels: commands.savedModels,
    refresh: commands.refresh,
    presetModelsOpen: commands.presetModelsOpen,
    savedModelsOpen: commands.savedModelsOpen,
    setPresetModelsOpen: commands.setPresetModelsOpen,
    setSavedModelsOpen: commands.setSavedModelsOpen,
  });

  return {
    ...commands,
    ...dnd,
  };
}
