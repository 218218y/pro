import type { ActionMetaLike, AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { closeInteractiveOnGlobalOff } from '../actions/interactive_actions.js';
import { setRuntimeGlobalClickMode } from '../actions/store_actions.js';
import { reportUiNonFatal } from '../../feedback_shared.js';

export function syncGlobalClickMode(app: AppContainer, enabled: boolean, meta?: ActionMetaLike): void {
  const nextMeta: ActionMetaLike =
    meta && typeof meta === 'object' ? meta : { source: 'react:settingsVisual:globalClick' };
  try {
    setRuntimeGlobalClickMode(app, !!enabled, nextMeta);
  } catch (error) {
    reportUiNonFatal(app, 'settingsVisual.syncGlobalClickMode', error, {
      where: 'native/ui/react/tabs/settings',
    });
  }
}

export function closeInteractiveStateOnGlobalOff(app: AppContainer): void {
  try {
    closeInteractiveOnGlobalOff(app);
  } catch (error) {
    reportUiNonFatal(app, 'settingsVisual.closeInteractiveStateOnGlobalOff', error, {
      where: 'native/ui/react/tabs/settings',
    });
  }
}

export function getImmediateMeta(meta: MetaActionsNamespaceLike, source: string): ActionMetaLike {
  return meta.uiOnlyImmediate(source);
}
