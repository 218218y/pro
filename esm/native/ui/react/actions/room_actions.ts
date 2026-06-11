// React UI actions: room helpers

import type {
  ActionMetaLike,
  AppContainer,
  DoorsSetOpenOptionsLike,
  WardrobeType,
} from '../../../../../types';

import { setDoorsOpen } from '../../../services/api.js';
import { getRoomActionFn } from '../../../services/api.js';

function readSetManualWidthAction(
  app: AppContainer
): ((next: boolean, nextMeta?: ActionMetaLike) => unknown) | null {
  return getRoomActionFn<(next: boolean, nextMeta?: ActionMetaLike) => unknown>(app, 'setManualWidth');
}

function readSetWardrobeTypeAction(app: AppContainer): ((next: WardrobeType) => unknown) | null {
  return getRoomActionFn<(next: WardrobeType) => unknown>(app, 'setWardrobeType');
}

export function setRoomOpen(app: AppContainer, open: unknown, opts?: DoorsSetOpenOptionsLike): void {
  const on = !!open;
  const options: DoorsSetOpenOptionsLike = opts ? { ...opts } : { forceUpdate: true };

  try {
    setDoorsOpen(app, on, options);
  } catch {
    // ignore
  }
}

export function setManualWidth(app: AppContainer, isManual: boolean, meta?: ActionMetaLike): unknown {
  const m: ActionMetaLike = meta ? { ...meta } : { source: 'react:manualWidth' };

  try {
    const setManualWidthAction = readSetManualWidthAction(app);
    if (setManualWidthAction) return setManualWidthAction(!!isManual, m);
  } catch {
    // ignore
  }

  return undefined;
}

export function setWardrobeType(app: AppContainer, t: WardrobeType): unknown {
  try {
    const setWardrobeTypeAction = readSetWardrobeTypeAction(app);
    if (setWardrobeTypeAction) return setWardrobeTypeAction(t);
  } catch {
    // ignore
  }
  return undefined;
}
