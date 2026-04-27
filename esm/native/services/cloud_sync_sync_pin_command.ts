import type {
  AppContainer,
  CloudSyncNonFatalReportOptions,
  CloudSyncSyncPinCommandReason,
  CloudSyncSyncPinCommandResult,
} from '../../../types';

import {
  runCloudSyncOwnedAsyncFamilySingleFlight,
  type CloudSyncAsyncFamilyFlight,
} from './cloud_sync_async_singleflight.js';
import {
  readCloudSyncCommandBoolean,
  readCloudSyncCommandMessage,
  readCloudSyncCommandReason,
} from './cloud_sync_command_shared.js';

export type CloudSyncSyncPinCommandDeps = {
  App: AppContainer;
  getFloatingSketchSyncEnabled: () => boolean;
  setFloatingSketchSyncEnabledState: (enabled: boolean) => boolean;
  pushFloatingSketchSyncPinnedNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  reportNonFatal: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: CloudSyncNonFatalReportOptions
  ) => void;
};

type FloatingSketchSyncPinCommandKey = 'enabled' | 'disabled';

const floatingSketchSyncPinCommandFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncSyncPinCommandResult, FloatingSketchSyncPinCommandKey>
>();

const CLOUD_SYNC_SYNC_PIN_COMMAND_REASONS = [
  'busy',
  'room',
  'write',
  'sync-failed',
  'error',
  'not-installed',
] as const satisfies readonly CloudSyncSyncPinCommandReason[];

export function runFloatingSketchSyncPinCommand(
  deps: CloudSyncSyncPinCommandDeps,
  nextEnabled: boolean
): Promise<CloudSyncSyncPinCommandResult> {
  const {
    App,
    getFloatingSketchSyncEnabled,
    setFloatingSketchSyncEnabledState,
    pushFloatingSketchSyncPinnedNow,
    reportNonFatal,
  } = deps;

  const key: FloatingSketchSyncPinCommandKey = nextEnabled ? 'enabled' : 'disabled';

  return runCloudSyncOwnedAsyncFamilySingleFlight({
    owner: App as object,
    flights: floatingSketchSyncPinCommandFlights,
    key,
    onBusy: () => ({ ok: false, reason: 'busy' }),
    run: async () => {
      const currentEnabled = readCloudSyncCommandBoolean(getFloatingSketchSyncEnabled(), false);
      const targetEnabled = !!nextEnabled;
      if (currentEnabled === targetEnabled) {
        return { ok: true, changed: false, enabled: targetEnabled } satisfies CloudSyncSyncPinCommandResult;
      }

      setFloatingSketchSyncEnabledState(targetEnabled);

      const pushed = await pushFloatingSketchSyncPinnedNow(targetEnabled);
      if (pushed && pushed.ok) {
        return { ok: true, changed: true, enabled: targetEnabled } satisfies CloudSyncSyncPinCommandResult;
      }

      try {
        setFloatingSketchSyncEnabledState(currentEnabled);
      } catch (err) {
        reportNonFatal(App, 'services/cloud_sync.syncPin.rollbackState', err, { throttleMs: 4000 });
      }

      const pushFailure = pushed && pushed.ok === false ? pushed : null;
      const message = readCloudSyncCommandMessage(
        pushFailure && 'message' in pushFailure ? pushFailure.message : undefined
      );
      return {
        ok: false,
        changed: true,
        enabled: readCloudSyncCommandBoolean(getFloatingSketchSyncEnabled(), currentEnabled),
        reason:
          readCloudSyncCommandReason(pushFailure?.reason, CLOUD_SYNC_SYNC_PIN_COMMAND_REASONS) ||
          'sync-failed',
        ...(message ? { message } : {}),
        rolledBack: true,
      } satisfies CloudSyncSyncPinCommandResult;
    },
  });
}

export function toggleFloatingSketchSyncPinCommand(
  deps: CloudSyncSyncPinCommandDeps
): Promise<CloudSyncSyncPinCommandResult> {
  return runFloatingSketchSyncPinCommand(
    deps,
    !readCloudSyncCommandBoolean(deps.getFloatingSketchSyncEnabled(), false)
  );
}
