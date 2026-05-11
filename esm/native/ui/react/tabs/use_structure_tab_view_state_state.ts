import { useMemo } from 'react';

import type { AppContainer } from '../../../../../types';
import type { StructureTabViewState } from './use_structure_tab_view_state_contracts.js';

import {
  useCfgSelector,
  useCfgSelectorShallow,
  useModeSelectorShallow,
  useStoreSelector,
  useUiSelectorShallow,
} from '../hooks.js';
import {
  selectHasAnyCellDimsOverrides,
  selectHingeMap,
  selectIsLibraryMode,
  selectLibraryUpperDoorsRemoved,
  selectIsManualWidth,
  selectPreChestState,
  selectWardrobeType,
} from '../selectors/config_selectors.js';
import { readModulesCountFromRootSnapshot } from '../selectors/root_selectors.js';
import {
  deriveStructureTabSelectionState,
  deriveStructureTabStackSplitState,
  normalizeStructureTabHingeMap,
  normalizeStructureTabPreChestState,
  readStructureTabBaseUiState,
  readStructureTabCellDimsState,
  readStructureTabDefaultCellWidth,
  readStructureTabStackSplitUiState,
} from './structure_tab_view_state_runtime.js';
import { getModeConst } from './structure_tab_shared.js';

function readLibraryUpperDoorsHiddenPreference(value: unknown, defaultValue: boolean): boolean {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return defaultValue;
}

