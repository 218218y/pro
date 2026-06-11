import { useApp } from '../hooks.js';

import { useStructureTabViewStateState } from './use_structure_tab_view_state_state.js';

export type { StructureTabViewState } from './use_structure_tab_view_state_contracts.js';

export function useStructureTabViewState() {
  const app = useApp();
  return useStructureTabViewStateState(app);
}
