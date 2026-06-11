import type { AppContainer } from '../../../../../types';

import type { UseInteriorTabViewStateHook } from './use_interior_tab_view_state_contracts.js';
import { useInteriorTabViewStateState } from './use_interior_tab_view_state_state.js';
import { useInteriorTabViewStateSync } from './use_interior_tab_view_state_sync.js';

export type {
  HandleTypeOption,
  InteriorTabViewState,
  LayoutTypeOption,
  ManualToolOption,
} from './use_interior_tab_view_state_contracts.js';

export const useInteriorTabViewState: UseInteriorTabViewStateHook = (app: AppContainer) => {
  const { localState, syncInput, result } = useInteriorTabViewStateState(app);
  useInteriorTabViewStateSync(app, localState, syncInput);
  return result;
};
