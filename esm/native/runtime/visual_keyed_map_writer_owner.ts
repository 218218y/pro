import type {
  ActionMetaLike,
  GrooveLayoutEntry,
  MapsByName,
  MirrorLayoutEntry,
  UnknownRecord,
} from '../../../types';

import type { DoorArchCut } from '../../../types/maps.js';
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

type ArchLayoutEdit<T> = { key: string; value: T } | { key: string; index: number };

function updateArchLayouts<T>(
  map: Record<string, T[] | undefined>,
  edits: readonly ArchLayoutEdit<T>[]
): void {
  for (const key of new Set(edits.map(edit => edit.key))) {
    const next = (map[key] ?? []).filter(
      (_layout, index) => !edits.some(edit => edit.key === key && 'index' in edit && edit.index === index)
    );
    for (const edit of edits) {
      if (edit.key === key && 'value' in edit) next.push(edit.value);
    }
    if (next.length) map[key] = next;
    else delete map[key];
  }
}

export function writeDoorArchMaps(
  App: unknown,
  edit:
    | { tool: 'cut'; entries: readonly { key: string; value: DoorArchCut | null }[] }
    | { tool: 'mirror'; entries: readonly ArchLayoutEdit<MirrorLayoutEntry>[] }
    | { tool: 'groove'; entries: readonly ArchLayoutEdit<GrooveLayoutEntry>[] },
  meta: ActionMetaLike
): void {
  if (edit.tool === 'cut') {
    patchVisualKeyedMapEntriesFromOwner(App, 'splitDoorsMap', edit.entries, meta);
  } else if (edit.tool === 'mirror') {
    const mirrorLayoutMap = normalizeKnownMapSnapshot(
      'mirrorLayoutMap',
      cfgMapRecord(App, 'mirrorLayoutMap')
    );
    updateArchLayouts(mirrorLayoutMap, edit.entries);
    setCfgMapFromVisualKeyedOwner(App, 'mirrorLayoutMap', mirrorLayoutMap, meta);
  } else {
    const grooveLayoutMap = normalizeKnownMapSnapshot(
      'grooveLayoutMap',
      cfgMapRecord(App, 'grooveLayoutMap')
    );
    const groovesMap = normalizeKnownMapSnapshot('groovesMap', cfgMapRecord(App, 'groovesMap'));
    updateArchLayouts(grooveLayoutMap, edit.entries);
    for (const { key } of edit.entries) {
      groovesMap[toCanonicalGroovesMapKey(key)] = !!grooveLayoutMap[key]?.length;
    }
    commitConfigMapOwnerPatchWithReplaceKeys(
      App,
      { grooveLayoutMap, groovesMap },
      { grooveLayoutMap: true, groovesMap: true },
      meta
    );
  }
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
