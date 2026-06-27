import {
  setUiBaseLegColor,
  setUiBaseLegHeightCm,
  setUiBaseLegPlatformMode,
  setUiBaseLegPlatformSideMode,
  setUiBaseLegPlatformSideOverhangCm,
  setUiBaseLegPlatformFrontOverhangCm,
  setUiBaseLegWidthCm,
  setUiBaseLegStyle,
  setUiBasePlinthHeightCm,
  setUiBaseType,
  setUiSlidingTracksColor,
  setUiStackSplitDecorativeSeparatorSideOverhangCm,
  setUiStackSplitDecorativeSeparatorFrontOverhangCm,
} from '../actions/store_actions.js';
import { applyImmediateStructuralUiMutation } from '../actions/structural_build_refresh_actions.js';
import type { ActionMetaLike, UnknownRecord } from '../../../../../types';
import {
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../../../features/base_leg_support.js';
import {
  BASE_LEG_STAGE_SPECIAL_DIMS_SELECT_BLOCKED_MESSAGE,
  configHasActiveHeightDepthSpecialDims,
} from '../../../features/base_leg_stage_special_dims_guard.js';
import { normalizeBasePlinthHeightCm } from '../../../features/base_plinth_support.js';
import {
  normalizeBaseLegPlatformFrontOverhangCm,
  normalizeBaseLegPlatformSideOverhangCm,
  normalizeStackSplitDecorativeSeparatorFrontOverhangCm,
  normalizeStackSplitDecorativeSeparatorSideOverhangCm,
} from '../../../features/platform_overhang_support.js';
import {
  SHOE_DRAWER_BASE_BLOCKED_MESSAGE,
  configHasShoeDrawers,
  isBlockingShoeDrawerBaseType,
} from '../../../features/shoe_drawer_base_constraint.js';
import { getUiFeedback, readStoreStateMaybe } from '../../../services/api.js';
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

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readAppConfigSnapshot(app: unknown): UnknownRecord {
  const state = readStoreStateMaybe<UnknownRecord>(app);
  return isRecord(state?.config) ? state.config : {};
}

function toastStructureGuardMessage(app: unknown, message: string): void {
  try {
    getUiFeedback(app).toast(message, 'error');
  } catch {
    // Feedback is secondary; the guard itself must remain fail-closed.
  }
}

function toastBaseLegStageSpecialDimsSelectBlocked(app: unknown): void {
  toastStructureGuardMessage(app, BASE_LEG_STAGE_SPECIAL_DIMS_SELECT_BLOCKED_MESSAGE);
}

function toastShoeDrawerBaseSelectBlocked(app: unknown): void {
  toastStructureGuardMessage(app, SHOE_DRAWER_BASE_BLOCKED_MESSAGE);
}

function shouldBlockSelectingBaseLegStage(app: unknown): boolean {
  return configHasActiveHeightDepthSpecialDims(readAppConfigSnapshot(app));
}

function blockSelectingBaseLegStageIfNeeded(app: unknown): boolean {
  if (!shouldBlockSelectingBaseLegStage(app)) return false;
  toastBaseLegStageSpecialDimsSelectBlocked(app);
  return true;
}

function shouldBlockSelectingBaseBecauseOfShoeDrawers(app: unknown, nextBaseType: unknown): boolean {
  return isBlockingShoeDrawerBaseType(nextBaseType) && configHasShoeDrawers(readAppConfigSnapshot(app));
}

function blockSelectingBaseBecauseOfShoeDrawersIfNeeded(app: unknown, nextBaseType: unknown): boolean {
  if (!shouldBlockSelectingBaseBecauseOfShoeDrawers(app, nextBaseType)) return false;
  toastShoeDrawerBaseSelectBlocked(app);
  return true;
}

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
    return { ...patch, baseLegPlatformMode: 'stage', baseLegPlatformSideMode: 'overhang' };
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
  | 'setBaseLegPlatformSideMode'
  | 'setBaseLegPlatformSideOverhangCm'
  | 'setBaseLegPlatformFrontOverhangCm'
  | 'setStackSplitDecorativeSeparatorSideOverhangCm'
  | 'setStackSplitDecorativeSeparatorFrontOverhangCm'
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
      if (blockSelectingBaseBecauseOfShoeDrawersIfNeeded(args.app, nextBaseType)) return;
      if (nextBaseType === 'legs' && blockSelectingBaseLegStageIfNeeded(args.app)) return;

      applyImmediateStructureUiPatch(args, 'react:structure:baseType', { baseType: nextBaseType }, meta => {
        setUiBaseType(args.app, nextBaseType, meta);
        if (nextBaseType === 'legs') {
          setUiBaseLegPlatformMode(args.app, 'stage', meta);
          setUiBaseLegPlatformSideMode(args.app, 'overhang', meta);
        }
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
      if (nextBaseLegPlatformMode === 'stage' && blockSelectingBaseLegStageIfNeeded(args.app)) return;

      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegPlatformMode',
        { baseLegPlatformMode: nextBaseLegPlatformMode },
        meta => {
          setUiBaseLegPlatformMode(args.app, nextBaseLegPlatformMode, meta);
        }
      );
    },

    setBaseLegPlatformSideMode(next) {
      const nextBaseLegPlatformSideMode = normalizeBaseLegPlatformSideMode(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegPlatformSideMode',
        { baseLegPlatformSideMode: nextBaseLegPlatformSideMode },
        meta => {
          setUiBaseLegPlatformSideMode(args.app, nextBaseLegPlatformSideMode, meta);
        }
      );
    },

    setBaseLegPlatformSideOverhangCm(next) {
      const value = normalizeBaseLegPlatformSideOverhangCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegPlatformSideOverhangCm',
        { baseLegPlatformSideOverhangCm: value },
        meta => {
          setUiBaseLegPlatformSideOverhangCm(args.app, value, meta);
        }
      );
    },

    setBaseLegPlatformFrontOverhangCm(next) {
      const value = normalizeBaseLegPlatformFrontOverhangCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:baseLegPlatformFrontOverhangCm',
        { baseLegPlatformFrontOverhangCm: value },
        meta => {
          setUiBaseLegPlatformFrontOverhangCm(args.app, value, meta);
        }
      );
    },

    setStackSplitDecorativeSeparatorSideOverhangCm(next) {
      const value = normalizeStackSplitDecorativeSeparatorSideOverhangCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:stackSplitDecorativeSeparatorSideOverhangCm',
        { stackSplitDecorativeSeparatorSideOverhangCm: value },
        meta => {
          setUiStackSplitDecorativeSeparatorSideOverhangCm(args.app, value, meta);
        }
      );
    },

    setStackSplitDecorativeSeparatorFrontOverhangCm(next) {
      const value = normalizeStackSplitDecorativeSeparatorFrontOverhangCm(next);
      applyImmediateStructureUiPatch(
        args,
        'react:structure:stackSplitDecorativeSeparatorFrontOverhangCm',
        { stackSplitDecorativeSeparatorFrontOverhangCm: value },
        meta => {
          setUiStackSplitDecorativeSeparatorFrontOverhangCm(args.app, value, meta);
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
