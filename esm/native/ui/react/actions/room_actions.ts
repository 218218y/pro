// React UI actions: room helpers

import type {
  ActionMetaLike,
  AppContainer,
  DoorsSetOpenOptionsLike,
  WardrobeType,
} from '../../../../../types';

import { setDoorsOpen } from '../../../services/api.js';
import { getRoomActionFn } from '../../../services/api.js';
import { reportUiNonFatal, reportUiRejected } from '../../feedback_shared.js';

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
  } catch (error) {
    reportUiNonFatal(app, 'roomActions.setRoomOpen', error, { where: 'native/ui/react/actions' });
  }
}

export function setManualWidth(app: AppContainer, isManual: boolean, meta?: ActionMetaLike): unknown {
  const m: ActionMetaLike = meta ? { ...meta } : { source: 'react:manualWidth' };

  try {
    const setManualWidthAction = readSetManualWidthAction(app);
    if (!setManualWidthAction) {
      reportUiRejected(
        app,
        'roomActions.setManualWidth',
        'Missing room.setManualWidth action.',
        'native/ui/react/actions'
      );
      return undefined;
    }
    const result = setManualWidthAction(!!isManual, m);
    if (result === false) {
      reportUiRejected(
        app,
        'roomActions.setManualWidth',
        'room.setManualWidth rejected the mutation.',
        'native/ui/react/actions'
      );
    }
    return result;
  } catch (error) {
    reportUiNonFatal(app, 'roomActions.setManualWidth', error, { where: 'native/ui/react/actions' });
  }

  return undefined;
}

export function setWardrobeType(app: AppContainer, t: WardrobeType): unknown {
  try {
    const setWardrobeTypeAction = readSetWardrobeTypeAction(app);
    if (!setWardrobeTypeAction) {
      reportUiRejected(
        app,
        'roomActions.setWardrobeType',
        'Missing room.setWardrobeType action.',
        'native/ui/react/actions'
      );
      return undefined;
    }
    const result = setWardrobeTypeAction(t);
    if (result === false) {
      reportUiRejected(
        app,
        'roomActions.setWardrobeType',
        'room.setWardrobeType rejected the mutation.',
        'native/ui/react/actions'
      );
    }
    return result;
  } catch (error) {
    reportUiNonFatal(app, 'roomActions.setWardrobeType', error, { where: 'native/ui/react/actions' });
  }
  return undefined;
}