export function useStructureTabViewStateState(app: AppContainer): StructureTabViewState {
  const {
    width,
    height,
    depth,
    doors,
    chestDrawersCount,
    chestCommodeEnabled,
    chestCommodeMirrorHeightCm,
    chestCommodeMirrorWidthCm,
    chestCommodeMirrorWidthManual,
    baseType,
    baseLegStyle,
    baseLegColor,
    basePlinthHeightCm,
    baseLegHeightCm,
    baseLegWidthCm,
    slidingTracksColor,
    structureSelectRaw,
    singleDoorPosRaw,
    hingeDirection,
    cornerMode,
    cornerSide,
    cornerWidth,
    cornerDoors,
    cornerHeight,
    cornerDepth,
    isChestMode,
  } = useUiSelectorShallow(ui => readStructureTabBaseUiState(ui));

  const { wardrobeType, isManualWidth, preChestState, isLibraryMode, hingeMap } = useCfgSelectorShallow(
    cfg => ({
      wardrobeType: selectWardrobeType(cfg),
      isManualWidth: selectIsManualWidth(cfg),
      preChestState: selectPreChestState(cfg),
      isLibraryMode: selectIsLibraryMode(cfg),
      hingeMap: selectHingeMap(cfg),
    })
  );
  const { primaryMode } = useModeSelectorShallow(mode => ({ primaryMode: String(mode.primary || 'none') }));

  const hingeModeId = getModeConst(app, 'HINGE', 'hinge');
  const hingeEditActive = primaryMode === hingeModeId;
  const cellDimsModeId = getModeConst(app, 'CELL_DIMS', 'cell_dims');
  const cellDimsEditActive = primaryMode === cellDimsModeId;

  const {
    stackSplitEnabled,
    stackSplitDecorativeSeparatorEnabled,
    stackSplitLowerHeight,
    stackSplitLowerDepthRaw,
    stackSplitLowerWidthRaw,
    stackSplitLowerDoorsRaw,
    stackSplitLowerDepthManualRaw,
    stackSplitLowerWidthManualRaw,
    stackSplitLowerDoorsManualRaw,
  } = useUiSelectorShallow(ui => readStructureTabStackSplitUiState(ui, { depth, width, doors }));

  const {
    stackSplitLowerDepthManual,
    stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual,
    stackSplitLowerDepth,
    stackSplitLowerWidth,
    stackSplitLowerDoors,
  } = useMemo(
    () =>
      deriveStructureTabStackSplitState({
        depth,
        width,
        doors,
        stackSplitLowerDepthRaw,
        stackSplitLowerWidthRaw,
        stackSplitLowerDoorsRaw,
        stackSplitLowerDepthManualRaw,
        stackSplitLowerWidthManualRaw,
        stackSplitLowerDoorsManualRaw,
      }),
    [
      depth,
      width,
      doors,
      stackSplitLowerDepthRaw,
      stackSplitLowerWidthRaw,
      stackSplitLowerDoorsRaw,
      stackSplitLowerDepthManualRaw,
      stackSplitLowerWidthManualRaw,
      stackSplitLowerDoorsManualRaw,
    ]
  );

  const hasAnyCellDimsOverrides = useCfgSelector(selectHasAnyCellDimsOverrides);
  const { libraryUpperDoorsHiddenRaw } = useUiSelectorShallow(ui => ({
    libraryUpperDoorsHiddenRaw: ui.libraryUpperDoorsHidden,
  }));
  const libraryUpperDoorsEffectivelyRemoved = useCfgSelector(cfg =>
    selectLibraryUpperDoorsRemoved(cfg, doors)
  );
  const libraryUpperDoorsHidden = useMemo(
    () =>
      readLibraryUpperDoorsHiddenPreference(libraryUpperDoorsHiddenRaw, libraryUpperDoorsEffectivelyRemoved),
    [libraryUpperDoorsHiddenRaw, libraryUpperDoorsEffectivelyRemoved]
  );
  const modulesCount = useStoreSelector(st => readModulesCountFromRootSnapshot(st, doors));

  const defaultCellWidth = useMemo(
    () => readStructureTabDefaultCellWidth({ modulesCount, width }),
    [modulesCount, width]
  );

  const { cellDimsWidth, cellDimsHeight, cellDimsDepth } = useUiSelectorShallow(ui =>
    readStructureTabCellDimsState(ui)
  );

  const {
    patterns,
    structureSelect,
    structureIsDefault,
    structureArr,
    isSliding,
    shouldShowStructureButtons,
    shouldShowSingleDoor,
    shouldShowHingeBtn,
  } = useMemo(
    () =>
      deriveStructureTabSelectionState({
        doors,
        structureSelectRaw,
        wardrobeType,
      }),
    [doors, structureSelectRaw, wardrobeType]
  );

  return {
    width,
    height,
    depth,
    doors,
    chestDrawersCount,
    chestCommodeEnabled,
    chestCommodeMirrorHeightCm,
    chestCommodeMirrorWidthCm,
    chestCommodeMirrorWidthManual,
    baseType,
    baseLegStyle,
    baseLegColor,
    basePlinthHeightCm,
    baseLegHeightCm,
    baseLegWidthCm,
    slidingTracksColor,
    structureSelectRaw,
    singleDoorPosRaw,
    hingeDirection,
    cornerMode,
    cornerSide,
    cornerWidth,
    cornerDoors,
    cornerHeight,
    cornerDepth,
    isChestMode,
    wardrobeType,
    isManualWidth,
    preChestState: normalizeStructureTabPreChestState(preChestState),
    isLibraryMode,
    libraryUpperDoorsHidden,
    hingeMap: normalizeStructureTabHingeMap(hingeMap),
    primaryMode,
    hingeModeId,
    hingeEditActive,
    cellDimsModeId,
    cellDimsEditActive,
    stackSplitEnabled,
    stackSplitDecorativeSeparatorEnabled,
    stackSplitLowerHeight,
    stackSplitLowerDepthManual,
    stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual,
    stackSplitLowerDepth,
    stackSplitLowerWidth,
    stackSplitLowerDoors,
    hasAnyCellDimsOverrides,
    modulesCount,
    defaultCellWidth,
    cellDimsWidth,
    cellDimsHeight,
    cellDimsDepth,
    patterns,
    structureSelect,
    structureIsDefault,
    structureArr,
    isSliding,
    shouldShowStructureButtons,
    shouldShowSingleDoor,
    shouldShowHingeBtn,
  };
}
