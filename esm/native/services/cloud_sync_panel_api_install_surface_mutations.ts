import type {
  CloudSyncDeleteTempResult,
  CloudSyncRoomModeCommandResult,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../types';

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  invokeCloudSyncPanelApi,
  type CloudSyncPanelApiInstallContext,
  type InstallableCloudSyncPanelApi,
} from './cloud_sync_panel_api_install_context_runtime.js';

const NOT_INSTALLED_GO_PUBLIC_RESULT = {
  ok: false,
  mode: 'public',
  reason: 'not-installed',
} satisfies CloudSyncRoomModeCommandResult;

const NOT_INSTALLED_GO_PRIVATE_RESULT = {
  ok: false,
  mode: 'private',
  reason: 'not-installed',
} satisfies CloudSyncRoomModeCommandResult;

const UNAVAILABLE_SHARE_LINK_RESULT = Promise.resolve({
  ok: false,
  reason: 'unavailable',
} satisfies CloudSyncShareLinkCommandResult);

const NOT_INSTALLED_SKETCH_SYNC_RESULT = Promise.resolve({
  ok: false,
  reason: 'not-installed',
} satisfies CloudSyncSketchCommandResult);

const NOT_INSTALLED_FLOATING_SYNC_RESULT = Promise.resolve({
  ok: false,
  reason: 'not-installed',
} satisfies CloudSyncSyncPinCommandResult);

const NOT_INSTALLED_DELETE_TEMP_RESULT = Promise.resolve({
  ok: false,
  removed: 0,
  reason: 'not-installed',
} satisfies CloudSyncDeleteTempResult);

const NOT_INSTALLED_TABS_GATE_RESULT = Promise.resolve({
  ok: false,
  reason: 'not-installed',
} satisfies CloudSyncTabsGateCommandResult);

export function installCloudSyncPanelApiMutationRefs(
  api: InstallableCloudSyncPanelApi,
  context: CloudSyncPanelApiInstallContext
): void {
  installStableSurfaceMethod(api, 'setDiagnosticsEnabled', '__wpCloudSyncSetDiagnosticsEnabled', () => {
    return (enabled: boolean): void => {
      void invokeCloudSyncPanelApi(context, 'setDiagnosticsEnabled', undefined, enabled);
    };
  });
  installStableSurfaceMethod(api, 'goPublic', '__wpCloudSyncGoPublic', () => {
    return () => invokeCloudSyncPanelApi(context, 'goPublic', NOT_INSTALLED_GO_PUBLIC_RESULT);
  });
  installStableSurfaceMethod(api, 'goPrivate', '__wpCloudSyncGoPrivate', () => {
    return () => invokeCloudSyncPanelApi(context, 'goPrivate', NOT_INSTALLED_GO_PRIVATE_RESULT);
  });
  installStableSurfaceMethod(api, 'getShareLink', '__wpCloudSyncGetShareLink', () => {
    return (): string => invokeCloudSyncPanelApi(context, 'getShareLink', '');
  });
  installStableSurfaceMethod(api, 'copyShareLink', '__wpCloudSyncCopyShareLink', () => {
    return async () => await invokeCloudSyncPanelApi(context, 'copyShareLink', UNAVAILABLE_SHARE_LINK_RESULT);
  });
  installStableSurfaceMethod(api, 'syncSketchNow', '__wpCloudSyncSyncSketchNow', () => {
    return async () =>
      await invokeCloudSyncPanelApi(context, 'syncSketchNow', NOT_INSTALLED_SKETCH_SYNC_RESULT);
  });
  installStableSurfaceMethod(
    api,
    'setFloatingSketchSyncEnabled',
    '__wpCloudSyncSetFloatingSketchSyncEnabled',
    () => {
      return async (enabled: boolean) =>
        await invokeCloudSyncPanelApi(
          context,
          'setFloatingSketchSyncEnabled',
          NOT_INSTALLED_FLOATING_SYNC_RESULT,
          enabled
        );
    }
  );
  installStableSurfaceMethod(
    api,
    'toggleFloatingSketchSyncEnabled',
    '__wpCloudSyncToggleFloatingSketchSyncEnabled',
    () => {
      return async () =>
        await invokeCloudSyncPanelApi(
          context,
          'toggleFloatingSketchSyncEnabled',
          NOT_INSTALLED_FLOATING_SYNC_RESULT
        );
    }
  );
  installStableSurfaceMethod(api, 'deleteTemporaryModels', '__wpCloudSyncDeleteTemporaryModels', () => {
    return async () =>
      await invokeCloudSyncPanelApi(context, 'deleteTemporaryModels', NOT_INSTALLED_DELETE_TEMP_RESULT);
  });
  installStableSurfaceMethod(api, 'deleteTemporaryColors', '__wpCloudSyncDeleteTemporaryColors', () => {
    return async () =>
      await invokeCloudSyncPanelApi(context, 'deleteTemporaryColors', NOT_INSTALLED_DELETE_TEMP_RESULT);
  });
  installStableSurfaceMethod(api, 'setSite2TabsGateOpen', '__wpCloudSyncSetSite2TabsGateOpen', () => {
    return async (open: boolean) =>
      await invokeCloudSyncPanelApi(context, 'setSite2TabsGateOpen', NOT_INSTALLED_TABS_GATE_RESULT, open);
  });
  installStableSurfaceMethod(api, 'toggleSite2TabsGateOpen', '__wpCloudSyncToggleSite2TabsGateOpen', () => {
    return async () =>
      await invokeCloudSyncPanelApi(context, 'toggleSite2TabsGateOpen', NOT_INSTALLED_TABS_GATE_RESULT);
  });
}
