import {
  applyLibraryPresetMode,
  ensureLibraryPresetInvariants,
  restoreLibraryPresetPreState,
} from './library_preset_flow.js';
import { normDoorCount } from './library_preset_shared.js';

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

type LibraryPresetSeededDoorCounts = {
  topDoorsCount: number;
  bottomDoorsCount: number;
};

function readLibraryPresetSeededDoorCounts(args: {
  wardrobeType: 'hinged' | 'sliding';
  doors: number;
  stackSplitLowerDoors: number;
}): LibraryPresetSeededDoorCounts {
  return {
    topDoorsCount: normDoorCount(args.doors, args.wardrobeType),
    bottomDoorsCount: normDoorCount(args.stackSplitLowerDoors, args.wardrobeType),
  };
}

export function createLibraryPresetController(): LibraryPresetController {
  let preState: LibraryPresetPreState | null = null;
  let seededDoorCounts: LibraryPresetSeededDoorCounts | null = null;

  return {
    toggleLibraryMode: (env, args, helpers) => {
      if (args.isLibraryMode) {
        preState = restoreLibraryPresetPreState(env, args, helpers.mergeUiOverride, preState);
        seededDoorCounts = null;
        return;
      }
      preState = applyLibraryPresetMode(env, args, helpers.mergeUiOverride);
      seededDoorCounts = readLibraryPresetSeededDoorCounts(args);
    },
    ensureInvariants: (env, args) => {
      if (!args.isLibraryMode) {
        seededDoorCounts = null;
        ensureLibraryPresetInvariants(env, args);
        return;
      }

      const currentDoorCounts = readLibraryPresetSeededDoorCounts(args);
      const previousDoorCounts = seededDoorCounts || currentDoorCounts;

      ensureLibraryPresetInvariants(env, {
        ...args,
        seededTopDoorsCount: previousDoorCounts.topDoorsCount,
        seededBottomDoorsCount: previousDoorCounts.bottomDoorsCount,
      });

      seededDoorCounts = currentDoorCounts;
    },
    resetPreState: () => {
      preState = null;
      seededDoorCounts = null;
    },
  };
}
