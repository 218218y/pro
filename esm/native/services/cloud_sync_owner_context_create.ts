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
    getPrivateRoom,
    getGateBaseRoom,
    getSketchRoom,
    getSite2TabsRoom,
    getFloatingSyncRoom,
    currentRoomToken,
    getPrivateRoomToken,
    setPrivateRoomCredential,
  } = createCloudSyncOwnerRooms({
    App,
    cfg,
    storage,
    reportNonFatal: _cloudSyncReportNonFatal,
  });

  const clientId = resolveCloudSyncClientId(App, _cloudSyncReportNonFatal);
  const gatewayIo = createCloudSyncOwnerGatewayIo({
    App,
    cfg,
    gatewayUrl,
    rooms: {
      room,
      currentRoom,
      currentRoomToken,
      getPrivateRoom,
      getPrivateRoomToken,
      setPrivateRoomCredential,
      getGateBaseRoom,
      getSketchRoom,
      getSite2TabsRoom,
      getFloatingSyncRoom,
    },
    clientId,
  });
  if (!gatewayIo) return null;
  const publicationEpoch = reserveCloudSyncPublicationEpoch(App);
  const statusRuntime = createCloudSyncOwnerStatusRuntime({
    App,
    cfg,
    room,
    clientId,
    publicationEpoch,
    reportNonFatal: _cloudSyncReportNonFatal,
  });

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
    storage,
    keyModels,
    keyColors,
    keyColorOrder,
    keyPresetOrder,
    keyHiddenPresets,
    room,
    currentRoom,
    currentRoomToken,
    getPrivateRoom,
    getPrivateRoomToken,
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
    diag: statusRuntime.diag,
  };
}
