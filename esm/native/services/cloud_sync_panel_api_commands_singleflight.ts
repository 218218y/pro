import type { CloudSyncPanelApiDeps, CloudSyncServiceLike } from '../../../types';

import { runCloudSyncOwnedAsyncFamilySingleFlight } from './cloud_sync_async_singleflight.js';
import type { CloudSyncPanelApiControlCommands } from './cloud_sync_panel_api_commands_controls.js';
import type { CloudSyncPanelApiRuntimeCommands } from './cloud_sync_panel_api_commands_runtime.js';
import {
  cloudSyncPanelApiCopyShareLinkFlights,
  cloudSyncPanelApiDeleteTempFlights,
  cloudSyncPanelApiFloatingSyncFlights,
  cloudSyncPanelApiSite2TabsGateFlights,
  cloudSyncPanelApiSyncSketchFlights,
} from './cloud_sync_panel_api_commands_shared.js';

function runCloudSyncPanelApiSingleFlight<T, Key extends string>(args: {
  owner: object;
  flights: WeakMap<object, import('./cloud_sync_async_singleflight.js').CloudSyncAsyncFamilyFlight<T, Key>>;
  key: Key;
  run: () => Promise<T>;
  onBusy?: ((activeKey: Key, requestedKey: Key, activePromise: Promise<T>) => T | Promise<T>) | null;
}): Promise<T> {
  return runCloudSyncOwnedAsyncFamilySingleFlight(args);
}

export function createCloudSyncPanelApiSingleFlightCommands(args: {
  deps: CloudSyncPanelApiDeps;
  runtime: CloudSyncPanelApiRuntimeCommands;
  controls: CloudSyncPanelApiControlCommands;
}): CloudSyncServiceLike {
  const { deps, runtime, controls } = args;
  const owner = deps.App;

  return {
    copyShareLink: (): ReturnType<NonNullable<typeof runtime.copyShareLink>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiCopyShareLinkFlights,
        key: 'copyShareLink',
        run: () => runtime.copyShareLink(),
      }),
    syncSketchNow: (): ReturnType<NonNullable<typeof runtime.syncSketchNow>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiSyncSketchFlights,
        key: 'syncSketchNow',
        run: () => runtime.syncSketchNow(),
      }),
    setFloatingSketchSyncEnabled: (
      enabled: boolean
    ): ReturnType<NonNullable<typeof runtime.setFloatingSketchSyncEnabled>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiFloatingSyncFlights,
        key: `set:${enabled ? '1' : '0'}`,
        run: () => runtime.setFloatingSketchSyncEnabled(enabled),
        onBusy: () => ({ ok: false, reason: 'busy' }),
      }),
    toggleFloatingSketchSyncEnabled: (): ReturnType<
      NonNullable<typeof runtime.toggleFloatingSketchSyncEnabled>
    > =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiFloatingSyncFlights,
        key: 'toggle',
        run: () => runtime.toggleFloatingSketchSyncEnabled(),
        onBusy: () => ({ ok: false, reason: 'busy' }),
      }),
    deleteTemporaryModels: (): ReturnType<NonNullable<typeof runtime.deleteTemporaryModels>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiDeleteTempFlights,
        key: 'models',
        run: () => runtime.deleteTemporaryModels(),
        onBusy: () => ({ ok: false, removed: 0, reason: 'busy' }),
      }),
    deleteTemporaryColors: (): ReturnType<NonNullable<typeof runtime.deleteTemporaryColors>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiDeleteTempFlights,
        key: 'colors',
        run: () => runtime.deleteTemporaryColors(),
        onBusy: () => ({ ok: false, removed: 0, reason: 'busy' }),
      }),
    setSite2TabsGateOpen: (open: boolean): ReturnType<NonNullable<typeof controls.setSite2TabsGateOpen>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiSite2TabsGateFlights,
        key: `open:${open ? '1' : '0'}`,
        run: () => controls.setSite2TabsGateOpen(open),
        onBusy: () => ({ ok: false, reason: 'busy' }),
      }),
    toggleSite2TabsGateOpen: (): ReturnType<NonNullable<typeof controls.toggleSite2TabsGateOpen>> =>
      runCloudSyncPanelApiSingleFlight({
        owner,
        flights: cloudSyncPanelApiSite2TabsGateFlights,
        key: 'toggle',
        run: () => controls.toggleSite2TabsGateOpen(),
        onBusy: () => ({ ok: false, reason: 'busy' }),
      }),
  };
}
