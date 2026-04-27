import type {
  UnknownRecord,
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
} from '../../../types/index.js';

import {
  cloneProjectJson as cloneProjectJsonCanonical,
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
  readStringMap as readStringMapCanonical,
  readToggleMap as readToggleMapCanonical,
} from '../features/project_config/project_config_persisted_payload_shared.js';

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
  return cloneProjectJsonCanonical(value);
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
