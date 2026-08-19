import type {
  AppContainer,
  CloudCollectionsCommitResult,
  CloudCollectionsEnvelope,
  CloudCollectionsMutation,
  CloudCollectionsMutator,
  SavedModelLike,
} from '../../../types';

import {
  readCloudCollectionsEnvelopeViaServiceOrThrow,
  transactCloudCollectionsViaServiceOrThrow,
} from '../runtime/cloud_collections_access.js';
import { stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';
import { readModelId } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _normalizeList } from './models_registry_normalization.js';

export interface StoredModelsCollectionsSnapshot {
  savedModels: SavedModelLike[];
  presetOrder: string[];
  hiddenPresets: string[];
}

type PendingCollectionsRepair = {
  availableIds: Set<string> | null;
};

const pendingCollectionsRepairs = new WeakMap<object, PendingCollectionsRepair>();

function normalizeIdList(ids: readonly unknown[]): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const rawId of ids) {
    const id = String(rawId || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function filterAvailableIds(ids: string[], availableIds?: ReadonlySet<string> | null): string[] {
  if (!availableIds || availableIds.size <= 0) return ids.slice();
  const out: string[] = [];
  for (const id of ids) {
    if (availableIds.has(id)) out.push(id);
  }
  return out;
}

function areStoredValuesEqual(left: unknown, right: unknown): boolean {
  return stableSerializeCloudSyncValue(left) === stableSerializeCloudSyncValue(right);
}

function normalizeRepairAvailableIds(availableIds?: ReadonlySet<string> | null): Set<string> | null {
  return availableIds && availableIds.size > 0 ? new Set(availableIds) : null;
}

function mergeRepairAvailableIds(
  current: Set<string> | null,
  incoming: Set<string> | null
): Set<string> | null {
  if (current === null || incoming === null) return null;
  const merged = new Set(current);
  for (const id of incoming) merged.add(id);
  return merged;
}

function currentAvailablePresetIds(
  savedModels: readonly SavedModelLike[],
  availableIds?: ReadonlySet<string> | null
): ReadonlySet<string> | null | undefined {
  if (!availableIds || availableIds.size <= 0) return availableIds;
  const next = new Set(availableIds);
  for (const model of savedModels) {
    if (!model?.isPreset) continue;
    const id = readModelId(model);
    if (id) next.add(id);
  }
  return next;
}

function normalizeStoredModelsCollections(
  envelope: Readonly<CloudCollectionsEnvelope>,
  availableIds?: ReadonlySet<string> | null
): StoredModelsCollectionsSnapshot {
  const savedModels = _normalizeList(envelope.savedModels);
  const availablePresetIds = currentAvailablePresetIds(savedModels, availableIds);
  return {
    savedModels,
    presetOrder: filterAvailableIds(normalizeIdList(envelope.presetOrder), availablePresetIds),
    hiddenPresets: filterAvailableIds(normalizeIdList(envelope.hiddenPresets), availablePresetIds),
  };
}

function buildCollectionsRepairMutation(
  current: Readonly<CloudCollectionsEnvelope>,
  availableIds?: ReadonlySet<string> | null
): CloudCollectionsMutation {
  const normalized = normalizeStoredModelsCollections(current, availableIds);
  const mutation: CloudCollectionsMutation = {};
  if (!areStoredValuesEqual(current.savedModels, normalized.savedModels)) {
    mutation.savedModels = normalized.savedModels;
  }
  if (!areStoredValuesEqual(current.presetOrder, normalized.presetOrder)) {
    mutation.presetOrder = normalized.presetOrder;
  }
  if (!areStoredValuesEqual(current.hiddenPresets, normalized.hiddenPresets)) {
    mutation.hiddenPresets = normalized.hiddenPresets;
  }
  return mutation;
}

function reportCollectionsCommitSideEffects(App: AppContainer, commit: CloudCollectionsCommitResult): void {
  for (const key of commit.mirrorFailures) {
    _modelsReportNonFatal(
      App,
      'modelsCollectionsTransaction.mirrorWrite',
      new Error(`[WardrobePro][models] canonical commit mirror write failed for ${key}`),
      6000
    );
  }
}

export async function transactModelsCollectionsCanonical(
  App: AppContainer,
  mutator: CloudCollectionsMutator
): Promise<CloudCollectionsCommitResult> {
  const commit = await transactCloudCollectionsViaServiceOrThrow(App, mutator, 'models registry persistence');
  reportCollectionsCommitSideEffects(App, commit);
  return commit;
}

function scheduleCollectionsRepair(App: AppContainer, availableIds?: ReadonlySet<string> | null): void {
  const appKey = App as object;
  const incomingIds = normalizeRepairAvailableIds(availableIds);
  const existing = pendingCollectionsRepairs.get(appKey);
  if (existing) {
    existing.availableIds = mergeRepairAvailableIds(existing.availableIds, incomingIds);
    return;
  }

  const pending: PendingCollectionsRepair = { availableIds: incomingIds };
  pendingCollectionsRepairs.set(appKey, pending);
  void Promise.resolve().then(async () => {
    if (pendingCollectionsRepairs.get(appKey) !== pending) return;
    pendingCollectionsRepairs.delete(appKey);
    try {
      await transactModelsCollectionsCanonical(App, current =>
        buildCollectionsRepairMutation(current, pending.availableIds)
      );
    } catch (error) {
      _modelsReportNonFatal(App, 'repairStoredModelsCollections', error, 1500);
    }
  });
}

function readStoredModelsCollections(
  App: AppContainer,
  availableIds: ReadonlySet<string> | null | undefined,
  readOp: string
): StoredModelsCollectionsSnapshot {
  try {
    const envelope = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'models collections read');
    const normalized = normalizeStoredModelsCollections(envelope, availableIds);
    if (
      !areStoredValuesEqual(envelope.savedModels, normalized.savedModels) ||
      !areStoredValuesEqual(envelope.presetOrder, normalized.presetOrder) ||
      !areStoredValuesEqual(envelope.hiddenPresets, normalized.hiddenPresets)
    ) {
      scheduleCollectionsRepair(App, availableIds);
    }
    return normalized;
  } catch (error) {
    _modelsReportNonFatal(App, readOp, error, 1500);
    return { savedModels: [], presetOrder: [], hiddenPresets: [] };
  }
}

export function _getStoredModelsCollections(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): StoredModelsCollectionsSnapshot {
  return readStoredModelsCollections(App, availableIds, 'getStoredModelsCollections');
}

export function _getStoredHiddenPresets(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): string[] {
  return readStoredModelsCollections(App, availableIds, 'getStoredHiddenPresets').hiddenPresets;
}

export function _getStoredPresetOrder(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): string[] {
  return readStoredModelsCollections(App, availableIds, 'getStoredPresetOrder').presetOrder;
}

export function _getStoredUserModels(App: AppContainer): SavedModelLike[] {
  return readStoredModelsCollections(App, undefined, 'getStoredUserModels').savedModels;
}
