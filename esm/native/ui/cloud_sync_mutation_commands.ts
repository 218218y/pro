import type { AppContainer, CloudSyncDeleteTempResult, CloudSyncSketchCommandResult } from '../../../types';

import { runAppConfirmedActionFamilySingleFlight } from './confirmed_action_family_runtime.js';
import type { AppActionFamilyFlight } from './action_family_singleflight.js';
import {
  deleteTemporaryColors,
  deleteTemporaryModels,
  syncSketchNow,
} from './react/actions/cloud_sync_actions.js';

const deleteTempFlights = new WeakMap<
  object,
  AppActionFamilyFlight<CloudSyncDeleteTempResult, 'models' | 'colors'>
>();

export function syncSketchNowCommand(App: AppContainer): Promise<CloudSyncSketchCommandResult> {
  return syncSketchNow(App);
}

function buildDeleteTempBusyResult(): CloudSyncDeleteTempResult {
  return { ok: false, removed: 0, reason: 'busy' };
}

function runDeleteTempWithConfirm(
  App: AppContainer,
  key: 'models' | 'colors',
  title: string,
  message: string,
  runConfirmedDelete: () => Promise<CloudSyncDeleteTempResult>
): Promise<CloudSyncDeleteTempResult> {
  return runAppConfirmedActionFamilySingleFlight({
    flights: deleteTempFlights,
    app: App,
    key,
    title,
    message,
    onRequestError: reason => ({ ok: false, removed: 0, reason: 'error', message: reason }),
    onCancelled: () => ({ ok: false, removed: 0, reason: 'cancelled' }),
    runConfirmed: runConfirmedDelete,
    onBusy: buildDeleteTempBusyResult,
  });
}

export function deleteTemporaryModelsWithConfirm(App: AppContainer): Promise<CloudSyncDeleteTempResult> {
  return runDeleteTempWithConfirm(
    App,
    'models',
    'מחיקת דגמים זמניים',
    'למחוק עכשיו דגמים זמניים מהענן? פעולה זו לא ניתנת לביטול.',
    () => deleteTemporaryModels(App)
  );
}

export function deleteTemporaryColorsWithConfirm(App: AppContainer): Promise<CloudSyncDeleteTempResult> {
  return runDeleteTempWithConfirm(
    App,
    'colors',
    'מחיקת צבעים זמניים',
    'למחוק עכשיו צבעים זמניים מהענן? פעולה זו לא ניתנת לביטול.',
    () => deleteTemporaryColors(App)
  );
}
