import type {
  CreateStructureTabWorkflowControllerArgs,
  StructureTabWorkflowController,
} from './structure_tab_workflows_controller_contracts.js';
import {
  buildStructureLibraryInvariantArgs,
  buildStructureLibraryToggleArgs,
} from './structure_tab_workflows_controller_shared.js';

export function createStructureTabWorkflowLibraryApi(
  args: CreateStructureTabWorkflowControllerArgs
): Pick<
  StructureTabWorkflowController,
  'syncLibraryModePreState' | 'ensureLibraryInvariants' | 'toggleLibraryMode'
> {
  const { libraryEnv, libraryPreset, mergeUiOverride, state } = args;

  return {
    syncLibraryModePreState() {
      if (!state.isLibraryMode) libraryPreset.resetPreState();
    },

    ensureLibraryInvariants() {
      libraryPreset.ensureInvariants(libraryEnv, buildStructureLibraryInvariantArgs(state));
    },

    toggleLibraryMode() {
      libraryPreset.toggleLibraryMode(libraryEnv, buildStructureLibraryToggleArgs(state), {
        mergeUiOverride,
      });
    },
  };
}
