import type { KnownMapName, MapsByName } from '../../../types';

import {
  type KnownMapNormalizerMap,
  normalizeDoorStyleMap,
  normalizeGroovesMap,
  normalizeHandlesMap,
  normalizeHingeMap,
  normalizeNullablePositiveIntMap,
  normalizeNullableStringMap,
  normalizeRemovedDoorsMap,
  normalizeSplitDoorsBottomMap,
  normalizeSplitDoorsMap,
  normalizeToggleMap,
} from './maps_access_normalizers_shared.js';
import {
  normalizeColorSwatchesOrderSnapshot,
  normalizeSavedColorObjectsSnapshot,
  normalizeSavedColorsSnapshot,
} from './maps_access_normalizers_collections.js';
import { normalizeDoorTrimMap, normalizeMirrorLayoutMap } from './maps_access_normalizers_visuals.js';

const KNOWN_MAP_NORMALIZERS = {
  handlesMap: normalizeHandlesMap,
  hingeMap: normalizeHingeMap,
  splitDoorsMap: normalizeSplitDoorsMap,
  splitDoorsBottomMap: normalizeSplitDoorsBottomMap,
  drawerDividersMap: normalizeToggleMap,
  groovesMap: normalizeGroovesMap,
  grooveLinesCountMap: normalizeNullablePositiveIntMap,
  removedDoorsMap: normalizeRemovedDoorsMap,
  roundedFrameSideShelvesMap: normalizeToggleMap,
  curtainMap: normalizeNullableStringMap,
  individualColors: normalizeNullableStringMap,
  doorSpecialMap: normalizeNullableStringMap,
  doorStyleMap: normalizeDoorStyleMap,
  mirrorLayoutMap: normalizeMirrorLayoutMap,
  doorTrimMap: normalizeDoorTrimMap,
} satisfies KnownMapNormalizerMap;

const KNOWN_MAP_NORMALIZER_NAMES = Object.freeze(Object.keys(KNOWN_MAP_NORMALIZERS) as KnownMapName[]);
const KNOWN_MAP_NAME_SET = new Set<string>(KNOWN_MAP_NORMALIZER_NAMES);

export function getKnownMapNames(): KnownMapName[] {
  return [...KNOWN_MAP_NORMALIZER_NAMES];
}

export function isKnownMapName(value: string): value is KnownMapName {
  return KNOWN_MAP_NAME_SET.has(value);
}

function readKnownMapNormalizer<K extends KnownMapName>(mapName: K): KnownMapNormalizerMap[K] {
  return KNOWN_MAP_NORMALIZERS[mapName];
}

export function normalizeKnownMapSnapshot<K extends KnownMapName>(mapName: K, value: unknown): MapsByName[K] {
  return readKnownMapNormalizer(mapName)(value);
}

export function createEmptyKnownMapSnapshot<K extends KnownMapName>(mapName: K): MapsByName[K] {
  return normalizeKnownMapSnapshot(mapName, null);
}

export {
  normalizeColorSwatchesOrderSnapshot,
  normalizeSavedColorObjectsSnapshot,
  normalizeSavedColorsSnapshot,
};
