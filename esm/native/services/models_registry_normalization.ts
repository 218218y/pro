import type { AppContainer, ModelsNormalizer, SavedModelLike } from '../../../types';

import { normalizeModelRecord } from '../features/model_record/model_record_normalizer.js';

import { asMutableSavedModel, readModelId, syncPresetFlags } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';

type NormalizeModelsContext = {
  App?: AppContainer | null;
  normalizer?: ModelsNormalizer | null;
};

function cloneDetachedUnknown(value: unknown, seen = new Map<object, unknown>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  const existing = seen.get(value);
  if (typeof existing !== 'undefined') return existing;

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    for (let i = 0; i < value.length; i += 1) out.push(cloneDetachedUnknown(value[i], seen));
    return out;
  }

  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const [key, entry] of Object.entries(value)) out[key] = cloneDetachedUnknown(entry, seen);
  return out;
}

function resolveModelsNormalizer(context?: NormalizeModelsContext): ModelsNormalizer | null {
  if (typeof context?.normalizer === 'function') return context.normalizer;
  return getModelsRuntimeStateForApp(context?.App).normalizer;
}

export function _cloneJSON<T>(obj: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(obj);
  } catch {}
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {}
  try {
    return cloneDetachedUnknown(obj) as T;
  } catch {
    return obj;
  }
}

export function cloneSavedModel(model: unknown) {
  return asMutableSavedModel(_cloneJSON(model));
}

export function _normalizeModel(m: unknown, context?: NormalizeModelsContext): SavedModelLike | null {
  const out = cloneSavedModel(m);
  if (!out) return null;

  try {
    syncPresetFlags(out);
    const normalizer = resolveModelsNormalizer(context);
    const next = normalizer ? normalizer(out) : out;
    if (!next || typeof next !== 'object') return null;
    const normalized = normalizeModelRecord(next);
    syncPresetFlags(normalized);
    return asMutableSavedModel(normalized);
  } catch (e) {
    _modelsReportNonFatal(context?.App ?? null, 'normalizeModel', e, 1500);
  }
  return null;
}

export function _normalizeList(
  list: unknown,
  options?: {
    preferLatestDuplicateIds?: boolean;
    App?: AppContainer | null;
    normalizer?: ModelsNormalizer | null;
  }
): SavedModelLike[] {
  if (!Array.isArray(list)) return [];
  const out: SavedModelLike[] = [];
  const byId = new Map<string, number>();
  const preferLatestDuplicateIds = !!options?.preferLatestDuplicateIds;
  const normalizeContext: NormalizeModelsContext = {
    App: options?.App,
    normalizer: options?.normalizer,
  };
  for (let i = 0; i < list.length; i += 1) {
    const nm = _normalizeModel(list[i], normalizeContext);
    if (!nm) continue;
    const id = readModelId(nm);
    if (!id) continue;
    const existingIndex = byId.get(id);
    if (typeof existingIndex === 'number') {
      if (preferLatestDuplicateIds) out[existingIndex] = nm;
      continue;
    }
    byId.set(id, out.length);
    out.push(nm);
  }
  return out;
}
