import { useMemo } from 'react';

import type { AppContainer } from '../../../../../types';
import type { InteriorTabViewState } from './use_interior_tab_view_state.js';
import {
  createInteriorTabWorkflowController,
  type InteriorTabWorkflowController,
} from './interior_tab_workflows_controller_runtime.js';

export type UseInteriorTabWorkflowsResult = InteriorTabWorkflowController;

export function useInteriorTabWorkflows(
  app: AppContainer,
  state: InteriorTabViewState
): UseInteriorTabWorkflowsResult {
  return useMemo(
    () =>
      createInteriorTabWorkflowController({
        app,
        state,
      }),
    [app, state]
  );
}
