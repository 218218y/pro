import type { ProjectJsonLike, UnknownRecord } from '../../../types';

import {
  buildStructureCfgSnapshot as buildProjectConfigStructureCfgSnapshot,
  buildStructureUiSnapshotFromUiAndRaw as buildProjectConfigStructureUiSnapshotFromUiAndRaw,
  normalizeWardrobeType as normalizeProjectConfigWardrobeType,
} from '../features/project_config/project_config_lists_canonical.js';

function isObjectRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readProjectCaptureToJSONValue(value: object): unknown {
  try {
    const maybeToJSON = Reflect.get(value, 'toJSON');
    return typeof maybeToJSON === 'function' ? Reflect.apply(maybeToJSON, value, []) : value;
  } catch {
    return undefined;
  }
}

function cloneProjectCaptureJsonValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): ProjectJsonLike | undefined {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol')
    return undefined;
  if (typeof value === 'bigint') return undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    try {
      const out: ProjectJsonLike[] = [];
      for (const entry of value) {
        const cloned = cloneProjectCaptureJsonValue(entry, seen);
        out.push(typeof cloned === 'undefined' ? null : cloned);
      }
      return out;
    } finally {
      seen.delete(value);
    }
  }
  if (!isObjectRecord(value)) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  try {
    const toJsonValue = readProjectCaptureToJSONValue(value);
    if (toJsonValue !== value) return cloneProjectCaptureJsonValue(toJsonValue, seen);
    const out: Record<string, ProjectJsonLike> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cloned = cloneProjectCaptureJsonValue(entry, seen);
      if (typeof cloned !== 'undefined') out[key] = cloned;
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

export function cloneProjectCaptureValue<T>(value: T | undefined, defaultValue: T): T {
  if (typeof value === 'undefined') return defaultValue;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') return defaultValue;
    const parsed: unknown = JSON.parse(serialized);
    const cloned = cloneProjectCaptureJsonValue(parsed);
    return (typeof cloned === 'undefined' ? defaultValue : cloned) as T;
  } catch {
    const cloned = cloneProjectCaptureJsonValue(value);
    return (typeof cloned === 'undefined' ? defaultValue : cloned) as T;
  }
}

export const normalizeWardrobeType = normalizeProjectConfigWardrobeType;

export function buildStructureUiSnapshot(uiRec: UnknownRecord, rawAny: UnknownRecord): UnknownRecord {
  return buildProjectConfigStructureUiSnapshotFromUiAndRaw(uiRec, rawAny);
}

export function buildStructureCfgSnapshot(cfgRec: UnknownRecord): UnknownRecord {
  return buildProjectConfigStructureCfgSnapshot(cfgRec);
}
