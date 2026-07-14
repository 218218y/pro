import type {
  AppContainer,
  CloudSyncLocalCollections,
  CloudSyncPayload,
  CloudSyncRemoteAdoptionResult,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn, StorageLike } from './cloud_sync_owner_context.js';
import { writeCloudSyncMainRowPayload } from './cloud_sync_main_row_write_support.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import { createCloudCollectionsRepository } from './cloud_sync_collections_repository.js';
import {
  applyRemote,
  computeHash,
  hasPayloadKey,
  normalizeModelList,
  normalizeSavedColorsList,
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
  gatewayUrl: string;
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
  readEnvelopeRevision: () => number;
  readLocalSnapshot: () => { payload: CloudSyncPayload; revision: number };
  computeHashForLocal: (local: CloudSyncLocalCollections) => string;
  computeCurrentHash: () => string;
  computeAppliedPayloadHash: (payload: CloudSyncPayload) => string;
  syncHashFromLocal: () => string;
  applyRemotePayload: (
    payload: CloudSyncPayload,
    expectedLocalRevision?: number
  ) => Promise<CloudSyncRemoteAdoptionResult>;
  subscribeCollections: (listener: () => void) => () => void;
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
  const repository = createCloudCollectionsRepository({
    storage: args.storage,
    keys: {
      models: args.keyModels,
      colors: args.keyColors,
      colorOrder: args.keyColorOrder,
      presetOrder: args.keyPresetOrder,
      hiddenPresets: args.keyHiddenPresets,
    },
  });
  const readCurrentLocal = (): CloudSyncLocalCollections => repository.read();
  const readEnvelopeRevision = (): number => repository.readEnvelope().revision;
  const readLocalSnapshot = (): { payload: CloudSyncPayload; revision: number } => {
    const envelope = repository.readEnvelope();
    return {
      payload: buildCloudSyncMainRowPayload({
        m: envelope.savedModels,
        c: envelope.savedColors,
        o: envelope.colorOrder,
        p: envelope.presetOrder,
        h: envelope.hiddenPresets,
      }),
      revision: envelope.revision,
    };
  };

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

  const applyRemotePayload = async (
    payload: CloudSyncPayload,
    expectedLocalRevision?: number
  ): Promise<CloudSyncRemoteAdoptionResult> => {
    const committed = await applyRemote(
      args.App,
      args.storage,
      args.keyModels,
      args.keyColors,
      args.keyColorOrder,
      args.keyPresetOrder,
      args.keyHiddenPresets,
      payload,
      expectedLocalRevision
    );
    if (committed.ok) syncHashFromLocal();
    return committed;
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
      gatewayUrl: args.gatewayUrl,
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
    readEnvelopeRevision,
    readLocalSnapshot,
    computeHashForLocal,
    computeCurrentHash,
    computeAppliedPayloadHash,
    syncHashFromLocal,
    applyRemotePayload,
    subscribeCollections: listener => repository.subscribe(() => listener()),
    seedMissingRowFromLocal,
  };
}
