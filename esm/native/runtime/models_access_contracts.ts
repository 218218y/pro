import type {
  ModelsCommandReason,
  ModelsDeleteTemporaryResult,
  ModelsLockResult,
  ModelsMergeResult,
  ModelsServiceLike,
  ModelsSaveResult,
  SavedModelId,
  SavedModelLike,
  SavedModelName,
  UnknownRecord,
} from '../../../types';

export const MODELS_ACCESS_NORMALIZED = '__modelsAccessNormalized';

const KNOWN_MODELS_COMMAND_REASONS: ReadonlySet<string> = new Set([
  'capture',
  'copy',
  'core',
  'direction',
  'edge',
  'error',
  'id',
  'invalid',
  'load',
  'locked',
  'missing',
  'name',
  'normalize',
  'not-installed',
  'overPreset',
  'preset',
  'superseded',
]);

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isModelsCommandReason(value: string): value is ModelsCommandReason {
  return KNOWN_MODELS_COMMAND_REASONS.has(value);
}

export function normalizeModelsCommandReason(
  value: unknown,
  fallback: ModelsCommandReason = 'not-installed'
): ModelsCommandReason {
  return typeof value === 'string' && isModelsCommandReason(value) ? value : fallback;
}

export function normalizeSavedModelId(value: unknown): SavedModelId | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id || null;
}

export function normalizeSavedModelName(value: unknown): SavedModelName | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name || null;
}

export function createEmptyModelsService(): ModelsServiceLike {
  return {
    [MODELS_ACCESS_NORMALIZED]: true,
    setNormalizer: () => {},
    setPresets: () => {},
    ensureLoaded: () => [],
    getAll: () => [],
    getById: () => null,
    saveCurrent: () => ({ ok: false, reason: 'not-installed' }),
    overwriteFromCurrent: () => ({ ok: false, reason: 'not-installed' }),
    deleteById: () => ({ ok: false, reason: 'not-installed' }),
    setLocked: () => ({ ok: false, reason: 'not-installed', locked: false }),
    deleteTemporary: () => ({ ok: false, reason: 'not-installed', removed: 0 }),
    move: () => ({ ok: false, reason: 'not-installed' }),
    transfer: () => ({ ok: false, reason: 'not-installed' }),
    apply: () => ({ ok: false, reason: 'not-installed' }),
    exportUserModels: () => [],
    mergeImportedModels: () => ({ added: 0, updated: 0 }),
    onChange: () => {},
  };
}

export function isNormalizedModelsService(value: unknown): value is ModelsServiceLike & UnknownRecord {
  return isRecord(value) && value[MODELS_ACCESS_NORMALIZED] === true && typeof value.getAll === 'function';
}

export function readMergeResult(value: unknown): ModelsMergeResult {
  if (!isRecord(value)) return { added: 0, updated: 0 };
  const added = Number.isFinite(Number(value.added)) ? Number(value.added) : 0;
  const updated = Number.isFinite(Number(value.updated)) ? Number(value.updated) : 0;
  return { added, updated };
}

export function readSaveResult(
  value: unknown,
  fallbackReason: ModelsCommandReason = 'not-installed'
): ModelsSaveResult {
  const base = readCommandResult(value, fallbackReason);
  const id = isRecord(value) ? (normalizeSavedModelId(value.id) ?? undefined) : undefined;
  return id ? { ...base, id } : base;
}

export function readLockResult(
  value: unknown,
  fallbackReason: ModelsCommandReason = 'not-installed'
): ModelsLockResult {
  const base = readCommandResult(value, fallbackReason);
  const locked = isRecord(value) && typeof value.locked === 'boolean' ? value.locked : false;
  return { ...base, locked };
}

export function readDeleteTemporaryResult(
  value: unknown,
  fallbackReason: ModelsCommandReason = 'not-installed'
): ModelsDeleteTemporaryResult {
  const base = readCommandResult(value, fallbackReason);
  const removed = isRecord(value) && Number.isFinite(Number(value.removed)) ? Number(value.removed) : 0;
  return { ...base, removed };
}

export function readCommandResult(value: unknown, fallbackReason: ModelsCommandReason = 'not-installed') {
  if (!isRecord(value)) return { ok: false, reason: fallbackReason };
  const ok = value.ok === true;
  const message =
    typeof value.message === 'string' && value.message.trim() ? value.message.trim() : undefined;
  return {
    ok,
    reason: ok ? undefined : normalizeModelsCommandReason(value.reason, fallbackReason),
    ...(message ? { message } : {}),
  };
}

type DetachedCloneCache = Map<object, UnknownRecord | unknown[]>;

function readDetachedArrayClone(value: readonly unknown[], seen: DetachedCloneCache): unknown[] | null {
  const cached = seen.get(value);
  return Array.isArray(cached) ? cached : null;
}

function readDetachedRecordClone(value: UnknownRecord, seen: DetachedCloneCache): UnknownRecord | null {
  const cached = seen.get(value);
  return isRecord(cached) ? cached : null;
}

function cloneUnknownRecordDetached(value: UnknownRecord, seen: DetachedCloneCache): UnknownRecord {
  const cached = readDetachedRecordClone(value, seen);
  if (cached) return cached;

  const out: UnknownRecord = {};
  seen.set(value, out);
  for (const [key, entry] of Object.entries(value)) {
    out[key] = cloneUnknownDetached(entry, seen);
  }
  return out;
}

function cloneUnknownArrayDetached(value: readonly unknown[], seen: DetachedCloneCache): unknown[] {
  const cached = readDetachedArrayClone(value, seen);
  if (cached) return cached;

  const out: unknown[] = [];
  seen.set(value, out);
  for (const entry of value) out.push(cloneUnknownDetached(entry, seen));
  return out;
}

export function cloneUnknownDetached<T>(
  value: T,
  seen: DetachedCloneCache = new Map<object, UnknownRecord | unknown[]>()
): T {
  if (value === null || typeof value !== 'object') return value;
  return (
    Array.isArray(value)
      ? cloneUnknownArrayDetached(value, seen)
      : isRecord(value)
        ? cloneUnknownRecordDetached(value, seen)
        : value
  ) as T;
}

export function readSavedModel(value: unknown): SavedModelLike | null {
  if (!isRecord(value)) return null;
  const id = normalizeSavedModelId(value.id);
  const name = normalizeSavedModelName(value.name);
  if (!id || !name) return null;
  const cloned = cloneUnknownDetached(value);
  return isRecord(cloned) ? Object.assign(cloned, { id, name }) : null;
}

export function readSavedModelList(value: unknown): SavedModelLike[] {
  if (!Array.isArray(value)) return [];
  const out: SavedModelLike[] = [];
  const byId = new Map<SavedModelId, number>();
  for (let i = 0; i < value.length; i += 1) {
    const model = readSavedModel(value[i]);
    if (!model) continue;
    const existingIndex = byId.get(model.id);
    if (typeof existingIndex === 'number') {
      out[existingIndex] = model;
      continue;
    }
    byId.set(model.id, out.length);
    out.push(model);
  }
  return out;
}
