import { useCallback, useMemo } from 'react';

import { createSavedModelsCommandController } from './structure_tab_saved_models_controller_runtime.js';
import type {
  SavedModelsCommandHookState,
  UseStructureTabSavedModelsCommandsResult,
} from './use_structure_tab_saved_models_commands_contracts.js';

export type SavedModelsCommandControllerArgs = SavedModelsCommandHookState & {
  setSelected: (id: string) => void;
};

export function useStructureTabSavedModelsCommandController(
  args: SavedModelsCommandControllerArgs
): Pick<
  UseStructureTabSavedModelsCommandsResult,
  | 'setSelected'
  | 'applySelected'
  | 'saveCurrent'
  | 'overwriteById'
  | 'toggleLock'
  | 'deleteById'
  | 'deleteSelected'
  | 'moveById'
  | 'moveSelected'
> {
  const commandController = useMemo(
    () =>
      createSavedModelsCommandController({
        fb: args.fb,
        modelsApi: args.modelsApi,
        models: args.models,
        selectedId: args.selectedId,
        setSelected: args.setSelected,
      }),
    [args.fb, args.models, args.modelsApi, args.selectedId, args.setSelected]
  );

  const deleteSelected = useCallback(() => commandController.deleteById(), [commandController]);

  return {
    setSelected: args.setSelected,
    applySelected: commandController.applySelected,
    saveCurrent: commandController.saveCurrent,
    overwriteById: commandController.overwriteById,
    toggleLock: commandController.toggleLock,
    deleteById: commandController.deleteById,
    deleteSelected,
    moveById: commandController.moveById,
    moveSelected: commandController.moveSelected,
  };
}
