import type { UseStructureTabSavedModelsCommandsResult } from './use_structure_tab_saved_models_commands_contracts.js';
import type { UseStructureTabSavedModelsDndResult } from './use_structure_tab_saved_models_dnd.js';

export type StructureTabSavedModelsController = UseStructureTabSavedModelsCommandsResult &
  UseStructureTabSavedModelsDndResult;
