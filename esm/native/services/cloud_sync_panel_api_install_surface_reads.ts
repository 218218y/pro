import type {
  CloudSyncPanelSnapshot,
  CloudSyncRuntimeStatus,
  CloudSyncSite2TabsGateSnapshot,
} from '../../../types';

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  subscribeCloudSyncBridge,
  type CloudSyncPanelApiBridges,
} from './cloud_sync_panel_api_install_bridges.js';
import {
  invokeCloudSyncPanelApi,
  type CloudSyncListener,
  type CloudSyncPanelApiInstallContext,
  type InstallableCloudSyncPanelApi,
} from './cloud_sync_panel_api_install_context_runtime.js';
import {
  readCloudSyncPanelApiPanelSnapshot,
  readCloudSyncPanelApiRuntimeStatus,
  readCloudSyncPanelApiSite2TabsGateSnapshot,
} from './cloud_sync_panel_api_install_public_snapshots.js';

export function installCloudSyncPanelApiReadRefs(
  api: InstallableCloudSyncPanelApi,
  context: CloudSyncPanelApiInstallContext,
  bridges: CloudSyncPanelApiBridges
): void {
  installStableSurfaceMethod(api, 'getCurrentRoom', '__wpCloudSyncGetCurrentRoom', () => {
    return (): string => invokeCloudSyncPanelApi(context, 'getCurrentRoom', '');
  });
  installStableSurfaceMethod(api, 'getPublicRoom', '__wpCloudSyncGetPublicRoom', () => {
    return (): string => invokeCloudSyncPanelApi(context, 'getPublicRoom', '');
  });
  installStableSurfaceMethod(api, 'getRoomParam', '__wpCloudSyncGetRoomParam', () => {
    return (): string => invokeCloudSyncPanelApi(context, 'getRoomParam', '');
  });
  installStableSurfaceMethod(api, 'getSyncRuntimeStatus', '__wpCloudSyncGetSyncRuntimeStatus', () => {
    return (): CloudSyncRuntimeStatus => readCloudSyncPanelApiRuntimeStatus(context);
  });
  installStableSurfaceMethod(api, 'getPanelSnapshot', '__wpCloudSyncGetPanelSnapshot', () => {
    return (): CloudSyncPanelSnapshot => readCloudSyncPanelApiPanelSnapshot(context);
  });
  installStableSurfaceMethod(api, 'subscribePanelSnapshot', '__wpCloudSyncSubscribePanelSnapshot', () => {
    return (fn: CloudSyncListener<CloudSyncPanelSnapshot>): (() => void) =>
      subscribeCloudSyncBridge(context, bridges.panel, fn);
  });
  installStableSurfaceMethod(
    api,
    'isFloatingSketchSyncEnabled',
    '__wpCloudSyncIsFloatingSketchSyncEnabled',
    () => {
      return (): boolean => invokeCloudSyncPanelApi(context, 'isFloatingSketchSyncEnabled', false);
    }
  );
  installStableSurfaceMethod(
    api,
    'subscribeFloatingSketchSyncEnabled',
    '__wpCloudSyncSubscribeFloatingSketchSyncEnabled',
    () => {
      return (fn: CloudSyncListener<boolean>): (() => void) =>
        subscribeCloudSyncBridge(context, bridges.floating, fn);
    }
  );
  installStableSurfaceMethod(api, 'isSite2TabsGateEnabled', '__wpCloudSyncIsSite2TabsGateEnabled', () => {
    return (): boolean => invokeCloudSyncPanelApi(context, 'isSite2TabsGateEnabled', false);
  });
  installStableSurfaceMethod(api, 'getSite2TabsGateSnapshot', '__wpCloudSyncGetSite2TabsGateSnapshot', () => {
    return (): CloudSyncSite2TabsGateSnapshot => readCloudSyncPanelApiSite2TabsGateSnapshot(context);
  });
  installStableSurfaceMethod(
    api,
    'subscribeSite2TabsGateSnapshot',
    '__wpCloudSyncSubscribeSite2TabsGateSnapshot',
    () => {
      return (fn: CloudSyncListener<CloudSyncSite2TabsGateSnapshot>): (() => void) =>
        subscribeCloudSyncBridge(context, bridges.tabsGate, fn);
    }
  );
  installStableSurfaceMethod(api, 'getSite2TabsGateOpen', '__wpCloudSyncGetSite2TabsGateOpen', () => {
    return (): boolean => invokeCloudSyncPanelApi(context, 'getSite2TabsGateOpen', false);
  });
  installStableSurfaceMethod(api, 'getSite2TabsGateUntil', '__wpCloudSyncGetSite2TabsGateUntil', () => {
    return (): number => invokeCloudSyncPanelApi(context, 'getSite2TabsGateUntil', 0);
  });
}
