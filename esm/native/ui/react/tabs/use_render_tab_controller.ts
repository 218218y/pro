import { useApp, useMeta } from '../hooks.js';
import type { RenderTabControllerModel } from './use_render_tab_controller_contracts.js';
import { useRenderTabSections } from './use_render_tab_controller_sections.js';
import { useRenderTabState } from './use_render_tab_controller_state.js';

export type {
  RenderTabControllerModel,
  RenderTabControllerState,
  RenderTabDisplaySectionModel,
  RenderTabLightingSectionModel,
  RenderTabRoomSectionModel,
} from './use_render_tab_controller_contracts.js';

export function useRenderTabController(): RenderTabControllerModel {
  const app = useApp();
  const meta = useMeta();
  const state = useRenderTabState();
  return useRenderTabSections({ app, meta, state });
}
