import { useApp, useUiFeedback } from '../hooks.js';

import { useDesignTabControllerSections } from './use_design_tab_controller_sections.js';
import { useDesignTabControllerState } from './use_design_tab_controller_state.js';

export type {
  DesignTabColorSectionModel,
  DesignTabControllerModel,
  DesignTabControllerState,
  DesignTabCorniceSectionModel,
  DesignTabDoorFeaturesSectionModel,
  DesignTabDoorStyleSectionModel,
} from './use_design_tab_controller_contracts.js';

export function useDesignTabController() {
  const app = useApp();
  const fb = useUiFeedback();
  const state = useDesignTabControllerState();
  return useDesignTabControllerSections({ app, fb, state });
}
