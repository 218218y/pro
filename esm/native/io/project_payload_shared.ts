import type {
  UnknownRecord,
  ProjectJsonLike,
  ProjectPdfDraftLike,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
  SavedNote,
  SavedNoteStyle,
  ToggleValue,
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  GroovesMap,
  GrooveLinesCountMap,
  HandlesMap,
  HingeMap,
  IndividualColorsMap,
  RemovedDoorsMap,
  RoundedFrameSideShelvesMap,
} from '../../../types/index.js';

import {
  isHingeMapEntry as isHingeMapEntryCanonical,
  isToggleValue as isToggleValueCanonical,
  readCurtainMap as readCurtainMapCanonical,
  readDoorSpecialMap as readDoorSpecialMapCanonical,
  readDoorStyleMap as readDoorStyleMapCanonical,
  readGrooveLinesCountMap as readGrooveLinesCountMapCanonical,
  readGroovesMap as readGroovesMapCanonical,
  readHandlesMap as readHandlesMapCanonical,
  readHingeMap as readHingeMapCanonical,
  readIndividualColorsMap as readIndividualColorsMapCanonical,
  readRemovedDoorsMap as readRemovedDoorsMapCanonical,
  readRoundedFrameSideShelvesMap as readRoundedFrameSideShelvesMapCanonical,
  readStringMap as readStringMapCanonical,
  readToggleMap as readToggleMapCanonical,
} from './project_io_load_helpers_maps.js';

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

export function readObjectArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const SAVED_NOTE_STYLE_KEYS: Array<keyof SavedNoteStyle> = [
  'left',
  'top',
  'width',
  'height',
  'baseTextColor',
  'baseFontSize',
  'textColor',
  'fontSize',
];

export function readSavedNoteStyle(value: unknown): SavedNoteStyle | undefined {
  const rec = asObjectRecord(value);
  if (!rec) return undefined;
  const next: SavedNoteStyle = {};
  for (const key of SAVED_NOTE_STYLE_KEYS) {
    const entry = rec[key];
    if (typeof entry === 'string' && entry) next[key] = entry;
  }
  return Object.keys(next).length ? next : undefined;
}

export function readSavedNotes(value: unknown): ProjectSavedNotesLike {
  const arr = Array.isArray(value) ? value : [];
  const out: ProjectSavedNotesLike = [];
  for (const entry of arr) {
    const rec = asObjectRecord(entry);
    if (!rec) continue;
    const next: SavedNote = {};
    if (typeof rec.id === 'string' && rec.id) next.id = rec.id;
    if (typeof rec.text === 'string' && rec.text) next.text = rec.text;
    const style = readSavedNoteStyle(rec.style);
    if (style) next.style = style;
    if (typeof rec.doorsOpen === 'boolean') next.doorsOpen = rec.doorsOpen;
    if (Object.keys(next).length) out.push(next);
  }
  return out;
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

export function readPreChestState(value: unknown): ProjectPreChestStateLike {
  return value === null ? null : asObjectRecord(value);
}

export function readStringMap(value: unknown): Record<string, string | null | undefined> {
  return readStringMapCanonical(value);
}

export function isToggleValue(value: unknown): value is ToggleValue | undefined {
  return isToggleValueCanonical(value);
}

export function readToggleMap(value: unknown): Record<string, ToggleValue | undefined> {
  return readToggleMapCanonical(value);
}

export function readHandlesMap(value: unknown): HandlesMap {
  return readHandlesMapCanonical(value);
}

export function readRemovedDoorsMap(value: unknown): RemovedDoorsMap {
  return readRemovedDoorsMapCanonical(value);
}

export function readRoundedFrameSideShelvesMap(value: unknown): RoundedFrameSideShelvesMap {
  return readRoundedFrameSideShelvesMapCanonical(value);
}

export function readCurtainMap(value: unknown): CurtainMap {
  return readCurtainMapCanonical(value);
}

export function readGroovesMap(value: unknown): GroovesMap {
  return readGroovesMapCanonical(value);
}

export function readGrooveLinesCountMap(value: unknown): GrooveLinesCountMap {
  return readGrooveLinesCountMapCanonical(value);
}

export function readIndividualColorsMap(value: unknown): IndividualColorsMap {
  return readIndividualColorsMapCanonical(value);
}

export function readDoorSpecialMap(value: unknown): DoorSpecialMap {
  return readDoorSpecialMapCanonical(value);
}

export function readDoorStyleMap(value: unknown): DoorStyleMap {
  return readDoorStyleMapCanonical(value);
}

export function isHingeMapEntry(value: unknown): value is HingeMap[string] {
  return isHingeMapEntryCanonical(value);
}

export function readHingeMap(value: unknown): HingeMap {
  return readHingeMapCanonical(value);
}
