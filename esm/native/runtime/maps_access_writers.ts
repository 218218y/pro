import type { ActionMetaLike } from '../../../types';

import { mapsAccessReportNonFatal } from './maps_access_shared.js';
import { splitBottomKey, splitKey, splitPosKey } from './maps_access_split_helpers.js';
import type { HandleValue, HingeValue } from './maps_access_shared.js';
import { readMapsBagOrNull } from './maps_access_runtime.js';
import { toCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';
import { VISUAL_KEYED_MAP_NAMES, isVisualKeyedMapName } from './visual_keyed_map_names.js';
import {
  patchVisualKeyedMapEntriesFromOwner,
  setCfgVisualKeyedMapFromOwner,
  toggleVisualKeyedMapEntryFromOwner,
} from './visual_keyed_map_writer_owner.js';
import {
  SIMPLE_WRITABLE_MAP_NAMES,
  isSimpleWritableMapName,
  patchSimpleWritableMapEntryFromOwner,
  replaceSimpleWritableMapFromOwner,
  toggleSimpleWritableBooleanMapEntryFromOwner,
} from './simple_writable_map_writer_owner.js';
import { normalizeKnownMapSnapshot } from './maps_access_normalizers.js';

export { SIMPLE_WRITABLE_MAP_NAMES, VISUAL_KEYED_MAP_NAMES, isSimpleWritableMapName, isVisualKeyedMapName };

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

type VisualKeyedWriterEntry = { readonly key: unknown; readonly value: unknown };

export function writeDoorTrimListForPart(
  App: unknown,
  partId: unknown,
  trimListOrNull: unknown,
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(
    App,
    'doorTrimMap',
    [{ key: partId, value: trimListOrNull }],
    meta
  );
}

export function patchDoorGrooveMapEntries(
  App: unknown,
  entries: readonly VisualKeyedWriterEntry[],
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(App, 'groovesMap', entries, meta);
}

export function patchDoorGrooveLinesCountEntries(
  App: unknown,
  entries: readonly VisualKeyedWriterEntry[],
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(App, 'grooveLinesCountMap', entries, meta);
}

export function replaceDoorGrooveLinesCountMap(
  App: unknown,
  nextMap: unknown,
  meta?: ActionMetaLike
): boolean {
  setCfgVisualKeyedMapFromOwner(
    App,
    'grooveLinesCountMap',
    normalizeKnownMapSnapshot('grooveLinesCountMap', nextMap),
    meta
  );
  return true;
}

export function replaceRoundedFrameSideShelvesMap(
  App: unknown,
  nextMap: unknown,
  meta?: ActionMetaLike
): boolean {
  return replaceSimpleWritableMapFromOwner(
    App,
    'roundedFrameSideShelvesMap',
    normalizeKnownMapSnapshot('roundedFrameSideShelvesMap', nextMap),
    meta
  );
}

export function replaceDoorSpecialMap(App: unknown, nextMap: unknown, meta?: ActionMetaLike): boolean {
  return replaceSimpleWritableMapFromOwner(App, 'doorSpecialMap', nextMap, meta);
}

export function replaceCurtainMap(App: unknown, nextMap: unknown, meta?: ActionMetaLike): boolean {
  return replaceSimpleWritableMapFromOwner(App, 'curtainMap', nextMap, meta);
}

export function writeIndividualColor(
  App: unknown,
  partId: unknown,
  value: unknown,
  meta?: ActionMetaLike
): boolean {
  return patchSimpleWritableMapEntryFromOwner(App, 'individualColors', partId, value, meta);
}

export function writeHandle(
  App: unknown,
  partId: unknown,
  handleType: Exclude<HandleValue, undefined>,
  meta?: ActionMetaLike
): boolean {
  const id = String(partId || '');
  if (!id) return false;
  const maps = readMapsBagOrNull(App);
  try {
    const setHandle = maps?.setHandle;
    if (typeof setHandle === 'function') {
      setHandle.call(maps, id, handleType, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeHandle.ownerRejected', err, App);
  }
  return patchSimpleWritableMapEntryFromOwner(App, 'handlesMap', id, handleType, meta);
}

export function writeHinge(
  App: unknown,
  doorId: unknown,
  hinge: Exclude<HingeValue, undefined | null>,
  meta?: ActionMetaLike
): boolean {
  const id = String(doorId || '');
  if (!id) return false;
  const maps = readMapsBagOrNull(App);

  try {
    const setHinge = maps?.setHinge;
    if (typeof setHinge === 'function') {
      setHinge.call(maps, id, hinge, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeHinge.ownerRejected', err, App);
  }

  return patchSimpleWritableMapEntryFromOwner(App, 'hingeMap', id, hinge, meta);
}

export function writeCurtainPreset(
  App: unknown,
  partId: unknown,
  preset: unknown,
  meta?: ActionMetaLike
): boolean {
  const value = preset === undefined || preset === null ? null : String(preset || 'none');
  return patchSimpleWritableMapEntryFromOwner(App, 'curtainMap', partId, value, meta);
}

export function writeDividerState(
  App: unknown,
  dividerKey: unknown,
  isOn: unknown,
  meta?: ActionMetaLike
): boolean {
  return patchSimpleWritableMapEntryFromOwner(App, 'drawerDividersMap', dividerKey, isOn ? true : null, meta);
}

export function writeSplit(App: unknown, doorId: unknown, isSplit: boolean, meta?: ActionMetaLike): boolean {
  const id0 = readMapKey(doorId);
  if (!id0) return false;
  const maps = readMapsBagOrNull(App);

  const canonicalKey = splitKey(id0);
  if (!canonicalKey) return false;

  try {
    const fn = maps?.setSplit;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isSplit, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplit.ownerRejected', err, App);
  }

  return patchVisualKeyedMapEntriesFromOwner(
    App,
    'splitDoorsMap',
    [{ key: canonicalKey, value: !!isSplit ? true : false }],
    meta
  );
}

export function writeSplitBottom(
  App: unknown,
  doorId: unknown,
  isOn: boolean,
  meta?: ActionMetaLike
): boolean {
  const id0 = readMapKey(doorId);
  if (!id0) return false;
  const maps = readMapsBagOrNull(App);

  const canonicalKey = splitBottomKey(id0);
  if (!canonicalKey) return false;

  try {
    const fn = maps?.setSplitBottom;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isOn, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplitBottom.ownerRejected', err, App);
  }

  return patchVisualKeyedMapEntriesFromOwner(
    App,
    'splitDoorsBottomMap',
    [{ key: canonicalKey, value: !!isOn ? true : null }],
    meta
  );
}

export function writeSplitPositionList(
  App: unknown,
  doorId: unknown,
  positions: readonly number[],
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = splitPosKey(doorId);
  if (!canonicalKey) return false;
  const nextList = Array.isArray(positions) ? positions.filter(Number.isFinite) : [];
  return patchVisualKeyedMapEntriesFromOwner(
    App,
    'splitDoorsMap',
    [{ key: canonicalKey, value: nextList.length ? nextList : null }],
    meta
  );
}

export function writeRemoved(
  App: unknown,
  partId: unknown,
  isRemoved: boolean,
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = toCanonicalRemovedDoorsMapKey(partId);
  if (!canonicalKey) return false;
  return patchVisualKeyedMapEntriesFromOwner(
    App,
    'removedDoorsMap',
    [{ key: canonicalKey, value: isRemoved ? true : null }],
    meta
  );
}

function toggleKeyInMap(
  App: unknown,
  mapName: 'drawerDividersMap',
  key: string,
  meta?: ActionMetaLike
): boolean {
  if (!key) return false;
  const maps = readMapsBagOrNull(App);

  try {
    const fn = maps?.toggleDivider;
    if (typeof fn === 'function') {
      fn.call(maps, key, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.toggleKeyInMap.ownerRejected', err, App);
  }

  return toggleSimpleWritableBooleanMapEntryFromOwner(App, mapName, key, meta);
}

function toggleCanonicalGrooveKeyInMap(
  App: unknown,
  mapName: 'groovesMap',
  key: unknown,
  meta?: ActionMetaLike
): boolean {
  return toggleVisualKeyedMapEntryFromOwner(App, mapName, key, meta);
}

export function toggleDivider(App: unknown, dividerKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleKeyInMap(App, 'drawerDividersMap', String(dividerKey || ''), meta);
}

export function toggleGrooveKey(App: unknown, grooveKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleCanonicalGrooveKeyInMap(App, 'groovesMap', grooveKey, meta);
}
