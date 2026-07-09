import type { ProjectJsonLike, ProjectPdfDraftLike, UnknownRecord } from '../../types/index.js';

export function isObjectRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asObjectRecord(value: unknown): UnknownRecord | null {
  return isObjectRecord(value) ? value : null;
}

export function asObject(value: unknown): UnknownRecord {
  return asObjectRecord(value) ?? {};
}

export function asMapRecord(value: unknown): Record<string, unknown> {
  return asObjectRecord(value) ?? Object.create(null);
}

function readProjectJsonToJSONValue(value: object): unknown {
  try {
    const maybe = value as { toJSON?: () => unknown };
    return typeof maybe.toJSON === 'function' ? maybe.toJSON() : value;
  } catch {
    return undefined;
  }
}

function cloneProjectJsonValue(
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
        const cloned = cloneProjectJsonValue(entry, seen);
        out.push(typeof cloned === 'undefined' ? null : cloned);
      }
      return out;
    } finally {
      seen.delete(value);
    }
  }
  const rec = asObjectRecord(value);
  if (!rec) return undefined;
  if (seen.has(rec)) return undefined;
  seen.add(rec);
  try {
    const toJsonValue = readProjectJsonToJSONValue(rec);
    if (toJsonValue !== rec) return cloneProjectJsonValue(toJsonValue, seen);
    const out: Record<string, ProjectJsonLike> = {};
    for (const [key, entry] of Object.entries(rec)) {
      const cloned = cloneProjectJsonValue(entry, seen);
      if (typeof cloned !== 'undefined') out[key] = cloned;
    }
    return out;
  } finally {
    seen.delete(rec);
  }
}

export function cloneProjectJson(value: unknown): ProjectPdfDraftLike | null {
  if (typeof value === 'undefined') return null;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') return null;
    const parsed: unknown = JSON.parse(serialized);
    const cloned = cloneProjectJsonValue(parsed);
    return typeof cloned === 'undefined' ? null : cloned;
  } catch {
    const cloned = cloneProjectJsonValue(value);
    return typeof cloned === 'undefined' ? null : cloned;
  }
}
