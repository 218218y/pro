import type { ActionMetaLike, AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { closeInteractiveOnGlobalOff } from '../actions/interactive_actions.js';
import { setRuntimeGlobalClickMode } from '../actions/store_actions.js';
import {
  getUiNotesServiceMaybe,
  isNotesScreenDrawMode,
  subscribeNotesDrawMode,
} from '../../../services/api.js';

import type { UiNotesControlsLike } from './render_tab_shared_contracts.js';
import { isRecord } from './render_tab_shared_normalize.js';

function isUiNotesControlsLike(value: unknown): value is UiNotesControlsLike {
  return isRecord(value);
}

export function syncGlobalClickMode(app: AppContainer, enabled: boolean, meta?: ActionMetaLike): void {
  const nextMeta: ActionMetaLike =
    meta && typeof meta === 'object' ? meta : { source: 'react:renderTab:globalClick' };
  try {
    setRuntimeGlobalClickMode(app, !!enabled, nextMeta);
  } catch {
    // ignore
  }
}

export function closeInteractiveStateOnGlobalOff(app: AppContainer): void {
  try {
    closeInteractiveOnGlobalOff(app);
  } catch {
    // ignore
  }
}

export function isNotesDrawMode(app: AppContainer): boolean {
  try {
    return isNotesScreenDrawMode(app);
  } catch {
    return false;
  }
}

export function subscribeToNotesDrawMode(app: AppContainer, listener: (active: boolean) => void): () => void {
  try {
    return subscribeNotesDrawMode(app, listener);
  } catch {
    return () => {};
  }
}

export function getUiNotesControls(app: AppContainer): UiNotesControlsLike | null {
  try {
    const uiNotes = getUiNotesServiceMaybe(app);
    return isUiNotesControlsLike(uiNotes) ? uiNotes : null;
  } catch {
    return null;
  }
}

export function getImmediateMeta(meta: MetaActionsNamespaceLike, source: string): ActionMetaLike {
  return meta.uiOnlyImmediate(source);
}
