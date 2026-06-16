import type {
  ProjectDataLike,
  ProjectPdfDraftLike,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
  ProjectSettingsLike,
  ProjectTogglesLike,
  UnknownRecord,
} from '../../../types/index.js';

import {
  asObject as sharedAsObject,
  asObjectRecord,
  cloneProjectJson as cloneProjectJsonShared,
  isObjectRecord,
  readPreChestState as readPreChestStateShared,
  readSavedNotes as readSavedNotesShared,
} from './project_payload_shared.js';
import { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../../shared/project_schema_constants.js';
export { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION } from '../../shared/project_schema_constants.js';

export function readProjectDataRecord(value: unknown): ProjectDataLike | null {
  return isObjectRecord(value) ? value : null;
}

export function readSavedNotes(value: unknown): ProjectSavedNotesLike {
  return readSavedNotesShared(value);
}

export function cloneProjectJson(value: unknown): ProjectPdfDraftLike | null {
  return cloneProjectJsonShared(value);
}

export function readPreChestState(value: unknown): ProjectPreChestStateLike {
  return readPreChestStateShared(value);
}

export function asObject(x: unknown): UnknownRecord {
  return sharedAsObject(x);
}

export function ensureSettingsRecord(data: ProjectDataLike): ProjectSettingsLike & UnknownRecord {
  const next: ProjectSettingsLike & UnknownRecord = asObjectRecord(data.settings) ?? {};
  data.settings = next;
  return next;
}

export function ensureTogglesRecord(data: ProjectDataLike): ProjectTogglesLike & UnknownRecord {
  const next: ProjectTogglesLike & UnknownRecord = asObjectRecord(data.toggles) ?? {};
  data.toggles = next;
  return next;
}

export function ensureProjectDataRecord(value: unknown): ProjectDataLike {
  return readProjectDataRecord(value) ?? {};
}

export function asFiniteNumber(x: unknown): number | undefined {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : undefined;
}

export function detectProjectSchemaVersion(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  const obj = asObjectRecord(data) ?? Object.create(null);
  const n = Number(obj.__version);
  return Number.isFinite(n) ? n : 0;
}

export function hasCurrentProjectSchema(data: unknown): boolean {
  const rec = asObjectRecord(data);
  return (
    !!rec && rec.__schema === PROJECT_SCHEMA_ID && detectProjectSchemaVersion(rec) === PROJECT_SCHEMA_VERSION
  );
}

type JsonCloneCache = Map<object, unknown[] | UnknownRecord>;

function readCachedArrayClone(value: readonly unknown[], seen: JsonCloneCache): unknown[] | null {
  const cached = seen.get(value);
  return Array.isArray(cached) ? cached : null;
}

function readCachedRecordClone(value: UnknownRecord, seen: JsonCloneCache): UnknownRecord | null {
  const cached = seen.get(value);
  return isObjectRecord(cached) ? cached : null;
}

function cloneJsonFallbackArray(value: readonly unknown[], seen: JsonCloneCache): unknown[] {
  const cached = readCachedArrayClone(value, seen);
  if (cached) return cached;

  const out: unknown[] = [];
  seen.set(value, out);
  for (let i = 0; i < value.length; i += 1) {
    const next = cloneJsonFallback(value[i], seen);
    out[i] = next === undefined ? null : next;
  }
  return out;
}

function cloneJsonFallbackRecord(value: UnknownRecord, seen: JsonCloneCache): UnknownRecord {
  const cached = readCachedRecordClone(value, seen);
  if (cached) return cached;

  const out: UnknownRecord = {};
  seen.set(value, out);
  for (const [key, raw] of Object.entries(value)) {
    const next = cloneJsonFallback(raw, seen);
    if (typeof next !== 'undefined') out[key] = next;
  }
  return out;
}

function cloneJsonFallback(value: unknown, seen: JsonCloneCache): unknown {
  if (value == null) return value;
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value;
    case 'number':
      return Number.isFinite(value) ? value : null;
    case 'bigint':
    case 'function':
    case 'symbol':
    case 'undefined':
      return undefined;
    case 'object':
      if (Array.isArray(value)) return cloneJsonFallbackArray(value, seen);
      return isObjectRecord(value) ? cloneJsonFallbackRecord(value, seen) : undefined;
    default:
      return value;
  }
}

function deepCloneProjectJsonUnknown(value: unknown): unknown {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch {
    // ignore and try JSON clone
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return cloneJsonFallback(value, new Map<object, unknown[] | UnknownRecord>());
  }
}

export function deepCloneProjectJson<T>(value: T): T {
  return deepCloneProjectJsonUnknown(value) as T;
}

export function safeJsonParse(text: unknown): unknown {
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
