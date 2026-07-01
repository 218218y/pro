import { normalizeKnownMapSnapshot, isSplitBottomEnabledInMap } from '../runtime/maps_access.js';
import { readConfigState, type ValueRecord } from './handles_shared.js';
import { listCanonicalRemovedDoorLookupKeys } from '../../shared/removed_doors_map_keys_shared.js';

import type { ConfigStateLike } from '../../../types';

export type HandlesConfigSnapshot = {
  cfg: ConfigStateLike;
  handlesMap: ValueRecord;
  removedDoorsMap: ValueRecord;
  splitDoorsBottomMap: ValueRecord;
};

function normalizeHandlesMap(value: unknown): ValueRecord {
  return normalizeKnownMapSnapshot('handlesMap', value) as ValueRecord;
}

function normalizeRemovedDoorsMap(value: unknown): ValueRecord {
  return normalizeKnownMapSnapshot('removedDoorsMap', value) as ValueRecord;
}

function normalizeSplitDoorsBottomMap(value: unknown): ValueRecord {
  return normalizeKnownMapSnapshot('splitDoorsBottomMap', value) as ValueRecord;
}

export function captureHandlesConfigSnapshot(cfgSnapshot: unknown): HandlesConfigSnapshot {
  const cfg = readConfigState(cfgSnapshot);
  if (!cfg) throw new TypeError('[handles_config_snapshot] cfgSnapshot is required');

  return {
    cfg,
    handlesMap: normalizeHandlesMap(cfg.handlesMap),
    removedDoorsMap: normalizeRemovedDoorsMap(cfg.removedDoorsMap),
    splitDoorsBottomMap: normalizeSplitDoorsBottomMap(cfg.splitDoorsBottomMap),
  };
}

export function createHandlesDoorRemovedReader(removedDoorsMap: ValueRecord): (partId: unknown) => boolean {
  return (partId: unknown): boolean => {
    const keys = listCanonicalRemovedDoorLookupKeys(partId);
    for (let i = 0; i < keys.length; i += 1) {
      if (removedDoorsMap[keys[i]] === true) return true;
    }
    return false;
  };
}

export function isBottomSplitBotPartFromSnapshot(splitDoorsBottomMap: ValueRecord, id: unknown): boolean {
  const sid = id == null ? '' : String(id);
  if (!sid || !sid.endsWith('_bot')) return false;
  const baseId = sid.replace(/_bot$/, '');
  return !!baseId && isSplitBottomEnabledInMap(splitDoorsBottomMap, baseId);
}
