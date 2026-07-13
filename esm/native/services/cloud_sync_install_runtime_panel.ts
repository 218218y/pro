import { cloneRuntimeStatus } from './cloud_sync_support.js';
import { setRoomCredentialInUrl } from './cloud_sync_config.js';
import { installCloudSyncPanelApi } from './cloud_sync_owner_support.js';
import type {
  CloudSyncInstallRuntime,
  CloudSyncInstallRuntimeArgs,
} from './cloud_sync_install_runtime_shared.js';

export function installCloudSyncInstallRuntimePanelApi(
  args: CloudSyncInstallRuntimeArgs,
  runtime: CloudSyncInstallRuntime
): void {
  const { App, ownerContext } = args;
  const {
    cfg,
    currentRoom,
    currentRoomToken,
    getPrivateRoom,
    getPrivateRoomToken,
    setPrivateRoomCredential,
    issuePrivateRoom,
    clientId,
    runtimeStatus,
    diagEnabledRef,
    updateDiagEnabled,
    publishStatus,
    diag,
    publicationEpoch,
    getDiagStorageMaybe,
    getClipboardMaybe,
    getPromptSinkMaybe,
  } = ownerContext;
  const { cloudSyncTabsGate, cloudSyncSketch, deleteTemporaryModelsInCloud, deleteTemporaryColorsInCloud } =
    runtime;
  const {
    isTabsGateController,
    site2TabsTtlMs,
    tabsGateOpenRef,
    tabsGateUntilRef,
    getSnapshot: getSite2TabsGateSnapshot,
    subscribeSnapshot: subscribeSite2TabsGateSnapshot,
    writeSite2TabsGateLocal,
    patchSite2TabsGateUi,
    pushTabsGateNow,
    pullTabsGateOnce,
  } = cloudSyncTabsGate;
  const {
    syncSketchNow,
    getFloatingSketchSyncEnabled,
    setFloatingSketchSyncEnabledState,
    pushFloatingSketchSyncPinnedNow,
    subscribeFloatingSketchSyncEnabledState,
  } = cloudSyncSketch;

  installCloudSyncPanelApi({
    App,
    cfg,
    clientId,
    diagEnabledRef,
    tabsGateOpenRef,
    tabsGateUntilRef,
    getSite2TabsGateSnapshot,
    subscribeSite2TabsGateSnapshot,
    isTabsGateController,
    site2TabsTtlMs,
    getCurrentRoom: currentRoom,
    getCurrentRoomToken: currentRoomToken,
    getPrivateRoom,
    getPrivateRoomToken,
    setPrivateRoomCredential,
    issuePrivateRoom,
    setRoomCredentialInUrl,
    cloneRuntimeStatus,
    runtimeStatus,
    updateDiagEnabled,
    publishStatus,
    diag,
    publicationEpoch,
    now: Date.now,
    getDiagStorageMaybe,
    getClipboardMaybe,
    getPromptSinkMaybe,
    syncSketchNow,
    getFloatingSketchSyncEnabled,
    setFloatingSketchSyncEnabledState,
    pushFloatingSketchSyncPinnedNow,
    subscribeFloatingSketchSyncEnabledState,
    deleteTemporaryModelsInCloud,
    deleteTemporaryColorsInCloud,
    writeSite2TabsGateLocal,
    patchSite2TabsGateUi,
    pushTabsGateNow,
    pullTabsGateOnce,
  });
}
