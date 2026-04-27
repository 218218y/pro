import type { AppContainer, CloudSyncPanelApiDeps } from '../../../types';

import { _cloudSyncReportNonFatal, __wp_toast } from './cloud_sync_support.js';

export type CloudSyncPanelApiInstallDeps = Pick<
  CloudSyncPanelApiDeps,
  | 'App'
  | 'cfg'
  | 'clientId'
  | 'diagEnabledRef'
  | 'tabsGateOpenRef'
  | 'tabsGateUntilRef'
  | 'getSite2TabsGateSnapshot'
  | 'subscribeSite2TabsGateSnapshot'
  | 'isTabsGateController'
  | 'site2TabsTtlMs'
  | 'now'
  | 'getCurrentRoom'
  | 'getPrivateRoom'
  | 'setPrivateRoom'
  | 'randomRoomId'
  | 'setRoomInUrl'
  | 'cloneRuntimeStatus'
  | 'runtimeStatus'
  | 'updateDiagEnabled'
  | 'publishStatus'
  | 'diag'
  | 'getDiagStorageMaybe'
  | 'getClipboardMaybe'
  | 'getPromptSinkMaybe'
  | 'syncSketchNow'
  | 'getFloatingSketchSyncEnabled'
  | 'setFloatingSketchSyncEnabledState'
  | 'pushFloatingSketchSyncPinnedNow'
  | 'subscribeFloatingSketchSyncEnabledState'
  | 'deleteTemporaryModelsInCloud'
  | 'deleteTemporaryColorsInCloud'
  | 'writeSite2TabsGateLocal'
  | 'patchSite2TabsGateUi'
  | 'pushTabsGateNow'
  | 'pullTabsGateOnce'
  | 'setTimeoutFn'
  | 'clearTimeoutFn'
> & {
  publicationEpoch?: number;
};

export type CloudSyncOwnerCleanupStack = Array<() => void>;

export function buildCloudSyncPanelApiDeps(deps: CloudSyncPanelApiInstallDeps): CloudSyncPanelApiDeps {
  return {
    App: deps.App,
    cfg: deps.cfg,
    clientId: deps.clientId,
    diagEnabledRef: deps.diagEnabledRef,
    tabsGateOpenRef: deps.tabsGateOpenRef,
    tabsGateUntilRef: deps.tabsGateUntilRef,
    getSite2TabsGateSnapshot: deps.getSite2TabsGateSnapshot,
    subscribeSite2TabsGateSnapshot: deps.subscribeSite2TabsGateSnapshot,
    isTabsGateController: deps.isTabsGateController,
    site2TabsTtlMs: deps.site2TabsTtlMs,
    now: deps.now,
    getCurrentRoom: deps.getCurrentRoom,
    getPrivateRoom: deps.getPrivateRoom,
    setPrivateRoom: deps.setPrivateRoom,
    randomRoomId: deps.randomRoomId,
    setRoomInUrl: deps.setRoomInUrl,
    cloneRuntimeStatus: deps.cloneRuntimeStatus,
    runtimeStatus: deps.runtimeStatus,
    updateDiagEnabled: deps.updateDiagEnabled,
    publishStatus: deps.publishStatus,
    diag: deps.diag,
    getDiagStorageMaybe: deps.getDiagStorageMaybe,
    getClipboardMaybe: deps.getClipboardMaybe,
    getPromptSinkMaybe: deps.getPromptSinkMaybe,
    reportNonFatal: _cloudSyncReportNonFatal,
    toast: __wp_toast,
    syncSketchNow: deps.syncSketchNow,
    getFloatingSketchSyncEnabled: deps.getFloatingSketchSyncEnabled,
    setFloatingSketchSyncEnabledState: deps.setFloatingSketchSyncEnabledState,
    pushFloatingSketchSyncPinnedNow: deps.pushFloatingSketchSyncPinnedNow,
    subscribeFloatingSketchSyncEnabledState: deps.subscribeFloatingSketchSyncEnabledState,
    deleteTemporaryModelsInCloud: deps.deleteTemporaryModelsInCloud,
    deleteTemporaryColorsInCloud: deps.deleteTemporaryColorsInCloud,
    writeSite2TabsGateLocal: deps.writeSite2TabsGateLocal,
    patchSite2TabsGateUi: deps.patchSite2TabsGateUi,
    pushTabsGateNow: deps.pushTabsGateNow,
    pullTabsGateOnce: deps.pullTabsGateOnce,
    ...(typeof deps.setTimeoutFn === 'function' ? { setTimeoutFn: deps.setTimeoutFn } : {}),
    ...(typeof deps.clearTimeoutFn === 'function' ? { clearTimeoutFn: deps.clearTimeoutFn } : {}),
  };
}

export function reportCloudSyncOwnerSupportError(
  App: AppContainer,
  op: string,
  error: unknown,
  throttleMs = 4000
): void {
  _cloudSyncReportNonFatal(App, op, error, { throttleMs });
}
