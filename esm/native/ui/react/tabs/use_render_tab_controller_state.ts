import { useCfgSelectorShallow, useRuntimeSelectorShallow, useUiSelectorShallow } from '../hooks.js';
import type { RenderTabControllerState } from './use_render_tab_controller_contracts.js';
import {
  readRenderTabCfgState,
  readRenderTabRuntimeState,
  readRenderTabUiState,
} from './render_tab_view_state_runtime.js';

export function useRenderTabState(): RenderTabControllerState {
  const cfgState = useCfgSelectorShallow(cfg => readRenderTabCfgState(cfg));
  const uiState = useUiSelectorShallow(ui => readRenderTabUiState(ui));
  const runtimeState = useRuntimeSelectorShallow(rt => readRenderTabRuntimeState(rt));

  return {
    ...cfgState,
    ...uiState,
    ...runtimeState,
  };
}
