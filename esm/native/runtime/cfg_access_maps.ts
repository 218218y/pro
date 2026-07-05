import type { ActionMetaLike, KnownMapName, MapsByName, UnknownRecord } from '../../../types';
import {
  cfgMapRecord,
  getConfigNamespace,
  readCurtainMapSnapshot,
  readDoorSpecialMapSnapshot,
  readHandlesMapSnapshot,
  readHingeMapSnapshot,
  readIndividualColorsMapSnapshot,
  readMapRecord,
  readMirrorLayoutMapSnapshot,
} from './cfg_access_shared.js';
import { commitConfigMapOwnerPatchWithReplaceKeys } from './cfg_access_map_owner.js';
import { normalizeDoorStyleMap } from './maps_access_normalizers_shared.js';
import { setCfgVisualKeyedMapFromOwner } from './visual_keyed_map_writer_owner.js';

type CfgMap = {
  <K extends KnownMapName>(App: unknown, mapName: K): MapsByName[K];
  (App: unknown, mapName: string): UnknownRecord;
};

export const cfgMap: CfgMap = (App: unknown, mapName: unknown): UnknownRecord => {
  const name = String(mapName || '');
  return cfgMapRecord(App, name);
};

function setConfigMapFromOwner(
  App: unknown,
  mapName: unknown,
  nextMap: unknown,
  meta?: ActionMetaLike
): UnknownRecord {
  const name = String(mapName || '');
  const next = readMapRecord(nextMap);
  if (!name) return next;

  commitConfigMapOwnerPatchWithReplaceKeys(App, { [name]: next }, { [name]: true }, meta);
  return next;
}

export function setCfgHingeMap(App: unknown, next: unknown, meta?: ActionMetaLike): MapsByName['hingeMap'] {
  const cfgNs = getConfigNamespace(App);
  const nextMap = readHingeMapSnapshot(next);
  if (typeof cfgNs?.setHingeMap === 'function') {
    const out = cfgNs.setHingeMap(nextMap, meta);
    return readHingeMapSnapshot(out);
  }
  return readHingeMapSnapshot(setConfigMapFromOwner(App, 'hingeMap', nextMap, meta));
}

export function setCfgHandlesMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['handlesMap'] {
  return readHandlesMapSnapshot(setConfigMapFromOwner(App, 'handlesMap', readHandlesMapSnapshot(next), meta));
}

export function setCfgIndividualColors(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['individualColors'] {
  return readIndividualColorsMapSnapshot(
    setConfigMapFromOwner(App, 'individualColors', readIndividualColorsMapSnapshot(next), meta)
  );
}

export function setCfgCurtainMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['curtainMap'] {
  return readCurtainMapSnapshot(setConfigMapFromOwner(App, 'curtainMap', readCurtainMapSnapshot(next), meta));
}

export function setCfgDoorSpecialMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['doorSpecialMap'] {
  return readDoorSpecialMapSnapshot(
    setConfigMapFromOwner(App, 'doorSpecialMap', readDoorSpecialMapSnapshot(next), meta)
  );
}

export function setCfgDoorStyleMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['doorStyleMap'] {
  return normalizeDoorStyleMap(
    setCfgVisualKeyedMapFromOwner(App, 'doorStyleMap', normalizeDoorStyleMap(next), meta)
  );
}

export function setCfgMirrorLayoutMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['mirrorLayoutMap'] {
  return readMirrorLayoutMapSnapshot(
    setCfgVisualKeyedMapFromOwner(App, 'mirrorLayoutMap', readMirrorLayoutMapSnapshot(next), meta)
  );
}
