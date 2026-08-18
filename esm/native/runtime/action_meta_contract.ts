import type {
  ActionMetaLike,
  CanonicalActionMetaLike,
  CanonicalActionMetaSchemaLike,
  UnknownRecord,
} from '../../../types';

import { asRecord, cloneRecord } from './record.js';

export { asRecord, isRecord } from './record.js';

const ACTION_META_SCHEMA = {
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

export const CANONICAL_ACTION_META_KEYS = Object.freeze(
  Object.keys(ACTION_META_SCHEMA) as Array<keyof CanonicalActionMetaLike>
);

function normalizeField(
  kind: CanonicalActionMetaSchemaLike[keyof CanonicalActionMetaLike],
  value: unknown
): unknown {
  if (kind === 'boolean') return typeof value === 'boolean' ? value : undefined;
  if (kind === 'string') return typeof value === 'string' ? value : undefined;
  if (kind === 'finite-number')
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  if (kind === 'preserve-existing') return value === 'preserve-existing' ? value : undefined;
  if (kind === 'record') {
    const record = asRecord(value);
    return record ? cloneRecord(record) : undefined;
  }
  return undefined;
}

export function normalizeCanonicalActionMeta(value: unknown): ActionMetaLike {
  const input = asRecord(value);
  if (!input) return {};

  const out: UnknownRecord = {};
  for (const key of CANONICAL_ACTION_META_KEYS) {
    const normalized = normalizeField(ACTION_META_SCHEMA[key], input[key]);
    if (typeof normalized !== 'undefined') out[key] = normalized;
  }
  return out;
}

export function mergeCanonicalActionMeta(
  meta: unknown,
  defaults?: CanonicalActionMetaLike,
  defaultSource?: string
): ActionMetaLike {
  const out = normalizeCanonicalActionMeta(meta);
  const normalizedDefaults = normalizeCanonicalActionMeta(defaults);

  for (const key of CANONICAL_ACTION_META_KEYS) {
    if (typeof out[key] === 'undefined' && typeof normalizedDefaults[key] !== 'undefined') {
      (out as UnknownRecord)[key] = normalizedDefaults[key];
    }
  }

  if (defaultSource && typeof out.source !== 'string') out.source = defaultSource;
  return out;
}
