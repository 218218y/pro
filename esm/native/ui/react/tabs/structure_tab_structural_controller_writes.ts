import {
  setUiBaseLegColor,
  setUiBaseLegHeightCm,
  setUiBaseLegPlatformMode,
  setUiBaseLegWidthCm,
  setUiBaseLegStyle,
  setUiBasePlinthHeightCm,
  setUiBaseType,
  setUiSlidingTracksColor,
} from '../actions/store_actions.js';
import { applyImmediateStructuralUiMutation } from '../actions/structural_build_refresh_actions.js';
import type { ActionMetaLike, UnknownRecord } from '../../../../../types';
import {
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegPlatformMode,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../../../features/base_leg_support.js';
import { normalizeBasePlinthHeightCm } from '../../../features/base_plinth_support.js';
import {
  commitStructureRawValue,
  setStackSplitLowerLinkModeValue,
  toggleStackSplitDecorativeSeparatorState,
  toggleStackSplitState,
} from './structure_tab_shared.js';
import type {
  CreateStructureTabStructuralControllerArgs,
  StructureTabStructuralController,
} from './structure_tab_structural_controller_contracts.js';
import type { DisplayedValueReader } from './structure_tab_structure_mutations_shared.js';
import { readUiRawNumberFromApp } from './structure_tab_structural_controller_shared.js';

function normalizeStructureBaseType(value: unknown): 'plinth' | 'legs' | 'none' {
  return value === 'legs' || value === 'none' ? value : 'plinth';
}

function normalizeStructureSlidingTracksColor(value: unknown): 'nickel' | 'black' {
  return value === 'black' ? 'black' : 'nickel';
}

function resolveImmediateStructureUiPatchDefaults(source: string, patch: UnknownRecord): UnknownRecord {
  if (
    source === 'react:structure:baseType' &&
    patch.baseType === 'legs' &&
    !Object.prototype.hasOwnProperty.call(patch, 'baseLegPlatformMode')
  ) {
    return { ...patch, baseLegPlatformMode: 'stage' };
  }
  return patch;
}

function applyImmediateStructureUiPatch(
  args: CreateStructureTabStructuralControllerArgs,
  source: string,
  patch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void
): void {
  applyImmediateStructuralUiMutation(
    args.app,
    source,
    resolveImmediateStructureUiPatchDefaults(source, patch),
    applyDirectMutation
  );
}

export function createStructureTabStructuralWriteController(
  args: CreateStructureTabStructuralControllerArgs
): Pick<
  StructureTabStructuralController,
  | 'setRaw'
  | 'setStackSplitLowerLinkMode'
  | 'toggleStackSplit'
  | 'toggleStackSplitDecorativeSeparator'
  | 'setBaseType'
  | 'setBaseLegStyle'
  | 'setBaseLegColor'
  | 'setBaseLegPlatformMode'
  | 'setBasePlinthHeightCm'
  | 'setBaseLegHeightCm'
  | 'setBaseLegWidthCm'
  | 'setSlidingTracksColor'
> {
  const getDisplayedRawValue: DisplayedValueReader = key => {
    switch (key) {
      case 'width':
        return Number(args.width) || 0;
      case 'height':
        return Number(args.height) || 0;
      case 'depth':
        return Number(args.depth) || 0;
      case 'doors':
        return Number(args.doors) || 0;
      case 'stackSplitLowerHeight':
        return Number(args.stackSplitLowerHeight) || 0;
      case 'stackSplitLowerDepth':
        return Number(args.stackSplitLowerDepth) || 0;
      case 'stackSplitLowerWidth':
        return Number(args.stackSplitLowerWidth) || 0;
      case 'stackSplitLowerDoors':
        return Number(args.stackSplitLowerDoors) || 0;
      case 'cellDimsWidth':
      case 'cellDimsHeight':
      case 'cellDimsDepth':
        return readUiRawNumberFromApp(args.app, key);
      default:
        return 0;
    }
  };

  return {
    setRaw(key, nextValue) {
      commitStructureRawValue({
        app: args.app,
        meta: args.meta,
        key,
        nextValue,
        getDisplayedRawValue,
        wardrobeType: args.wardrobeType,
        isChestMode: args.isChestMode,
        isManualWidth: args.isManualWidth,
        width: args.width,
        height: args.height,
        depth: args.depth,
        doors: args.doors,
        structureSelectRaw: args.structureSelectRaw,
        singleDoorPosRaw: args.singleDoorPosRaw,
        chestCommodeEnabled: args.chestCommodeEnabled,
        chestCommodeMirrorWidthManual: args.chestCommodeMirrorWidthManual,
      });
    },

    setStackSplitLowerLinkMode(field: 'depth' | 'width' | 'doors', nextManual: boolean) {
      setStackSplitLowerLinkModeValue({
        app: args.app,
        meta: args.meta,
        field,
        nextManual,
        wardrobeType: args.wardrobeType,
        depth: args.depth,
        width: args.width,
        doors: args.doors,
        stackSplitLowerDepth: args.stackSplitLowerDepth,
        stackSplitLowerWidth: args.stackSplitLowerWidth,
        stackSplitLowerDoors: args.stackSplitLowerDoors,
      });
    },

    toggleStackSplit() {
      toggleStackSplitState({
        app: args.app,
        meta: args.meta,
        stackSplitEnabled: args.stackSplitEnabled,
        height: args.height,
        depth: args.depth,
        width: args.width,
        doors: args.doors,
        wardrobeType: args.wardrobeType,
        stackSplitLowerHeight: args.stackSplitLowerHeight,
        stackSplitLowerDepth: args.stackSplitLowerDepth,
        stackSplitLowerWidth: args.stackSplitLowerWidth,
        stackSplitLowerDoors: args.stackSplitLowerDoors,
        stackSplitLowerDepthManual: args.stackSplitLowerDepthManual,
        stackSplitLowerWidthManual: args.stackSplitLowerWidthManual,
        stackSplitLowerDoorsManual: args.stackSplitLowerDoorsManual,
      });
    },

    toggleStackSplitDecorativeSeparator() {
      toggleStackSplitDecorativeSeparatorState({
        app: args.app,
        meta: args.meta,
        enabled: args.stackSplitDecorativeSeparatorEnabled,
        stackSplitEnabled: args.stackSplitEnabled,
      });
    },

    setBaseType(next: 'plinth' | 'legs' | 'none') {
      const nextBaseType = normalizeStructureBaseType(next);
      applyImmediateStructureUiPatch(args, 'react:structure:baseType', { baseType: nextBaseType }, meta => {
        setUiBaseType(args.app, nextBaseType, meta);
        if (nextBaseType === 'legs') setUiBaseLegPlatformMode(args.app, 'stage', meta);
      });
    },

    setBaseLegStyle(next) {
      const nextBaseLegStyle = normalizeBaseLegStyle(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegStyle',
        { baseLegStyle: nextBaseLegStyle },
        meta => {
          setUiBaseLegStyle(args.app, nextBaseLegStyle, meta);
        }
      );
    },

    setBaseLegColor(next) {
      const nextBaseLegColor = normalizeBaseLegColor(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegColor',
        { baseLegColor: nextBaseLegColor },
        meta => {
          setUiBaseLegColor(args.app, nextBaseLegColor, meta);
        }
      );
    },

    setBaseLegPlatformMode(next) {
      const nextBaseLegPlatformMode = normalizeBaseLegPlatformMode(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegPlatformMode',
        { baseLegPlatformMode: nextBaseLegPlatformMode },
        meta => {
          setUiBaseLegPlatformMode(args.app, nextBaseLegPlatformMode, meta);
        }
      );
    },

    setBasePlinthHeightCm(next) {
      const nextBasePlinthHeightCm = normalizeBasePlinthHeightCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:basePlinthHeightCm',
        { basePlinthHeightCm: nextBasePlinthHeightCm },
        meta => {
          setUiBasePlinthHeightCm(args.app, nextBasePlinthHeightCm, meta);
        }
      );
    },

    setBaseLegHeightCm(next) {
      const nextBaseLegHeightCm = normalizeBaseLegHeightCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegHeightCm',
        { baseLegHeightCm: nextBaseLegHeightCm },
        meta => {
          setUiBaseLegHeightCm(args.app, nextBaseLegHeightCm, meta);
        }
      );
    },

    setBaseLegWidthCm(next) {
      const nextBaseLegWidthCm = normalizeBaseLegWidthCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegWidthCm',
        { baseLegWidthCm: nextBaseLegWidthCm },
        meta => {
          setUiBaseLegWidthCm(args.app, nextBaseLegWidthCm, meta);
        }
      );
    },

    setSlidingTracksColor(next: 'nickel' | 'black') {
      const nextSlidingTracksColor = normalizeStructureSlidingTracksColor(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:slidingTracksColor',
        { slidingTracksColor: nextSlidingTracksColor },
        meta => {
          setUiSlidingTracksColor(args.app, nextSlidingTracksColor, meta);
        }
      );
    },
  };
}
