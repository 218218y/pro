import type {
  AppContainer,
  CloudCollectionsCommitResult,
  CloudCollectionsEnvelope,
  CloudCollectionsMutator,
  SavedModelLike,
} from '../../../types';

import {
  readCloudCollectionsEnvelopeViaServiceOrThrow,
  transactCloudCollectionsViaServiceOrThrow,
} from '../runtime/cloud_collections_access.js';
import { readModelId } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { _normalizeList } from './models_registry_normalization.js';

function normalizeIdList(ids: readonly unknown[]): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    const id = String(ids[i] || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function filterAvailableIds(ids: string[], availableIds?: ReadonlySet<string> | null): string[] {
  if (!availableIds || availableIds.size <= 0) return ids.slice();
  const out: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (availableIds.has(id)) out.push(id);
  }
  return out;
}

function stringifyComparable(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function scheduleCollectionsRepair(App: AppContainer, label: string, mutator: CloudCollectionsMutator): void {
  void transactModelsCollectionsCanonical(App, mutator).catch(error => {
    _modelsReportNonFatal(App, label, error, 1500);
  });
}

export function transactModelsCollectionsCanonical(
  App: AppContainer,
  mutator: CloudCollectionsMutator
): Promise<CloudCollectionsCommitResult> {
  return transactCloudCollectionsViaServiceOrThrow(App, mutator, 'models registry persistence');
}

function currentAvailablePresetIds(
  current: Readonly<CloudCollectionsEnvelope>,
  availableIds?: ReadonlySet<string> | null
): ReadonlySet<string> | null | undefined {
  if (!availableIds || availableIds.size <= 0) return availableIds;
  const next = new Set(availableIds);
  for (const model of current.savedModels) {
    if (!model?.isPreset) continue;
    const id = readModelId(model);
    if (id) next.add(id);
  }
  return next;
}

export function _getStoredHiddenPresets(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): string[] {
  try {
    const raw = readCloudCollectionsEnvelopeViaServiceOrThrow(
      App,
      'models hidden presets read'
    ).hiddenPresets;
    const normalized = filterAvailableIds(normalizeIdList(raw), availableIds);
    if (stringifyComparable(raw) !== stringifyComparable(normalized)) {
      scheduleCollectionsRepair(App, 'repairStoredHiddenPresets', current => {
        const repaired = filterAvailableIds(
          normalizeIdList(current.hiddenPresets),
          currentAvailablePresetIds(current, availableIds)
        );
        return stringifyComparable(current.hiddenPresets) === stringifyComparable(repaired)
          ? {}
          : { hiddenPresets: repaired };
      });
    }
    return normalized;
  } catch (e) {
    _modelsReportNonFatal(App, 'getStoredHiddenPresets', e, 1500);
  }
  return [];
}

export function _getStoredPresetOrder(
  App: AppContainer,
  availableIds?: ReadonlySet<string> | null
): string[] {
  try {
    const raw = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'models preset order read').presetOrder;
    const normalized = filterAvailableIds(normalizeIdList(raw), availableIds);
    if (stringifyComparable(raw) !== stringifyComparable(normalized)) {
      scheduleCollectionsRepair(App, 'repairStoredPresetOrder', current => {
        const repaired = filterAvailableIds(
          normalizeIdList(current.presetOrder),
          currentAvailablePresetIds(current, availableIds)
        );
        return stringifyComparable(current.presetOrder) === stringifyComparable(repaired)
          ? {}
          : { presetOrder: repaired };
      });
    }
    return normalized;
  } catch (e) {
    _modelsReportNonFatal(App, 'getStoredPresetOrder', e, 1500);
  }
  return [];
}

export function _getStoredUserModels(App: AppContainer): SavedModelLike[] {
  try {
    const raw = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'models saved models read').savedModels;
    const normalized = _normalizeList(raw);
    if (stringifyComparable(raw) !== stringifyComparable(normalized)) {
      scheduleCollectionsRepair(App, 'repairStoredUserModels', current => {
        const repaired = _normalizeList(current.savedModels);
        return stringifyComparable(current.savedModels) === stringifyComparable(repaired)
          ? {}
          : { savedModels: repaired };
      });
    }
    return normalized;
  } catch (e) {
    _modelsReportNonFatal(App, 'getStoredUserModels', e, 1500);
  }
  return [];
}
