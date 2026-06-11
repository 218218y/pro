import type {
  CloudSyncDeleteTempResult,
  CloudSyncServiceLike,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../types';

import type { CloudSyncAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';
import type { CloudSyncPanelApiControlCommands } from './cloud_sync_panel_api_commands_controls.js';
import type { CloudSyncPanelApiRuntimeCommands } from './cloud_sync_panel_api_commands_runtime.js';
import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';

export type CloudSyncPanelApiDeleteTempKey = 'models' | 'colors';
export type CloudSyncPanelApiFloatingSyncKey = 'set:0' | 'set:1' | 'toggle';
export type CloudSyncPanelApiSite2TabsGateKey = 'open:0' | 'open:1' | 'toggle';

export const cloudSyncPanelApiCopyShareLinkFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncShareLinkCommandResult, 'copyShareLink'>
>();
export const cloudSyncPanelApiSyncSketchFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncSketchCommandResult, 'syncSketchNow'>
>();
export const cloudSyncPanelApiDeleteTempFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncDeleteTempResult, CloudSyncPanelApiDeleteTempKey>
>();
export const cloudSyncPanelApiFloatingSyncFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncSyncPinCommandResult, CloudSyncPanelApiFloatingSyncKey>
>();
export const cloudSyncPanelApiSite2TabsGateFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncTabsGateCommandResult, CloudSyncPanelApiSite2TabsGateKey>
>();

export function createCloudSyncPanelApiStaticCommands(args: {
  runtime: CloudSyncPanelApiRuntimeCommands;
  controls: CloudSyncPanelApiControlCommands;
  snapshots: CloudSyncPanelSnapshotController;
}): CloudSyncServiceLike {
  const { runtime, controls, snapshots } = args;
  return {
    getPanelSnapshot: snapshots.getPanelSnapshot,
    subscribePanelSnapshot: snapshots.subscribePanelSnapshot,
    getCurrentRoom: runtime.getCurrentRoom,
    getPublicRoom: runtime.getPublicRoom,
    getRoomParam: runtime.getRoomParam,
    getSyncRuntimeStatus: runtime.getSyncRuntimeStatus,
    setDiagnosticsEnabled: runtime.setDiagnosticsEnabled,
    goPublic: runtime.goPublic,
    goPrivate: runtime.goPrivate,
    getShareLink: runtime.getShareLink,
    isFloatingSketchSyncEnabled: runtime.isFloatingSketchSyncEnabled,
    subscribeFloatingSketchSyncEnabled: runtime.subscribeFloatingSketchSyncEnabled,
    isSite2TabsGateEnabled: controls.isSite2TabsGateEnabled,
    getSite2TabsGateSnapshot: controls.getSite2TabsGateSnapshot,
    subscribeSite2TabsGateSnapshot: controls.subscribeSite2TabsGateSnapshot,
    getSite2TabsGateOpen: controls.getSite2TabsGateOpen,
    getSite2TabsGateUntil: controls.getSite2TabsGateUntil,
  };
}
