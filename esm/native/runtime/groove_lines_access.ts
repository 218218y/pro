import {
  readConfigMapFromSnapshot,
  readConfigScalarOrDefaultFromApp,
  readConfigStateFromApp,
} from './config_selectors.js';
import { getDoorsArray, getDrawersArray } from './render_access.js';
import { readRuntimeStateFromApp, readUiStateFromApp } from './root_state_access.js';

import type {
  AppContainer,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  Object3DLike,
  UnknownRecord,
} from '../../../types/index.js';

export const DEFAULT_GROOVE_DENSITY = 20;
const GROOVE_KEY_PREFIX = 'groove_';
export const PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY = 'pendingGrooveLinesCountMap';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readPositiveFinite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readPartId(value: unknown): string {
  return typeof value === 'string' && value ? value : '';
}

function readPositiveIntRecord(value: unknown): Record<string, number> {
  const src = readRecord(value);
  const out: Record<string, number> = Object.create(null);
  if (!src) return out;
  for (const [key, entry] of Object.entries(src)) {
    const normalized = normalizeGrooveLinesCountMapEntry(entry);
    if (normalized !== null && key) out[key] = normalized;
  }
  return out;
}

function readDoorWidthFromGroup(group: Object3DLike | null | undefined): number | null {
  const userData = readRecord(group && group.userData);
  return readPositiveFinite(userData?.__doorWidth);
}

function readFrontWidthFromEntry(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | null | undefined
): number | null {
  const record = readRecord(entry);
  return readPositiveFinite(record?.width) ?? readDoorWidthFromGroup(entry?.group);
}

function readFrontEntryPartId(entry: DoorVisualEntryLike | DrawerVisualEntryLike | null | undefined): string {
  const record = readRecord(entry);
  return (
    readPartId(entry?.partId) ||
    readPartId(record?.id) ||
    readPartId(readRecord(entry?.group?.userData)?.partId)
  );
}

function readUiAutoDoorWidthM(App: AppContainer): number | null {
  const ui = readRecord(readUiStateFromApp(App));
  const raw = readRecord(ui?.raw);
  const widthCm = Number(raw?.width ?? ui?.width);
  const doorsCount = Number(raw?.doors ?? ui?.doors);
  if (!Number.isFinite(widthCm) || widthCm <= 0) return null;
  const safeDoorsCount = Number.isFinite(doorsCount) && doorsCount > 0 ? doorsCount : 1;
  return widthCm / 100 / safeDoorsCount;
}

function readFrontWidthForPart(App: AppContainer, partId: string): number | null {
  const targetId = String(partId || '');
  if (!targetId) return null;

  const scanEntries = (entries: Array<DoorVisualEntryLike | DrawerVisualEntryLike>): number | null => {
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index] || null;
      if (readFrontEntryPartId(entry) !== targetId) continue;
      const width = readFrontWidthFromEntry(entry);
      if (width !== null) return width;
    }
    return null;
  };

  return scanEntries(getDoorsArray(App)) ?? scanEntries(getDrawersArray(App));
}

function readActiveGroovePartIds(App: AppContainer): string[] {
  const rawMap = readConfigMapFromSnapshot(readConfigStateFromApp(App), 'groovesMap', {});
  const record = readRecord(rawMap) || Object.create(null);
  const out: string[] = [];
  for (const [rawKey, rawValue] of Object.entries(record)) {
    if (rawValue == null || rawValue === false) continue;
    const key = String(rawKey || '');
    if (!key) continue;
    const partId = key.startsWith(GROOVE_KEY_PREFIX) ? key.slice(GROOVE_KEY_PREFIX.length) : key;
    if (!partId) continue;
    out.push(partId);
  }
  return out;
}

export function normalizeGrooveLinesCount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
}

export function computeAutoGrooveLinesCount(
  targetWidthM: number,
  density: number = DEFAULT_GROOVE_DENSITY
): number {
  const width = Number(targetWidthM);
  const grooveDensity = Number.isFinite(density) && density > 0 ? density : DEFAULT_GROOVE_DENSITY;
  let grooveCount = Number.isFinite(width) && width > 0 ? Math.floor(width * grooveDensity) : 0;
  if (grooveCount < 1) grooveCount = 1;
  return grooveCount;
}

export function normalizeGrooveLinesCountMapEntry(value: unknown): number | null {
  return normalizeGrooveLinesCount(value);
}

export function readGrooveLinesCountOverride(App: AppContainer): number | null {
  return normalizeGrooveLinesCount(readConfigScalarOrDefaultFromApp(App, 'grooveLinesCount', null));
}

export function readGrooveLinesCountForPart(
  App: AppContainer,
  partId: string | null | undefined
): number | null {
  const key = String(partId || '');
  if (!key) return null;
  const rawMap = readConfigMapFromSnapshot(readConfigStateFromApp(App), 'grooveLinesCountMap', {});
  return normalizeGrooveLinesCountMapEntry(readRecord(rawMap)?.[key]);
}

export function readPendingGrooveLinesCountMap(App: AppContainer): Record<string, number> {
  const runtime = readRecord(readRuntimeStateFromApp(App));
  return readPositiveIntRecord(runtime?.[PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY]);
}

export function readPendingGrooveLinesCountForPart(
  App: AppContainer,
  partId: string | null | undefined
): number | null {
  const key = String(partId || '');
  if (!key) return null;
  const pendingMap = readPendingGrooveLinesCountMap(App);
  return normalizeGrooveLinesCountMapEntry(pendingMap[key]);
}

export function materializeActiveGrooveLinesCountMap(
  App: AppContainer,
  densityOverride?: number
): Record<string, number> {
  const activePartIds = readActiveGroovePartIds(App);
  const fallbackWidth = readUiAutoDoorWidthM(App);
  const out: Record<string, number> = {};

  for (let index = 0; index < activePartIds.length; index++) {
    const partId = activePartIds[index] || '';
    if (!partId) continue;

    const storedCount = readGrooveLinesCountForPart(App, partId);
    if (storedCount !== null) {
      out[partId] = storedCount;
      continue;
    }

    const doorWidth = readFrontWidthForPart(App, partId) ?? fallbackWidth;
    if (doorWidth === null) continue;
    out[partId] = computeAutoGrooveLinesCount(doorWidth, densityOverride);
  }

  return out;
}

export function resolvePendingGrooveLinesCount(
  App: AppContainer,
  targetWidthM: number | null | undefined,
  densityOverride?: number,
  partId?: string | null
): number {
  const override = readGrooveLinesCountOverride(App);
  if (override !== null) return override;

  const widthFromHit = readPositiveFinite(targetWidthM);
  const widthFromPart = readFrontWidthForPart(App, readPartId(partId));
  const fallbackWidth = readUiAutoDoorWidthM(App);
  const stableWidth = widthFromHit ?? widthFromPart ?? fallbackWidth ?? targetWidthM;
  return computeAutoGrooveLinesCount(Number(stableWidth), densityOverride);
}
