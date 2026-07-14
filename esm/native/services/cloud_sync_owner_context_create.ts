import type { AppContainer } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { readCfg, buildGatewayUrl } from './cloud_sync_config.js';
import {
  CLOUD_SYNC_DIAG_LS_KEY,
  resolveCloudSyncOwnerStorageKeys,
} from './cloud_sync_owner_context_runtime_shared.js';
import {
  createCloudSyncOwnerGatewayIo,
  createCloudSyncOwnerTimers,
  resolveCloudSyncOwnerStorage,
} from './cloud_sync_owner_context_runtime_access.js';
import { resolveCloudSyncClientId } from './cloud_sync_owner_context_runtime_client.js';
import { createCloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import { createCloudSyncOwnerStatusRuntime } from './cloud_sync_owner_context_diag.js';
import { buildCloudSyncCredentialStatus } from './cloud_sync_room_credentials.js';
import { reserveCloudSyncPublicationEpoch } from './cloud_sync_install_support.js';
import {
  getClipboardMaybe,
  getDiagStorageMaybe,
  getPromptSinkMaybe,
  type CloudSyncOwnerContext,
} from './cloud_sync_owner_context_shared.js';

export function createCloudSyncOwnerContext(App: AppContainer): CloudSyncOwnerContext | null {
  const cfg = readCfg(App);
  if (!cfg.url || !cfg.anonKey || !cfg.storeId) return null;

  const gatewayUrl = buildGatewayUrl(cfg.url, cfg.gatewayFunction);
  const timers = createCloudSyncOwnerTimers(App);
  const storage = resolveCloudSyncOwnerStorage(App);
  if (!storage) return null;

  const { keyModels, keyColors, keyColorOrder, keyPresetOrder, keyHiddenPresets } =
    resolveCloudSyncOwnerStorageKeys(storage);

  const {
    room,
    currentRoom,
    getPrivateRoomCredential,
    getGateBaseRoom,
    getSketchRoom,
    getSite2TabsRoom,
    getFloatingSyncRoom,
    currentRoomCredential,
    setPrivateRoomCredential,
  } = createCloudSyncOwnerRooms({
    App,
    cfg,
    storage,
    reportNonFatal: _cloudSyncReportNonFatal,
  });

  const clientId = resolveCloudSyncClientId(App, _cloudSyncReportNonFatal);
  const publicationEpoch = reserveCloudSyncPublicationEpoch(App);
  const statusRuntime = createCloudSyncOwnerStatusRuntime({
    App,
    cfg,
    room,
    clientId,
    publicationEpoch,
    reportNonFatal: _cloudSyncReportNonFatal,
  });
  statusRuntime.runtimeStatus.credential = buildCloudSyncCredentialStatus({
    isPublic: room === cfg.publicRoom,
    credential: currentRoomCredential(),
  });
  const gatewayIo = createCloudSyncOwnerGatewayIo({
    App,
    cfg,
    gatewayUrl,
    rooms: {
      room,
      currentRoom,
      currentRoomCredential,
      getPrivateRoomCredential,
      setPrivateRoomCredential,
      getGateBaseRoom,
      getSketchRoom,
      getSite2TabsRoom,
      getFloatingSyncRoom,
    },
    clientId,
    runtimeStatus: statusRuntime.runtimeStatus,
    publishStatus: statusRuntime.publishStatus,
  });
  if (!gatewayIo) return null;

  statusRuntime.updateDiagEnabled();
  statusRuntime.publishStatus();

  return {
    cfg,
    gatewayUrl: gatewayUrl,
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    setIntervalFn: timers.setIntervalFn,
    clearIntervalFn: timers.clearIntervalFn,
    getRow: gatewayIo.getRow,
    upsertRow: gatewayIo.upsertRow,
    issuePrivateRoom: gatewayIo.issuePrivateRoom,
    resolveConflict: gatewayIo.resolveConflict,
    storage,
    keyModels,
    keyColors,
    keyColorOrder,
    keyPresetOrder,
    keyHiddenPresets,
    room,
    currentRoom,
    currentRoomCredential,
    getPrivateRoomCredential,
    setPrivateRoomCredential,
    getGateBaseRoom,
    getSketchRoom,
    getSite2TabsRoom,
    getFloatingSyncRoom,
    getDiagStorageMaybe: (): ReturnType<typeof getDiagStorageMaybe> => getDiagStorageMaybe(App),
    getClipboardMaybe: (): ReturnType<typeof getClipboardMaybe> => getClipboardMaybe(App),
    getPromptSinkMaybe: (): ReturnType<typeof getPromptSinkMaybe> => getPromptSinkMaybe(App),
    clientId,
    instanceId: statusRuntime.instanceId,
    diagStorageKey: CLOUD_SYNC_DIAG_LS_KEY,
    publicationEpoch,
    runtimeStatus: statusRuntime.runtimeStatus,
    diagEnabledRef: statusRuntime.diagEnabledRef,
    updateDiagEnabled: statusRuntime.updateDiagEnabled,
    publishStatus: statusRuntime.publishStatus,
    subscribeRuntimeStatus: statusRuntime.subscribeRuntimeStatus,
    diag: statusRuntime.diag,
  };
}
