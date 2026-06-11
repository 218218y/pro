import { useEffect, useMemo } from 'react';

import type { AppContainer } from '../../../../../types';
import type { InteriorTabLocalStateModel } from './interior_tab_local_state_runtime.js';
import type { InteriorTabViewStateSyncInput } from './interior_tab_view_state_controller_contracts.js';
import {
  createInteriorTabViewStateControllerArgs,
  createInteriorTabViewStateControllerMemoDeps,
} from './interior_tab_view_state_bindings_runtime.js';
import { createInteriorTabViewStateController } from './interior_tab_view_state_controller_runtime.js';

export function useInteriorTabViewStateSync(
  app: AppContainer,
  localState: InteriorTabLocalStateModel,
  syncInput: InteriorTabViewStateSyncInput
): void {
  const controllerArgs = useMemo(
    () => createInteriorTabViewStateControllerArgs(app, localState),
    createInteriorTabViewStateControllerMemoDeps(app, localState)
  );

  const viewStateController = useMemo(
    () => createInteriorTabViewStateController(controllerArgs),
    [controllerArgs]
  );

  useEffect(() => {
    viewStateController.syncFromViewState(syncInput);
  }, [viewStateController, syncInput]);
}
