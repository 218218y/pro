import {
  applyLibraryPresetMode,
  captureLibraryPresetPreState,
  ensureLibraryPresetInvariants,
  restoreLibraryPresetPreState,
} from './library_preset_flow.js';
import { normDoorCount } from './library_preset_shared.js';
import { readLibraryPresetDefaultDoorCount } from './library_preset_flow_shared.js';

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

function readLibraryPresetDefaultSeededDoorCounts(
  wardrobeType: 'hinged' | 'sliding'
): LibraryPresetSeededDoorCounts {
  const count = readLibraryPresetDefaultDoorCount(wardrobeType);
  return {
    topDoorsCount: count,
    bottomDoorsCount: count,
  };
}

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

function readLibraryPresetSeededDoorCountsFromState(
  state: LibraryPresetPreState | null,
  wardrobeType: 'hinged' | 'sliding'
): LibraryPresetSeededDoorCounts | null {
  if (!state) return null;
  const topDoorsCount = normDoorCount(state.ui.raw.doors, wardrobeType);
  const bottomDoorsCount = normDoorCount(state.ui.raw.stackSplitLowerDoors ?? topDoorsCount, wardrobeType);
  return { topDoorsCount, bottomDoorsCount };
}

export function createLibraryPresetController(): LibraryPresetController {
  let preState: LibraryPresetPreState | null = null;
  let lastLibraryState: LibraryPresetPreState | null = null;
  let lastLibrarySeededDoorCounts: LibraryPresetSeededDoorCounts | null = null;
  let seededDoorCounts: LibraryPresetSeededDoorCounts | null = null;

  return {
    toggleLibraryMode: (env, args, helpers) => {
      if (args.isLibraryMode) {
        lastLibraryState = captureLibraryPresetPreState(env);
        lastLibrarySeededDoorCounts = seededDoorCounts;
        preState = restoreLibraryPresetPreState(env, args, helpers.mergeUiOverride, preState);
        seededDoorCounts = null;
        return;
      }
      preState = applyLibraryPresetMode(env, args, helpers.mergeUiOverride, lastLibraryState);
      seededDoorCounts =
        lastLibrarySeededDoorCounts ||
        readLibraryPresetSeededDoorCountsFromState(lastLibraryState, args.wardrobeType) ||
        readLibraryPresetDefaultSeededDoorCounts(args.wardrobeType);
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
