import type { AppContainer, ModelsNormalizer, SavedModelLike } from '../../../types';

import { savedModelCodec } from './saved_model_codec_access.js';

import { asMutableSavedModel, readModelId, syncPresetFlags } from './models_registry_contracts.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { getModelsRuntimeStateForApp } from './models_registry_state.js';

type CloneModelsContext = {
  App?: AppContainer | null;
  op?: string;
};

type NormalizeModelsContext = CloneModelsContext & {
  normalizer?: ModelsNormalizer | null;
  applyAppNormalizer?: boolean;
};

type CloneFailure = {
  stage: 'structuredClone' | 'json' | 'detachedCopy';
  error: unknown;
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

function readCloneFailureMessage(error: unknown): string {
  try {
    if (error instanceof Error && error.message) return error.message;
    return String(error);
  } catch (messageError) {
    return `unreadable clone error (${String(typeof messageError)})`;
  }
}

function createCloneExhaustedError(op: string, failures: CloneFailure[]): Error {
  const stages = failures
    .map(failure => `${failure.stage}: ${readCloneFailureMessage(failure.error)}`)
    .join('; ');
  return new Error(`[WardrobePro][models] ${op} could not create a detached clone (${stages})`);
}

function resolveModelsNormalizer(context?: NormalizeModelsContext): ModelsNormalizer | null {
  if (typeof context?.normalizer === 'function') return context.normalizer;
  if (context?.applyAppNormalizer === false) return null;
  return getModelsRuntimeStateForApp(context?.App).normalizer;
}

export function _cloneJSON<T>(obj: T, context?: CloneModelsContext): T | null {
  const failures: CloneFailure[] = [];

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (error) {
      failures.push({ stage: 'structuredClone', error });
    }
  }

  try {
    const serialized = JSON.stringify(obj);
    if (typeof serialized === 'string') return JSON.parse(serialized) as T;
    failures.push({
      stage: 'json',
      error: new Error('JSON serialization returned no payload'),
    });
  } catch (error) {
    failures.push({ stage: 'json', error });
  }

  try {
    return cloneDetachedUnknown(obj) as T;
  } catch (error) {
    failures.push({ stage: 'detachedCopy', error });
  }

  if (context) {
    const op = String(context.op || 'cloneJSON');
    _modelsReportNonFatal(
      context.App ?? null,
      `${op}.cloneExhausted`,
      createCloneExhaustedError(op, failures),
      1500
    );
  }
  return null;
}

export function cloneSavedModel(model: unknown, context?: CloneModelsContext) {
  return asMutableSavedModel(
    _cloneJSON(model, {
      App: context?.App,
      op: context?.op || 'normalizeModel',
    })
  );
}

export function _normalizeModel(m: unknown, context?: NormalizeModelsContext): SavedModelLike | null {
  const out = cloneSavedModel(m, { App: context?.App, op: context?.op || 'normalizeModel' });
  if (!out) return null;

  try {
    syncPresetFlags(out);
    const normalizer = resolveModelsNormalizer(context);
    const next = normalizer ? normalizer(out) : out;
    if (!next || typeof next !== 'object') return null;
    const normalized = savedModelCodec.normalize(next);
    if (!normalized) return null;
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
    applyAppNormalizer?: boolean;
  }
): SavedModelLike[] {
  if (!Array.isArray(list)) return [];
  const out: SavedModelLike[] = [];
  const byId = new Map<string, number>();
  const preferLatestDuplicateIds = !!options?.preferLatestDuplicateIds;
  const normalizeContext: NormalizeModelsContext = {
    App: options?.App,
    normalizer: options?.normalizer,
    applyAppNormalizer: options?.applyAppNormalizer,
    op: 'normalizeList.item',
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
