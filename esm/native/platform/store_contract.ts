import type {
  ActionMetaLike,
  PatchPayload,
  RootStateLike,
  RootSliceKey,
  RootMetaStateLike,
  UnknownRecord,
} from '../../../types';

export const ROOT_STORE_SLICE_KEYS: readonly RootSliceKey[] = ['ui', 'config', 'runtime', 'mode', 'meta'];

type MutableRootMeta = RootMetaStateLike & UnknownRecord;

function cloneMutableUnknownValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(entry => cloneMutableUnknownValue(entry));
  if (!isPlainRecord(value)) return value;
  const out: UnknownRecord = {};
  for (const key of Object.keys(value)) out[key] = cloneMutableUnknownValue(value[key]);
  return out;
}

function cloneMutableRootValue<T>(value: T): T {
  return cloneMutableUnknownValue(value) as T;
}

function readPlainRecord(value: unknown): UnknownRecord | null {
  return isPlainRecord(value) ? value : null;
}

/** True for non-null plain objects (excludes arrays). */
export function isPlainRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Shallow clone for plain records (used for structural sharing). */
export function shallowCloneRecord<T extends UnknownRecord>(o: T): T {
  return { ...o };
}

function ensureMetaDefaults(metaIn: unknown): MutableRootMeta {
  const meta = cloneMutableRootValue(readPlainRecord(metaIn) || {});
  const dirty = typeof meta.dirty === 'boolean' ? meta.dirty : false;
  const version = typeof meta.version === 'number' ? meta.version : 0;
  const updatedAt = typeof meta.updatedAt === 'number' ? meta.updatedAt : 0;
  return {
    ...meta,
    dirty,
    version,
    updatedAt,
  };
}

function isCanonicalModeStateLike(mode: UnknownRecord, _NONE: string): mode is RootStateLike['mode'] {
  if (!isPlainRecord(mode.opts)) return false;
  const primary = mode.primary;
  return typeof primary === 'string' && String(primary).trim().length > 0 && String(primary) === primary;
}

function normalizeModeRecord(modeIn: unknown, NONE: string): RootStateLike['mode'] {
  const mode = readPlainRecord(modeIn);
  if (!mode) return { primary: NONE, opts: {} };
  if (isCanonicalModeStateLike(mode, NONE)) {
    return {
      ...cloneMutableRootValue(mode),
      opts: cloneMutableRootValue(mode.opts),
    };
  }

  const primary =
    typeof mode.primary === 'string' && String(mode.primary).trim() ? String(mode.primary) : NONE;
  const opts = isPlainRecord(mode.opts) ? cloneMutableRootValue(mode.opts) : {};

  return {
    ...cloneMutableRootValue(mode),
    primary,
    opts,
  };
}

/**
 * Ensure `state.meta` exists and contains the minimal invariants required by the store backend.
 * This function is intentionally backend-agnostic (used by the Zustand backend).
 */
export function ensureRootMetaRecord(state: RootStateLike): RootMetaStateLike {
  const next = ensureMetaDefaults(state.meta);
  state.meta = next;
  return next;
}

/**
 * Canonical root-state contract.
 * Keep this stable: it is the compatibility boundary between the app and the store backend.
 */
export function ensureRootStateContract(input: unknown, getNoneMode: () => string): RootStateLike {
  const src = readPlainRecord(input) || {};
  const NONE = typeof getNoneMode === 'function' ? getNoneMode() : 'none';

  return {
    ...cloneMutableRootValue(src),
    ui: isPlainRecord(src.ui) ? cloneMutableRootValue(src.ui) : {},
    config: isPlainRecord(src.config) ? cloneMutableRootValue(src.config) : {},
    runtime: isPlainRecord(src.runtime) ? cloneMutableRootValue(src.runtime) : {},
    mode: normalizeModeRecord(src.mode, NONE),
    meta: ensureMetaDefaults(src.meta),
  };
}

/**
 * Sanitize PATCH payloads at the store boundary.
 * Only root slices are accepted, and only object-ish values.
 */
export function sanitizePatchPayloadForStore(payload: unknown): PatchPayload {
  const src = readPlainRecord(payload) || {};
  const out: PatchPayload = {};
  for (const key of ROOT_STORE_SLICE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const value = src[key];
    if (value == null) continue;
    if (!isPlainRecord(value)) continue;
    out[key] = value;
  }
  return out;
}

function isInternalNoHistorySource(src: string): boolean {
  if (!src) return false;
  if (src === 'syncStore') return true;
  if (src === 'history.undoRedo' || src.indexOf('history.') === 0 || src.indexOf('history:') === 0)
    return true;
  if (src === 'project.load' || src.indexOf('project.load:') === 0) return true;
  if (src === 'restore.local' || src === 'load.file' || src === 'load.dragdrop') return true;
  if (src === 'smoke.restore' || src === 'notes:restore' || src === 'hinge:restore') return true;
  if (src === 'react:sketch:syncUi') return true;
  if (src.indexOf('actions:room:setWardrobeType:restore:') === 0) return true;
  if (src.indexOf('actions:room:setWardrobeType:init:') === 0) return true;
  if (src === 'init:seed' || src.indexOf('core:init') === 0) return true;
  if (src.indexOf('react:') === 0 && src.indexOf(':syncUi') !== -1) return true;
  return false;
}

/** Normalize meta once at the canonical store boundary (instead of patching many call sites). */
export function normalizeActionMeta(meta: unknown): ActionMetaLike | undefined {
  if (!isPlainRecord(meta)) return undefined;
  const out: ActionMetaLike = shallowCloneRecord(meta);
  const src = typeof out.source === 'string' ? out.source : '';

  // Root invariant for history stability: actions that are intentionally excluded
  // from history should also avoid snapshot capture unless explicitly handled.
  if (out.noHistory === true && out.noCapture !== true) out.noCapture = true;

  // Some internal flows forget to stamp noHistory/noCapture consistently.
  if (isInternalNoHistorySource(src)) {
    if (out.noHistory !== true) out.noHistory = true;
    if (out.noCapture !== true) out.noCapture = true;
  }

  return out;
}
