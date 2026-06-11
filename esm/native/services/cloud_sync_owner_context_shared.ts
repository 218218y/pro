import type {
  AppContainer,
  CloudSyncRuntimeStatus,
  CloudSyncStorageValueStoreLike,
  CloudSyncClipboardLike,
  CloudSyncPromptSinkLike,
  TimeoutHandleLike,
  IntervalHandleLike,
  CloudSyncDiagFn,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import {
  getCloudSyncClipboardMaybe,
  getCloudSyncDiagStorageMaybe,
  getCloudSyncPromptSinkMaybe,
  type StorageLike,
} from './cloud_sync_owner_context_runtime_shared.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn } from './cloud_sync_owner_context_runtime_access.js';

export type { StorageLike } from './cloud_sync_owner_context_runtime_shared.js';
export type { CloudSyncGetRowFn, CloudSyncUpsertRowFn } from './cloud_sync_owner_context_runtime_access.js';

export type CloudSyncOwnerContext = {
  cfg: SupabaseCfg;
  restUrl: string;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  setIntervalFn: (handler: () => void, ms: number) => IntervalHandleLike;
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  storage: StorageLike;
  keyModels: string;
  keyColors: string;
  keyColorOrder: string;
  keyPresetOrder: string;
  keyHiddenPresets: string;
  room: string;
  currentRoom: () => string;
  getPrivateRoom: () => string;
  setPrivateRoom: (value: string) => void;
  getGateBaseRoom: () => string;
  getSketchRoom: () => string;
  getSite2TabsRoom: () => string;
  getFloatingSyncRoom: () => string;
  getDiagStorageMaybe: () => CloudSyncStorageValueStoreLike | null;
  getClipboardMaybe: () => CloudSyncClipboardLike | null;
  getPromptSinkMaybe: () => CloudSyncPromptSinkLike | null;
  clientId: string;
  instanceId: string;
  diagStorageKey: string;
  publicationEpoch: number;
  runtimeStatus: CloudSyncRuntimeStatus;
  diagEnabledRef: { value: boolean };
  updateDiagEnabled: () => void;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
};

export function getDiagStorageMaybe(App: AppContainer): CloudSyncStorageValueStoreLike | null {
  return getCloudSyncDiagStorageMaybe(App);
}

export function getClipboardMaybe(App: AppContainer): CloudSyncClipboardLike | null {
  return getCloudSyncClipboardMaybe(App);
}

export function getPromptSinkMaybe(App: AppContainer): CloudSyncPromptSinkLike | null {
  return getCloudSyncPromptSinkMaybe(App);
}
