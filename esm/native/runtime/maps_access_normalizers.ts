import type { KnownMapName, MapsByName } from '../../../types';

import {
  type KnownMapNormalizerMap,
  isKnownMapName,
  normalizeDoorStyleMap,
  normalizeHandlesMap,
  normalizeHingeMap,
  normalizeNullablePositiveIntMap,
  normalizeNullableStringMap,
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
  splitDoorsBottomMap: normalizeToggleMap,
  drawerDividersMap: normalizeToggleMap,
  groovesMap: normalizeToggleMap,
  grooveLinesCountMap: normalizeNullablePositiveIntMap,
  removedDoorsMap: normalizeToggleMap,
  curtainMap: normalizeNullableStringMap,
  individualColors: normalizeNullableStringMap,
  doorSpecialMap: normalizeNullableStringMap,
  doorStyleMap: normalizeDoorStyleMap,
  mirrorLayoutMap: normalizeMirrorLayoutMap,
  doorTrimMap: normalizeDoorTrimMap,
} satisfies KnownMapNormalizerMap;

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
  isKnownMapName,
  normalizeColorSwatchesOrderSnapshot,
  normalizeSavedColorObjectsSnapshot,
  normalizeSavedColorsSnapshot,
};
