import type {
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  DoorTrimMap,
  GroovesMap,
  GrooveLinesCountMap,
  HandlesMap,
  HingeMap,
  IndividualColorsMap,
  MirrorLayoutMap,
  ProjectJsonLike,
  ProjectPdfDraftLike,
  RemovedDoorsMap,
  RoundedFrameSideShelvesMap,
  SplitDoorsBottomMap,
  SplitDoorsMap,
  ToggleValue,
  UnknownRecord,
} from '../../../../types/index.js';

import { readDoorStyleMap as readCanonicalDoorStyleMap } from '../door_style_overrides.js';
import { readDoorTrimMap } from '../door_trim.js';
import { readMirrorLayoutMap } from '../mirror_layout.js';

function isObjectRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObjectRecord(value: unknown): UnknownRecord | null {
  return isObjectRecord(value) ? value : null;
}

function asMapRecord(value: unknown): Record<string, unknown> {
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

export function readStringMap(value: unknown): Record<string, string | null | undefined> {
  const src = asObjectRecord(value);
  if (!src) return {};
  const out: Record<string, string | null | undefined> = {};
  for (const [key, entry] of Object.entries(src)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function isToggleValue(value: unknown): value is ToggleValue | undefined {
  return (
    value === true ||
    value === false ||
    value === null ||
    value === 1 ||
    value === 0 ||
    typeof value === 'undefined'
  );
}

export function readToggleMap(value: unknown): Record<string, ToggleValue | undefined> {
  const src = asObjectRecord(value);
  if (!src) return {};
  const out: Record<string, ToggleValue | undefined> = {};
  for (const [key, entry] of Object.entries(src)) {
    if (isToggleValue(entry)) out[key] = entry;
  }
  return out;
}

export function readBooleanToggleMap(value: unknown): Record<string, true | false | null | undefined> {
  const src = readToggleMap(value);
  const out: Record<string, true | false | null | undefined> = {};
  for (const [key, entry] of Object.entries(src)) {
    if (entry === 1) out[key] = true;
    else if (entry === 0) out[key] = false;
    else out[key] = entry;
  }
  return out;
}

export function readHandlesMap(value: unknown): HandlesMap {
  return readStringMap(value);
}

export function readRemovedDoorsMap(value: unknown): RemovedDoorsMap {
  return readToggleMap(value);
}

export function readRoundedFrameSideShelvesMap(value: unknown): RoundedFrameSideShelvesMap {
  return readBooleanToggleMap(value);
}

export function readCurtainMap(value: unknown): CurtainMap {
  return readStringMap(value);
}

export function readGroovesMap(value: unknown): GroovesMap {
  const src = readToggleMap(value);
  const out: GroovesMap = {};
  for (const [key, entry] of Object.entries(src)) {
    if (key.startsWith('groove_')) out[key] = entry;
  }
  return out;
}

export function readGrooveLinesCountMap(value: unknown): GrooveLinesCountMap {
  const src = asObjectRecord(value);
  const out: GrooveLinesCountMap = {};
  if (!src) return out;
  for (const [key, entry] of Object.entries(src)) {
    if (entry == null || entry === '') continue;
    const n = Number(entry);
    if (Number.isFinite(n) && n >= 1) out[key] = Math.max(1, Math.floor(n));
  }
  return out;
}

export function readIndividualColorsMap(value: unknown): IndividualColorsMap {
  return readStringMap(value);
}

export function readDoorSpecialMap(value: unknown): DoorSpecialMap {
  return readStringMap(value);
}

export function readDoorStyleMap(value: unknown): DoorStyleMap {
  return readCanonicalDoorStyleMap(value);
}

export function isHingeMapEntry(value: unknown): value is HingeMap[string] {
  return typeof value === 'string' || value === null || typeof value === 'undefined' || isObjectRecord(value);
}

export function readHingeMap(value: unknown): HingeMap {
  const src = asObjectRecord(value);
  if (!src) return {};
  const out: HingeMap = {};
  for (const [key, entry] of Object.entries(src)) {
    if (isHingeMapEntry(entry)) out[key] = entry;
  }
  return out;
}

function readBoolish(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === 'string') {
    const norm = value.trim().toLowerCase();
    if (norm === 'true' || norm === '1') return true;
    if (norm === 'false' || norm === '0') return false;
  }
  return null;
}

function readNullableBoolish(value: unknown): boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const next = readBoolish(value);
  return next == null ? undefined : next;
}

function parseSplitPositionList(raw: unknown): number[] {
  const out: number[] = [];
  const push = (value: unknown) => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(n)) return;
    out.push(Math.max(0, Math.min(1, n)));
  };

  try {
    if (Array.isArray(raw)) {
      for (const entry of raw) push(entry);
    } else if (typeof raw === 'number') {
      push(raw);
    } else if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return out;
      if (s.startsWith('[')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            for (const entry of parsed) push(entry);
          } else {
            push(parsed);
          }
        } catch {
          push(s);
        }
      } else if (s.includes(',')) {
        for (const part of s.split(',')) push(part);
      } else {
        push(s);
      }
    }
  } catch {
    // Invalid split-position data produces no canonical entries.
  }

  out.sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const value of out) {
    if (!deduped.length || Math.abs(deduped[deduped.length - 1] - value) > 1e-6) deduped.push(value);
  }
  return deduped;
}

export function readSplitDoorsMapValue(value: unknown): SplitDoorsMap {
  const src = asMapRecord(value);
  const out: SplitDoorsMap = {};
  const hasOwn = Object.prototype.hasOwnProperty;

  const assignSplitToggle = (key: string, entry: unknown) => {
    const next = readBoolish(entry);
    if (next == null) return;
    if (hasOwn.call(out, key)) {
      if (out[key] === false || next === false) out[key] = false;
      else out[key] = true;
      return;
    }
    out[key] = next;
  };

  for (const rawKey in src) {
    if (!hasOwn.call(src, rawKey)) continue;
    const entry = src[rawKey];
    const key = String(rawKey || '');

    if (key.startsWith('split_')) {
      assignSplitToggle(key, entry);
      continue;
    }

    if (key.startsWith('splitpos_')) {
      const list = parseSplitPositionList(entry);
      if (list.length) out[key] = list;
    }
  }

  return out;
}

export function readSplitDoorsBottomMapValue(value: unknown): SplitDoorsBottomMap {
  const src = asMapRecord(value);
  const out: SplitDoorsBottomMap = {};
  const hasOwn = Object.prototype.hasOwnProperty;

  const assignNormalizedToggle = (key: string, entry: unknown): void => {
    const next = readNullableBoolish(entry);
    if (typeof next !== 'undefined') out[key] = next;
  };

  for (const rawKey in src) {
    if (!hasOwn.call(src, rawKey)) continue;
    const entry = src[rawKey];
    const key = String(rawKey || '');

    if (key.startsWith('splitb_')) assignNormalizedToggle(key, entry);
  }

  return out;
}

export function readMirrorLayoutConfigMap(value: unknown): MirrorLayoutMap {
  return readMirrorLayoutMap(value);
}

export function readDoorTrimConfigMap(value: unknown): DoorTrimMap {
  return readDoorTrimMap(value);
}
