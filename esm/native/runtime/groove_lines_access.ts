import {
  readConfigMapFromSnapshot,
  readConfigScalarOrDefaultFromApp,
  readConfigStateFromApp,
} from './config_selectors.js';
import { getDoorsArray, getDrawersArray } from './render_access.js';
import { readRuntimeStateFromApp, readUiStateFromApp } from './root_state_access.js';
import { normalizeKnownMapSnapshot } from './maps_access_normalizers.js';
import {
  DEFAULT_GROOVE_DENSITY_PER_M,
  listDoorGrooveTargetLookupKeys,
  readGrooveLayoutListForPart,
  resolveGroovePlacementInRect,
  toCanonicalDoorGrooveTargetKey,
  toCanonicalGrooveLinesCountMapKey,
} from '../../shared/surface_layout_contracts_shared.js';

import type {
  AppContainer,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  Object3DLike,
  UnknownRecord,
} from '../../../types/index.js';

type GrooveLayoutRect = Parameters<typeof resolveGroovePlacementInRect>[0]['rect'];

export const DEFAULT_GROOVE_DENSITY = DEFAULT_GROOVE_DENSITY_PER_M;
export const PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY = 'pendingGrooveLinesCountMap';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readPositiveFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function readPartId(value: unknown): string {
  return typeof value === 'string' && value ? value : '';
}

function readPositiveIntRecord(value: unknown): Record<string, number> {
  const src = readRecord(value);
  const out: Record<string, number> = Object.create(null);
  const directByKey: Record<string, boolean> = Object.create(null);
  if (!src) return out;
  for (const [key, entry] of Object.entries(src)) {
    const canonicalKey = toCanonicalGrooveLinesCountMapKey(key);
    if (!canonicalKey) continue;
    const normalized = normalizeGrooveLinesCountMapEntry(entry);
    if (normalized === null) continue;
    const isDirect = key === canonicalKey;
    if (directByKey[canonicalKey] && !isDirect) continue;
    out[canonicalKey] = normalized;
    directByKey[canonicalKey] = isDirect;
  }
  return out;
}

function readDoorWidthFromGroup(group: Object3DLike | null | undefined): number | null {
  const userData = readRecord(group && group.userData);
  return readPositiveFinite(userData?.__doorWidth);
}

function readDoorHeightFromGroup(group: Object3DLike | null | undefined): number | null {
  const userData = readRecord(group && group.userData);
  return readPositiveFinite(userData?.__doorHeight);
}

function readGrooveSurfaceRectFromGroup(
  group: Object3DLike | null | undefined,
  partId: string
): GrooveLayoutRect | null {
  if (!group) return null;
  const stack: Object3DLike[] = [group];
  const seen = new Set<Object3DLike>();
  let firstRect: GrooveLayoutRect | null = null;
  let visited = 0;

  while (stack.length && visited < 500) {
    visited += 1;
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    const userData = readRecord(current.userData);
    const rawRect = readRecord(userData?.__wpGrooveSurfaceRect);
    if (rawRect) {
      const minX = Number(rawRect.minX);
      const maxX = Number(rawRect.maxX);
      const minY = Number(rawRect.minY);
      const maxY = Number(rawRect.maxY);
      if (
        Number.isFinite(minX) &&
        Number.isFinite(maxX) &&
        Number.isFinite(minY) &&
        Number.isFinite(maxY) &&
        maxX > minX &&
        maxY > minY
      ) {
        const rect = { minX, maxX, minY, maxY };
        if (!firstRect) firstRect = rect;
        const surfacePartId = readPartId(userData?.__wpGrooveSurfacePartId);
        if (!partId || surfacePartId === partId) return rect;
      }
    }

    const children = Array.isArray(current.children) ? current.children : [];
    for (let index = 0; index < children.length; index += 1) {
      const child = readRecord(children[index]) as Object3DLike | null;
      if (child) stack.push(child);
    }
  }

  return firstRect;
}

function readFrontWidthFromEntry(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | null | undefined
): number | null {
  const record = readRecord(entry);
  return readPositiveFinite(record?.width) ?? readDoorWidthFromGroup(entry?.group);
}

function readFrontHeightFromEntry(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | null | undefined
): number | null {
  const record = readRecord(entry);
  return readPositiveFinite(record?.height) ?? readDoorHeightFromGroup(entry?.group);
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

function readUiAutoDoorHeightM(App: AppContainer): number | null {
  const ui = readRecord(readUiStateFromApp(App));
  const raw = readRecord(ui?.raw);
  const heightCm = Number(raw?.height ?? ui?.height);
  return Number.isFinite(heightCm) && heightCm > 0 ? heightCm / 100 : null;
}

type GrooveFrontDimensions = {
  widthM: number | null;
  heightM: number | null;
  surfaceRect: GrooveLayoutRect | null;
};

function readFrontDimensionsForPart(App: AppContainer, partId: string): GrooveFrontDimensions | null {
  const targetId = String(partId || '');
  if (!targetId) return null;

  const findTargetNode = (root: Object3DLike | null | undefined): Object3DLike | null => {
    if (!root) return null;
    const stack: Object3DLike[] = [root];
    const seen = new Set<Object3DLike>();
    let visited = 0;
    while (stack.length && visited < 500) {
      visited += 1;
      const current = stack.pop();
      if (!current || seen.has(current)) continue;
      seen.add(current);
      if (readPartId(readRecord(current.userData)?.partId) === targetId) return current;
      const children = Array.isArray(current.children) ? current.children : [];
      for (let index = 0; index < children.length; index += 1) {
        const child = readRecord(children[index]) as Object3DLike | null;
        if (child) stack.push(child);
      }
    }
    return null;
  };

  const scanEntries = (
    entries: Array<DoorVisualEntryLike | DrawerVisualEntryLike>
  ): GrooveFrontDimensions | null => {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index] || null;
      const rootMatches = readFrontEntryPartId(entry) === targetId;
      const targetNode = rootMatches ? entry?.group : findTargetNode(entry?.group);
      if (!rootMatches && !targetNode) continue;
      return {
        widthM: rootMatches ? readFrontWidthFromEntry(entry) : readDoorWidthFromGroup(targetNode),
        heightM: rootMatches ? readFrontHeightFromEntry(entry) : readDoorHeightFromGroup(targetNode),
        surfaceRect: targetNode ? readGrooveSurfaceRectFromGroup(targetNode, targetId) : null,
      };
    }
    return null;
  };

  return scanEntries(getDoorsArray(App)) ?? scanEntries(getDrawersArray(App));
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

