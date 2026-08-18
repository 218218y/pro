import type {
  ActionMetaLike,
  CanonicalActionMetaLike,
  CanonicalActionMetaSchemaLike,
  UnknownRecord,
} from '../../../types';

const STORE_ACTION_META_SCHEMA = {
  source: 'string',
  reason: 'string',
  silent: 'boolean',
  immediate: 'boolean',
  noBuild: 'boolean',
  noAutosave: 'boolean',
  noPersist: 'boolean',
  noHistory: 'boolean',
  noCapture: 'boolean',
  forceBuild: 'boolean',
  force: 'boolean',
  uiOnly: 'boolean',
  captureConfig: 'boolean',
  noStorageWrite: 'boolean',
  coalesceKey: 'string',
  coalesceMs: 'finite-number',
  coalesceAcrossIdle: 'boolean',
  resetDefault: 'boolean',
  preserveAutosave: 'boolean',
  preserveAutosaveOnLoad: 'boolean',
  autosavePolicy: 'preserve-existing',
  traceStorePatch: 'boolean',
  debugName: 'string',
  diagnostics: 'record',
  extensions: 'record',
} as const satisfies CanonicalActionMetaSchemaLike;

const STORE_ACTION_META_KEYS = Object.keys(STORE_ACTION_META_SCHEMA) as Array<keyof CanonicalActionMetaLike>;

function readRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function normalizeStoreActionMetaField(
  kind: CanonicalActionMetaSchemaLike[keyof CanonicalActionMetaLike],
  value: unknown
): unknown {
  if (kind === 'boolean') return typeof value === 'boolean' ? value : undefined;
  if (kind === 'string') return typeof value === 'string' ? value : undefined;
  if (kind === 'finite-number')
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  if (kind === 'preserve-existing') return value === 'preserve-existing' ? value : undefined;
  if (kind === 'record') {
    const record = readRecord(value);
    return record ? { ...record } : undefined;
  }
  return undefined;
}

/** Platform-local ingress sanitizer. Kept layer-local so Store does not add a platform -> runtime dependency. */
export function normalizeStoreActionMetaInput(value: unknown): ActionMetaLike {
  const input = readRecord(value);
  if (!input) return {};
  const out: UnknownRecord = {};
  for (const key of STORE_ACTION_META_KEYS) {
    const normalized = normalizeStoreActionMetaField(STORE_ACTION_META_SCHEMA[key], input[key]);
    if (typeof normalized !== 'undefined') out[key] = normalized;
  }
  return out;
}

export function mergeStoreActionMetaInput(
  value: unknown,
  defaults?: CanonicalActionMetaLike,
  defaultSource?: string
): ActionMetaLike {
  const out = normalizeStoreActionMetaInput(value);
  const normalizedDefaults = normalizeStoreActionMetaInput(defaults);
  const outRecord = out as UnknownRecord;
  const defaultsRecord = normalizedDefaults as UnknownRecord;
  for (const key of STORE_ACTION_META_KEYS) {
    if (typeof outRecord[key] === 'undefined' && typeof defaultsRecord[key] !== 'undefined') {
      outRecord[key] = defaultsRecord[key];
    }
  }
  if (defaultSource && typeof out.source !== 'string') out.source = defaultSource;
  return out;
}
