import { normalizeKnownMapSnapshot, isSplitBottomEnabledInMap } from '../runtime/maps_access.js';
import { readConfigState, type ValueRecord } from './handles_shared.js';

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

function canonicalDoorRemovalId(partId: string): string {
  let id = String(partId || '');
  if (!id) return '';
  if (
    !/(?:_(?:full|top|bot|mid))$/i.test(id) &&
    (/^(?:lower_)?d\d+$/.test(id) ||
      /^(?:lower_)?corner_door_\d+$/.test(id) ||
      /^(?:lower_)?corner_pent_door_\d+$/.test(id))
  ) {
    id += '_full';
  }
  return id;
}

export function createHandlesDoorRemovedReader(removedDoorsMap: ValueRecord): (partId: unknown) => boolean {
  return (partId: unknown): boolean => {
    const raw = String(partId || '');
    const id = canonicalDoorRemovalId(raw);
    if (!id) return false;
    if (removedDoorsMap[`removed_${id}`] === true) return true;
    if (id.endsWith('_top') || id.endsWith('_mid') || id.endsWith('_bot')) {
      const full = id.replace(/_(top|mid|bot)$/i, '_full');
      return removedDoorsMap[`removed_${full}`] === true;
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
