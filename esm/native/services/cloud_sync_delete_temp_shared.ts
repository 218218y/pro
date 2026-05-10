import type {
  AppContainer,
  CloudSyncDeleteTempResult,
  CloudSyncNonFatalReportOptions,
  CloudSyncPayload,
  CloudSyncRuntimeStatus,
  SavedColorLike,
  SavedModelLike,
} from '../../../types';

import { normalizeUnknownError } from '../runtime/error_normalization.js';
import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn, StorageLike } from './cloud_sync_owner_context.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import {
  normalizeModelList,
  normalizeSavedColorsList,
  asRecord,
  readPayloadList,
} from './cloud_sync_support.js';

export type DeleteTempKind = 'models' | 'colors';

export type DeleteTempArgs = {
  App: AppContainer;
  cfg: SupabaseCfg;
  restUrl: string;
  storage: StorageLike;
  keyModels: string;
  keyColors: string;
  keyColorOrder: string;
  keyPresetOrder: string;
  keyHiddenPresets: string;
  currentRoom: () => string;
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  getSendRealtimeHint: () => CloudSyncRealtimeHintSender | null;
  runtimeStatus?: CloudSyncRuntimeStatus;
  publishStatus?: () => void;
  runMainWriteFlight: <T>(key: string, run: () => Promise<T>, onBusy: () => T | Promise<T>) => Promise<T>;
  clearPendingPush: () => void;
  setLastSeenUpdatedAt: (value: string) => void;
  setLastHash: (value: string) => void;
  suppress: { v: boolean };
  reportNonFatal: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: CloudSyncNonFatalReportOptions
  ) => void;
};

export type DeleteTempCollections = {
  models: SavedModelLike[];
  colors: SavedColorLike[];
  colorOrder: CloudSyncPayload['colorSwatchesOrder'];
  presetOrder: CloudSyncPayload['presetOrder'];
  hiddenPresets: CloudSyncPayload['hiddenPresets'];
};

export function buildDeleteTempOp(kind: DeleteTempKind): string {
  return `services/cloud_sync.deleteTemp.${kind}`;
}

export function readDeleteTempCollections(
  payload: CloudSyncPayload | null | undefined
): DeleteTempCollections {
  return {
    models: normalizeModelList(payload?.savedModels),
    colors: normalizeSavedColorsList(payload?.savedColors),
    colorOrder: readPayloadList(payload, 'colorSwatchesOrder'),
    presetOrder: readPayloadList(payload, 'presetOrder'),
    hiddenPresets: readPayloadList(payload, 'hiddenPresets'),
  };
}

export function filterTemporaryModels(models: SavedModelLike[]): { kept: SavedModelLike[]; removed: number } {
  const kept: SavedModelLike[] = [];
  let removed = 0;
  for (const item of models) {
    const rec = asRecord(item);
    if (!rec) {
      kept.push(item);
      continue;
    }
    if (rec.isPreset || rec.locked) kept.push(item);
    else removed += 1;
  }
  return { kept, removed };
}

export function filterTemporaryColors(colors: SavedColorLike[]): { kept: SavedColorLike[]; removed: number } {
  const kept: SavedColorLike[] = [];
  let removed = 0;
  for (const item of colors) {
    const rec = asRecord(item);
    if (!rec) {
      kept.push(item);
      continue;
    }
    if (rec.locked) kept.push(item);
    else removed += 1;
  }
  return { kept, removed };
}

export function buildDeleteTempModelsPayload(
  collections: DeleteTempCollections,
  kept: SavedModelLike[]
): CloudSyncPayload {
  return {
    savedModels: kept,
    savedColors: collections.colors,
    colorSwatchesOrder: collections.colorOrder,
    presetOrder: collections.presetOrder,
    hiddenPresets: collections.hiddenPresets,
  };
}

export function buildDeleteTempColorsPayload(
  collections: DeleteTempCollections,
  kept: SavedColorLike[]
): CloudSyncPayload {
  return {
    savedModels: collections.models,
    savedColors: kept,
    colorSwatchesOrder: collections.colorOrder,
    presetOrder: collections.presetOrder,
    hiddenPresets: collections.hiddenPresets,
  };
}

export function resolveDeleteTempPayload(args: {
  kind: DeleteTempKind;
  collections: DeleteTempCollections;
}): { nextPayload: CloudSyncPayload | null; removed: number } {
  if (args.kind === 'models') {
    const filtered = filterTemporaryModels(args.collections.models);
    return {
      nextPayload:
        filtered.removed > 0 ? buildDeleteTempModelsPayload(args.collections, filtered.kept) : null,
      removed: filtered.removed,
    };
  }

  const filtered = filterTemporaryColors(args.collections.colors);
  return {
    nextPayload: filtered.removed > 0 ? buildDeleteTempColorsPayload(args.collections, filtered.kept) : null,
    removed: filtered.removed,
  };
}

export function buildDeleteTempErrorResult(
  args: DeleteTempArgs,
  kind: DeleteTempKind,
  err: unknown,
  defaultMessage: string
): CloudSyncDeleteTempResult {
  args.reportNonFatal(args.App, buildDeleteTempOp(kind), err, { throttleMs: 4000 });
  return {
    ok: false,
    removed: 0,
    reason: 'error',
    message: normalizeUnknownError(err, defaultMessage).message,
  };
}
