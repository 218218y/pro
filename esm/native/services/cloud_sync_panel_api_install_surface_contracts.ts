import type { CloudSyncServiceLike } from '../../../types';

import type { InstallableCloudSyncPanelApi } from './cloud_sync_panel_api_install_context_runtime.js';

export type CloudSyncPanelApiStableMethodSpec = {
  key: keyof CloudSyncServiceLike;
  stableKey: string;
};

export const CLOUD_SYNC_PANEL_API_STABLE_METHOD_SPECS = [
  { key: 'getCurrentRoom', stableKey: '__wpCloudSyncGetCurrentRoom' },
  { key: 'getPublicRoom', stableKey: '__wpCloudSyncGetPublicRoom' },
  { key: 'getRoomParam', stableKey: '__wpCloudSyncGetRoomParam' },
  { key: 'getSyncRuntimeStatus', stableKey: '__wpCloudSyncGetSyncRuntimeStatus' },
  { key: 'setDiagnosticsEnabled', stableKey: '__wpCloudSyncSetDiagnosticsEnabled' },
  { key: 'getPanelSnapshot', stableKey: '__wpCloudSyncGetPanelSnapshot' },
  { key: 'subscribePanelSnapshot', stableKey: '__wpCloudSyncSubscribePanelSnapshot' },
  { key: 'goPublic', stableKey: '__wpCloudSyncGoPublic' },
  { key: 'goPrivate', stableKey: '__wpCloudSyncGoPrivate' },
  { key: 'getShareLink', stableKey: '__wpCloudSyncGetShareLink' },
  { key: 'copyShareLink', stableKey: '__wpCloudSyncCopyShareLink' },
  { key: 'syncSketchNow', stableKey: '__wpCloudSyncSyncSketchNow' },
  { key: 'isFloatingSketchSyncEnabled', stableKey: '__wpCloudSyncIsFloatingSketchSyncEnabled' },
  { key: 'setFloatingSketchSyncEnabled', stableKey: '__wpCloudSyncSetFloatingSketchSyncEnabled' },
  { key: 'toggleFloatingSketchSyncEnabled', stableKey: '__wpCloudSyncToggleFloatingSketchSyncEnabled' },
  {
    key: 'subscribeFloatingSketchSyncEnabled',
    stableKey: '__wpCloudSyncSubscribeFloatingSketchSyncEnabled',
  },
  { key: 'deleteTemporaryModels', stableKey: '__wpCloudSyncDeleteTemporaryModels' },
  { key: 'deleteTemporaryColors', stableKey: '__wpCloudSyncDeleteTemporaryColors' },
  { key: 'isSite2TabsGateEnabled', stableKey: '__wpCloudSyncIsSite2TabsGateEnabled' },
  { key: 'getSite2TabsGateSnapshot', stableKey: '__wpCloudSyncGetSite2TabsGateSnapshot' },
  { key: 'subscribeSite2TabsGateSnapshot', stableKey: '__wpCloudSyncSubscribeSite2TabsGateSnapshot' },
  { key: 'getSite2TabsGateOpen', stableKey: '__wpCloudSyncGetSite2TabsGateOpen' },
  { key: 'getSite2TabsGateUntil', stableKey: '__wpCloudSyncGetSite2TabsGateUntil' },
  { key: 'setSite2TabsGateOpen', stableKey: '__wpCloudSyncSetSite2TabsGateOpen' },
  { key: 'toggleSite2TabsGateOpen', stableKey: '__wpCloudSyncToggleSite2TabsGateOpen' },
];

function hasStableCloudSyncPanelApiMethod(api: InstallableCloudSyncPanelApi, stableKey: string): boolean {
  return typeof Reflect.get(api, stableKey) === 'function';
}

function clearLegacyInstalledCloudSyncPanelApiMethod(
  api: InstallableCloudSyncPanelApi,
  key: keyof CloudSyncServiceLike
): void {
  try {
    if (Reflect.deleteProperty(api, key)) return;
  } catch {
    // fall through to undefined assignment when delete traps or frozen surfaces block removal
  }
  Reflect.set(api, key, undefined);
}

export function clearLegacyInstalledCloudSyncPanelApiDrift(api: InstallableCloudSyncPanelApi): void {
  if (api.__wpCloudSyncPanelApiInstalled !== true) return;

  for (const spec of CLOUD_SYNC_PANEL_API_STABLE_METHOD_SPECS) {
    if (hasStableCloudSyncPanelApiMethod(api, spec.stableKey)) continue;
    clearLegacyInstalledCloudSyncPanelApiMethod(api, spec.key);
  }
}
