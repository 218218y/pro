import { useCfgSelectorShallow, useRuntimeSelectorShallow, useUiSelectorShallow } from '../hooks.js';
import type { SettingsVisualControllerState } from './use_settings_visual_controller_contracts.js';
import {
  readSettingsVisualCfgState,
  readSettingsVisualRuntimeState,
  readSettingsVisualUiState,
} from './settings_visual_view_state_runtime.js';

export function useSettingsVisualState(): SettingsVisualControllerState {
  const cfgState = useCfgSelectorShallow(
    cfg => readSettingsVisualCfgState(cfg),
    ['visibility', 'appearance', 'room']
  );
  const uiState = useUiSelectorShallow(
    ui => readSettingsVisualUiState(ui),
    ['structure', 'visibility', 'interaction', 'appearance', 'room']
  );
  const runtimeState = useRuntimeSelectorShallow(rt => readSettingsVisualRuntimeState(rt), 'interaction');

  return {
    ...cfgState,
    ...uiState,
    ...runtimeState,
  };
}
