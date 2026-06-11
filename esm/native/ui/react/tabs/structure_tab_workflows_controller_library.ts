import type {
  CreateStructureTabWorkflowControllerArgs,
  StructureTabWorkflowController,
} from './structure_tab_workflows_controller_contracts.js';
import {
  buildStructureLibraryInvariantArgs,
  buildStructureLibraryToggleArgs,
} from './structure_tab_workflows_controller_shared.js';

function isNoMainWardrobeState(state: CreateStructureTabWorkflowControllerArgs['state']): boolean {
  return state.wardrobeType !== 'sliding' && Number(state.doors) === 0;
}

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
      if (isNoMainWardrobeState(state)) return;
      libraryPreset.ensureInvariants(libraryEnv, buildStructureLibraryInvariantArgs(state));
    },

    toggleLibraryMode() {
      if (isNoMainWardrobeState(state)) return;
      libraryPreset.toggleLibraryMode(libraryEnv, buildStructureLibraryToggleArgs(state), {
        mergeUiOverride,
      });
    },
  };
}
