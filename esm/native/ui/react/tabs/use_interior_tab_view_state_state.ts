import { useMemo } from 'react';

import type { AppContainer } from '../../../../../types';
import {
  useCfgSelector,
  useCfgSelectorShallow,
  useModeSelectorShallow,
  useUiSelectorShallow,
} from '../hooks.js';
import { selectHasInternalDrawersData } from '../selectors/config_selectors.js';
import {
  useInteriorTabLocalState,
  type InteriorTabLocalStateModel,
} from './interior_tab_local_state_runtime.js';
import type { InteriorTabViewState } from './use_interior_tab_view_state_contracts.js';
import type { InteriorTabViewStateSyncInput } from './interior_tab_view_state_controller_contracts.js';
import {
  deriveInteriorTabCoreState,
  readInteriorTabHandleCfgSnapshot,
  readInteriorTabModeConsts,
  readInteriorTabModeSnapshot,
  readInteriorTabUiSnapshot,
  type InteriorHandleCfgView,
  type InteriorModeView,
} from './interior_tab_view_state_core_runtime.js';

export type UseInteriorTabViewStateStateResult = {
  localState: InteriorTabLocalStateModel;
  syncInput: InteriorTabViewStateSyncInput;
  result: InteriorTabViewState;
};

export function useInteriorTabViewStateState(app: AppContainer): UseInteriorTabViewStateStateResult {
  const ui = useUiSelectorShallow(readInteriorTabUiSnapshot);
  const handleCfg = useCfgSelectorShallow<InteriorHandleCfgView>(readInteriorTabHandleCfgSnapshot);
  const hasIntDrawerData = useCfgSelector(selectHasInternalDrawersData);
  const wardrobeType = useCfgSelector(cfg =>
    String(cfg.wardrobeType || 'hinged') === 'sliding' ? 'sliding' : 'hinged'
  );
  const mode = useModeSelectorShallow<InteriorModeView>(readInteriorTabModeSnapshot);
  const modeConsts = useMemo(() => readInteriorTabModeConsts(app), [app]);
  const localState = useInteriorTabLocalState();

  const coreState = useMemo(
    () =>
      deriveInteriorTabCoreState({
        ui,
        handleCfg,
        mode,
        modeConsts,
        manualRowOpen: localState.manualRowOpen,
        manualUiTool: localState.manualUiTool,
      }),
    [ui, handleCfg, mode, modeConsts, localState.manualRowOpen, localState.manualUiTool]
  );

  const syncInput = useMemo<InteriorTabViewStateSyncInput>(
    () => ({
      wardrobeType,
      isExtDrawerMode: coreState.isExtDrawerMode,
      modeExtDrawer: modeConsts.modeExtDrawer,
      isSketchToolActive: coreState.isSketchToolActive,
      manualToolRaw: coreState.manualToolRaw,
      isDoorTrimMode: coreState.isDoorTrimMode,
      modeOpts: coreState.modeOpts,
      isManualLayoutMode: coreState.isManualLayoutMode,
      manualTool: coreState.manualTool,
    }),
    [
      wardrobeType,
      coreState.isExtDrawerMode,
      modeConsts.modeExtDrawer,
      coreState.isSketchToolActive,
      coreState.manualToolRaw,
      coreState.isDoorTrimMode,
      coreState.modeOpts,
      coreState.isManualLayoutMode,
      coreState.manualTool,
    ]
  );

  const result = useMemo<InteriorTabViewState>(
    () => ({
      modeOpts: coreState.modeOpts,
      wardrobeType,
      hasIntDrawerData,
      isLayoutMode: coreState.isLayoutMode,
      isManualLayoutMode: coreState.isManualLayoutMode,
      isBraceShelvesMode: coreState.isBraceShelvesMode,
      isSketchToolActive: coreState.isSketchToolActive,
      isExtDrawerMode: coreState.isExtDrawerMode,
      isDividerMode: coreState.isDividerMode,
      isIntDrawerMode: coreState.isIntDrawerMode,
      isHandleMode: coreState.isHandleMode,
      isManualHandlePositionMode: coreState.isManualHandlePositionMode,
      isDoorTrimMode: coreState.isDoorTrimMode,
      layoutActive: coreState.layoutActive,
      layoutType: coreState.layoutType,
      manualTool: coreState.manualTool,
      manualToolRaw: coreState.manualToolRaw,
      currentGridDivisions: coreState.currentGridDivisions,
      gridShelfVariant: coreState.gridShelfVariant,
      extDrawerType: coreState.extDrawerType,
      extDrawerCount: coreState.extDrawerCount,
      internalDrawersEnabled: coreState.internalDrawersEnabled,
      handleControlEnabled: coreState.handleControlEnabled,
      globalHandleType: coreState.globalHandleType,
      handleToolType: coreState.handleToolType,
      globalHandleColor: coreState.globalHandleColor,
      handleToolColor: coreState.handleToolColor,
      globalEdgeHandleVariant: coreState.globalEdgeHandleVariant,
      handleToolEdgeVariant: coreState.handleToolEdgeVariant,
      ...localState,
      gridDivs: [...localState.gridDivs],
      extCounts: [...localState.extCounts],
      showManualRow: coreState.showManualRow,
      activeManualToolForUi: coreState.activeManualToolForUi,
      showGridControls: coreState.showGridControls,
    }),
    [coreState, wardrobeType, hasIntDrawerData, localState]
  );

  return {
    localState,
    syncInput,
    result,
  };
}
