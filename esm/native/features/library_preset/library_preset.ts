import {
  applyLibraryPresetMode,
  ensureLibraryPresetInvariants,
  restoreLibraryPresetPreState,
} from './library_preset_flow.js';

import type { LibraryPresetController, LibraryPresetPreState } from './library_preset_types.js';
export type {
  LibraryPresetConfigSnapshot,
  LibraryPresetController,
  LibraryPresetEnsureArgs,
  LibraryPresetEnv,
  LibraryPresetPreState,
  LibraryPresetToggleArgs,
  LibraryPresetUiOverride,
  LibraryPresetUiRawState,
  LibraryPresetUiSnapshot,
  MergeUiOverrideFn,
} from './library_preset_types.js';

export function createLibraryPresetController(): LibraryPresetController {
  let preState: LibraryPresetPreState | null = null;

  return {
    toggleLibraryMode: (env, args, helpers) => {
      if (args.isLibraryMode) {
        preState = restoreLibraryPresetPreState(env, args, helpers.mergeUiOverride, preState);
        return;
      }
      preState = applyLibraryPresetMode(env, args, helpers.mergeUiOverride);
    },
    ensureInvariants: (env, args) => ensureLibraryPresetInvariants(env, args),
    resetPreState: () => {
      preState = null;
    },
  };
}
