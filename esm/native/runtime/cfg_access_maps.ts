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
  readPatchMapInput,
  type ConfigMapPatchFn,
} from './cfg_access_shared.js';
import { applyConfigPatchReplaceKeys } from './cfg_access_scalars.js';

type CfgMap = {
  <K extends KnownMapName>(App: unknown, mapName: K): MapsByName[K];
  (App: unknown, mapName: string): UnknownRecord;
};

export const cfgMap: CfgMap = (App: unknown, mapName: unknown): UnknownRecord => {
  const name = String(mapName || '');
  return cfgMapRecord(App, name);
};

type CfgSetMap = {
  <K extends KnownMapName>(
    App: unknown,
    mapName: K,
    nextMap: MapsByName[K],
    meta?: ActionMetaLike
  ): MapsByName[K];
  (App: unknown, mapName: string, nextMap: UnknownRecord, meta?: ActionMetaLike): UnknownRecord;
};

export const cfgSetMap: CfgSetMap = (
  App: unknown,
  mapName: unknown,
  nextMap: unknown,
  meta?: ActionMetaLike
): UnknownRecord => {
  const name = String(mapName || '');
  const next = readMapRecord(nextMap);
  if (!name) return next;

  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.setMap === 'function') {
    cfgNs.setMap(name, next, meta);
    return next;
  }

  applyConfigPatchReplaceKeys(App, { [name]: next }, { [name]: true }, meta);
  return next;
};

type PatchConfigMap = {
  <K extends KnownMapName>(
    App: unknown,
    mapName: K,
    patchOrFn: Partial<MapsByName[K]> | ConfigMapPatchFn<K>,
    meta?: ActionMetaLike
  ): MapsByName[K];
  (
    App: unknown,
    mapName: string,
    patchOrFn: UnknownRecord | ((nextDraft: UnknownRecord, curVal: UnknownRecord) => unknown),
    meta?: ActionMetaLike
  ): UnknownRecord;
};

export const patchConfigMap: PatchConfigMap = (
  App: unknown,
  mapName: unknown,
  patchOrFn: unknown,
  meta?: ActionMetaLike
): UnknownRecord => {
  const name = String(mapName || '');
  if (!name) return {};

  const normalizedPatchOrFn = readPatchMapInput(patchOrFn);
  if (!normalizedPatchOrFn) return cfgMapRecord(App, name);

  const cfgNs = getConfigNamespace(App);
  if (typeof cfgNs?.patchMap === 'function') {
    const out = cfgNs.patchMap(name, normalizedPatchOrFn, meta);
    return readMapRecord(out);
  }

  const cur = cfgMapRecord(App, name);
  const next: UnknownRecord = { ...cur };
  const patchValue =
    typeof normalizedPatchOrFn === 'function' ? normalizedPatchOrFn(next, cur) : normalizedPatchOrFn;

  const patch = readMapRecord(patchValue);
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value === undefined || value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  cfgSetMap(App, name, next, meta);
  return next;
};

export function setCfgHingeMap(App: unknown, next: unknown, meta?: ActionMetaLike): MapsByName['hingeMap'] {
  const cfgNs = getConfigNamespace(App);
  const nextMap = readHingeMapSnapshot(next);
  if (typeof cfgNs?.setHingeMap === 'function') {
    const out = cfgNs.setHingeMap(nextMap, meta);
    return readHingeMapSnapshot(out);
  }
  return readHingeMapSnapshot(cfgSetMap(App, 'hingeMap', nextMap, meta));
}

export function setCfgHandlesMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['handlesMap'] {
  return readHandlesMapSnapshot(cfgSetMap(App, 'handlesMap', readHandlesMapSnapshot(next), meta));
}

export function setCfgIndividualColors(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['individualColors'] {
  return readIndividualColorsMapSnapshot(
    cfgSetMap(App, 'individualColors', readIndividualColorsMapSnapshot(next), meta)
  );
}

export function setCfgCurtainMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['curtainMap'] {
  return readCurtainMapSnapshot(cfgSetMap(App, 'curtainMap', readCurtainMapSnapshot(next), meta));
}

export function setCfgDoorSpecialMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['doorSpecialMap'] {
  return readDoorSpecialMapSnapshot(cfgSetMap(App, 'doorSpecialMap', readDoorSpecialMapSnapshot(next), meta));
}

export function setCfgMirrorLayoutMap(
  App: unknown,
  next: unknown,
  meta?: ActionMetaLike
): MapsByName['mirrorLayoutMap'] {
  return readMirrorLayoutMapSnapshot(
    cfgSetMap(App, 'mirrorLayoutMap', readMirrorLayoutMapSnapshot(next), meta)
  );
}
