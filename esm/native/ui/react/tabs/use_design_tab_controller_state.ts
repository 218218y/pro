import { useMemo } from 'react';

import { useCfgSelectorShallow, useModeSelectorShallow, useUiSelectorShallow } from '../hooks.js';
import { readDesignTabModeState } from './design_tab_shared.js';
import {
  deriveDesignTabDoorFeaturesState,
  readDesignTabCfgState,
  readDesignTabUiState,
} from './design_tab_view_state_runtime.js';

import type { DesignTabControllerState } from './use_design_tab_controller_contracts.js';

export function useDesignTabControllerState(): DesignTabControllerState {
  const cfgState = useCfgSelectorShallow(cfg => readDesignTabCfgState(cfg));
  const uiState = useUiSelectorShallow(ui => readDesignTabUiState(ui));
  const modeState = useModeSelectorShallow(mode => readDesignTabModeState(mode));

  const { grooveLinesCount, grooveLinesCountIsAuto } = useMemo(
    () =>
      deriveDesignTabDoorFeaturesState({
        wardrobeType: cfgState.wardrobeType,
        grooveLinesCountOverride: cfgState.grooveLinesCountOverride,
        groovesEnabled: uiState.groovesEnabled,
        splitDoors: uiState.splitDoors,
        removeDoorsEnabled: uiState.removeDoorsEnabled,
      }),
    [
      cfgState.wardrobeType,
      cfgState.grooveLinesCountOverride,
      uiState.groovesEnabled,
      uiState.splitDoors,
      uiState.removeDoorsEnabled,
    ]
  );

  return useMemo(
    () => ({
      ...cfgState,
      ...uiState,
      ...modeState,
      grooveLinesCount,
      grooveLinesCountIsAuto,
    }),
    [cfgState, uiState, modeState, grooveLinesCount, grooveLinesCountIsAuto]
  );
}
