import type { ActionMetaLike, MapsByName, UnknownRecord } from '../../../types';

import { commitConfigMapOwnerPatchWithReplaceKeys } from './cfg_access_map_owner.js';
import { cfgMapRecord, readMapRecord } from './cfg_access_shared.js';
import { normalizeKnownMapSnapshot } from './maps_access_normalizers.js';
import type { VisualKeyedMapName } from './visual_keyed_map_names.js';
import {
  toCanonicalGrooveLayoutMapKey,
  toCanonicalGrooveLinesCountMapKey,
  toCanonicalGroovesMapKey,
} from '../../shared/door_groove_key_contracts_shared.js';
import { toCanonicalDoorTrimTargetKey } from '../../shared/door_trim_key_contracts_shared.js';
import { toCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

type GrooveContractMapName = 'groovesMap' | 'grooveLinesCountMap';
type CanonicalVisualPatchMapName = GrooveContractMapName | 'grooveLayoutMap' | 'doorTrimMap';

export type VisualKeyedOwnerPatchMapName =
  | CanonicalVisualPatchMapName
  | Extract<VisualKeyedMapName, 'removedDoorsMap' | 'splitDoorsMap' | 'splitDoorsBottomMap'>;

export type VisualKeyedMapPatchEntry = Readonly<{
  key: unknown;
  value: unknown;
}>;

function readGrooveContractMapKey(mapName: GrooveContractMapName, key: unknown): string {
  return mapName === 'groovesMap' ? toCanonicalGroovesMapKey(key) : toCanonicalGrooveLinesCountMapKey(key);
}

function readCanonicalVisualPatchKey(mapName: CanonicalVisualPatchMapName, key: unknown): string {
  if (mapName === 'doorTrimMap') return toCanonicalDoorTrimTargetKey(key);
  if (mapName === 'grooveLayoutMap') return toCanonicalGrooveLayoutMapKey(key);
  return readGrooveContractMapKey(mapName, key);
}

function readCanonicalOwnerPatchKey(mapName: VisualKeyedOwnerPatchMapName, key: unknown): string {
  if (mapName === 'removedDoorsMap') return toCanonicalRemovedDoorsMapKey(key);
  if (mapName === 'splitDoorsMap' || mapName === 'splitDoorsBottomMap') {
    return formatIdentityValue(readIdentityValue(key)).trim();
  }
  return readCanonicalVisualPatchKey(mapName, key);
}

function setCfgMapFromVisualKeyedOwner(
  App: unknown,
  mapName: VisualKeyedMapName,
  nextMap: unknown,
  meta?: ActionMetaLike
): UnknownRecord {
  const next = readMapRecord(nextMap);

  commitConfigMapOwnerPatchWithReplaceKeys(App, { [mapName]: next }, { [mapName]: true }, meta);
  return next;
}

function readNormalizedVisualKeyedMap(
  App: unknown,
  mapName: VisualKeyedOwnerPatchMapName
): Record<string, unknown> {
  return { ...(normalizeKnownMapSnapshot(mapName, cfgMapRecord(App, mapName)) as Record<string, unknown>) };
}

export function setCfgVisualKeyedMapFromOwner<K extends VisualKeyedMapName>(
  App: unknown,
  mapName: K,
  nextMap: unknown,
  meta?: ActionMetaLike
): MapsByName[K] {
  return setCfgMapFromVisualKeyedOwner(App, mapName, nextMap, meta) as MapsByName[K];
}

export function patchVisualKeyedMapEntriesFromOwner(
  App: unknown,
  mapName: VisualKeyedOwnerPatchMapName,
  entries: readonly VisualKeyedMapPatchEntry[],
  meta?: ActionMetaLike
): boolean {
  if (!entries.length) return false;
  const nextMap = readNormalizedVisualKeyedMap(App, mapName);

  for (const entry of entries) {
    const canonicalKey = readCanonicalOwnerPatchKey(mapName, entry.key);
    if (!canonicalKey) continue;
    if (entry.value == null) {
      delete nextMap[canonicalKey];
      continue;
    }

    const normalizedEntryMap = normalizeKnownMapSnapshot(mapName, {
      [canonicalKey]: entry.value,
    }) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(normalizedEntryMap, canonicalKey)) {
      nextMap[canonicalKey] = normalizedEntryMap[canonicalKey];
    } else {
      delete nextMap[canonicalKey];
    }
  }

  setCfgVisualKeyedMapFromOwner(App, mapName, nextMap, meta);
  return true;
}

export function toggleVisualKeyedMapEntryFromOwner(
  App: unknown,
  mapName: Extract<VisualKeyedOwnerPatchMapName, 'groovesMap'>,
  key: unknown,
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = readCanonicalOwnerPatchKey(mapName, key);
  if (!canonicalKey) return false;
  const current = readNormalizedVisualKeyedMap(App, mapName);
  return patchVisualKeyedMapEntriesFromOwner(
    App,
    mapName,
    [{ key: canonicalKey, value: current[canonicalKey] === true ? null : true }],
    meta
  );
}