function resolveActiveGrooveDistributionSpanM(args: {
  App: AppContainer;
  partId: string;
  grooveLayoutMap: unknown;
}): number | null {
  const dimensions = readFrontDimensionsForPart(args.App, args.partId);
  const fallbackWidth = dimensions?.widthM ?? readUiAutoDoorWidthM(args.App);
  const fallbackHeight = dimensions?.heightM ?? readUiAutoDoorHeightM(args.App);
  const rect =
    dimensions?.surfaceRect ||
    (fallbackWidth != null && fallbackHeight != null
      ? {
          minX: -fallbackWidth / 2,
          maxX: fallbackWidth / 2,
          minY: -fallbackHeight / 2,
          maxY: fallbackHeight / 2,
        }
      : null);
  const layout = readGrooveLayoutListForPart({ map: args.grooveLayoutMap, partId: args.partId })?.layouts[0];
  if (!rect) return fallbackWidth;
  const placement = resolveGroovePlacementInRect({ rect, layout });
  return placement.orientation === 'horizontal' ? placement.heightM : placement.widthM;
}

function readActiveGroovePartIds(App: AppContainer): string[] {
  const rawMap = readConfigMapFromSnapshot(readConfigStateFromApp(App), 'groovesMap', {});
  const record = normalizeKnownMapSnapshot('groovesMap', rawMap);
  const out: string[] = [];
  for (const [rawKey, rawValue] of Object.entries(record)) {
    if (rawValue == null || rawValue === false) continue;
    const key = String(rawKey || '');
    if (!key) continue;
    const partId = toCanonicalDoorGrooveTargetKey(key);
    if (!partId) continue;
    out.push(partId);
  }
  return out;
}

export function normalizeGrooveLinesCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null;
  const n = value;
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
  const keys = listDoorGrooveTargetLookupKeys(partId);
  if (!keys.length) return null;
  const map = normalizeKnownMapSnapshot(
    'grooveLinesCountMap',
    readConfigMapFromSnapshot(readConfigStateFromApp(App), 'grooveLinesCountMap', {})
  );
  for (const key of keys) {
    const normalized = normalizeGrooveLinesCountMapEntry(map[key]);
    if (normalized !== null) return normalized;
  }
  return null;
}

export function readPendingGrooveLinesCountMap(App: AppContainer): Record<string, number> {
  const runtime = readRecord(readRuntimeStateFromApp(App));
  return readPositiveIntRecord(runtime?.[PENDING_GROOVE_LINES_COUNT_MAP_RUNTIME_KEY]);
}

export function readPendingGrooveLinesCountForPart(
  App: AppContainer,
  partId: string | null | undefined
): number | null {
  const key = toCanonicalGrooveLinesCountMapKey(partId);
  if (!key) return null;
  const pendingMap = readPendingGrooveLinesCountMap(App);
  return normalizeGrooveLinesCountMapEntry(pendingMap[key]);
}

export function materializeActiveGrooveLinesCountMap(
  App: AppContainer,
  densityOverride?: number
): Record<string, number> {
  const activePartIds = readActiveGroovePartIds(App);
  const config = readConfigStateFromApp(App);
  const grooveLayoutMap = readConfigMapFromSnapshot(config, 'grooveLayoutMap', {});
  const out: Record<string, number> = {};

  for (let index = 0; index < activePartIds.length; index++) {
    const partId = activePartIds[index] || '';
    if (!partId) continue;

    const placedLayouts = readGrooveLayoutListForPart({ map: grooveLayoutMap, partId })?.layouts || [];
    if (
      placedLayouts.length > 0 &&
      placedLayouts.every(layout => normalizeGrooveLinesCount(layout.linesCount) !== null)
    ) {
      continue;
    }

    const storedCount = readGrooveLinesCountForPart(App, partId);
    if (storedCount !== null) {
      out[partId] = storedCount;
      continue;
    }

    const distributionSpan = resolveActiveGrooveDistributionSpanM({ App, partId, grooveLayoutMap });
    if (distributionSpan === null) continue;
    out[partId] = computeAutoGrooveLinesCount(distributionSpan, densityOverride);
  }

  return out;
}

export function resolvePendingGrooveLinesCount(
  App: AppContainer,
  targetDistributionSpanM: number | null | undefined,
  densityOverride?: number,
  partId?: string | null
): number {
  const override = readGrooveLinesCountOverride(App);
  if (override !== null) return override;

  const widthFromHit = readPositiveFinite(targetDistributionSpanM);
  const widthFromPart = readFrontWidthForPart(App, readPartId(partId));
  const fallbackWidth = readUiAutoDoorWidthM(App);
  const stableWidth = widthFromHit ?? widthFromPart ?? fallbackWidth ?? targetDistributionSpanM;
  return computeAutoGrooveLinesCount(Number(stableWidth), densityOverride);
}
