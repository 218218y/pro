import type { AppContainer, CloudSyncLocalCollections, CloudSyncPayload } from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn, StorageLike } from './cloud_sync_owner_context.js';
import { writeCloudSyncMainRowPayload } from './cloud_sync_main_row_write_support.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import {
  applyRemote,
  computeHash,
  hasPayloadKey,
  normalizeModelList,
  normalizeSavedColorsList,
  readLocal,
  readPayloadList,
} from './cloud_sync_support.js';

export type CloudSyncHintSender = CloudSyncRealtimeHintSender | null;

export type CloudSyncMainRowStateAccess = {
  getLastHash: () => string;
  setLastHash: (value: string) => void;
  getLastSeenUpdatedAt: () => string;
  setLastSeenUpdatedAt: (value: string) => void;
};

export type CreateCloudSyncMainRowLocalStateArgs = {
  App: AppContainer;
  cfg: SupabaseCfg;
  restUrl: string;
  room: string;
  storage: StorageLike;
  keyModels: string;
  keyColors: string;
  keyColorOrder: string;
  keyPresetOrder: string;
  keyHiddenPresets: string;
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  suppressRef: { v: boolean };
  getSendRealtimeHint: () => CloudSyncHintSender;
  state: CloudSyncMainRowStateAccess;
};

export type CloudSyncMainRowLocalState = {
  readCurrentLocal: () => CloudSyncLocalCollections;
  computeHashForLocal: (local: CloudSyncLocalCollections) => string;
  computeCurrentHash: () => string;
  computeAppliedPayloadHash: (payload: CloudSyncPayload) => string;
  syncHashFromLocal: () => string;
  applyRemotePayload: (payload: CloudSyncPayload) => void;
  seedMissingRowFromLocal: () => Promise<void>;
};

export function buildCloudSyncMainRowPayload(local: CloudSyncLocalCollections): CloudSyncPayload {
  return {
    savedModels: local.m,
    savedColors: local.c,
    colorSwatchesOrder: local.o,
    presetOrder: local.p,
    hiddenPresets: local.h,
  };
}

export function createCloudSyncMainRowLocalState(
  args: CreateCloudSyncMainRowLocalStateArgs
): CloudSyncMainRowLocalState {
  const readCurrentLocal = (): CloudSyncLocalCollections =>
    readLocal(
      args.storage,
      args.keyModels,
      args.keyColors,
      args.keyColorOrder,
      args.keyPresetOrder,
      args.keyHiddenPresets
    );

  const computeHashForLocal = (local: CloudSyncLocalCollections): string =>
    computeHash(local.m, local.c, local.o, local.p, local.h);

  const computeCurrentHash = (): string => computeHashForLocal(readCurrentLocal());

  const computeAppliedPayloadHash = (payload: CloudSyncPayload): string => {
    const current = readCurrentLocal();
    return computeHash(
      normalizeModelList(payload?.savedModels),
      normalizeSavedColorsList(payload?.savedColors),
      hasPayloadKey(payload, 'colorSwatchesOrder')
        ? readPayloadList(payload, 'colorSwatchesOrder')
        : current.o,
      readPayloadList(payload, 'presetOrder'),
      readPayloadList(payload, 'hiddenPresets')
    );
  };

  const syncHashFromLocal = (): string => {
    const nextHash = computeCurrentHash();
    args.state.setLastHash(nextHash);
    return nextHash;
  };

  const applyRemotePayload = (payload: CloudSyncPayload): void => {
    applyRemote(
      args.App,
      args.storage,
      args.keyModels,
      args.keyColors,
      args.keyColorOrder,
      args.keyPresetOrder,
      args.keyHiddenPresets,
      payload,
      args.suppressRef
    );
    syncHashFromLocal();
  };

  const seedMissingRowFromLocal = async (): Promise<void> => {
    const local = readCurrentLocal();
    const hasLocalData = local.m.length > 0 || local.c.length > 0 || local.p.length > 0;
    const payload = hasLocalData
      ? buildCloudSyncMainRowPayload(local)
      : {
          savedModels: [],
          savedColors: [],
          colorSwatchesOrder: [],
          presetOrder: [],
          hiddenPresets: [],
        };

    const writeResult = await writeCloudSyncMainRowPayload({
      cfg: args.cfg,
      restUrl: args.restUrl,
      room: args.room,
      payload,
      getRow: args.getRow,
      upsertRow: args.upsertRow,
      getSendRealtimeHint: args.getSendRealtimeHint,
      setLastSeenUpdatedAt: value => {
        args.state.setLastSeenUpdatedAt(value);
      },
    });
    if (!writeResult.ok) return;

    if (!hasLocalData) return;

    args.state.setLastHash(computeHashForLocal(local));
  };

  return {
    readCurrentLocal,
    computeHashForLocal,
    computeCurrentHash,
    computeAppliedPayloadHash,
    syncHashFromLocal,
    applyRemotePayload,
    seedMissingRowFromLocal,
  };
}
