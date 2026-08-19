import { resolveDoorSplitAuthoringBaseKey } from '../../shared/door_visual_key_contracts_shared.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { asRecord, readOwn } from './maps_access_shared.js';

function canonDoorBaseId(id0: unknown): string {
  let id = formatIdentityValue(readIdentityValue(id0)).trim();
  if (!id) return '';
  if (id.indexOf('splitstdpos_') === 0) id = id.slice('splitstdpos_'.length);
  if (id.indexOf('splitpos_') === 0) id = id.slice('splitpos_'.length);
  if (id.indexOf('splitb_') === 0) id = id.slice(7);
  if (id.indexOf('split_') === 0) id = id.slice(6);
  return resolveDoorSplitAuthoringBaseKey(id);
}

export function splitKey(doorId: unknown): string {
  const base = canonDoorBaseId(doorId);
  return base ? 'split_' + base : '';
}

export function splitBottomKey(doorId: unknown): string {
  const base = canonDoorBaseId(doorId);
  return base ? 'splitb_' + base : '';
}

export function splitPosKey(doorId: unknown): string {
  const base = canonDoorBaseId(doorId);
  return base ? 'splitpos_' + base : '';
}

export function splitStandardPosKey(doorId: unknown): string {
  const base = canonDoorBaseId(doorId);
  return base ? 'splitstdpos_' + base : '';
}

export function isSplitEnabledInMap(map: unknown, doorId: unknown, defaultOn = true): boolean {
  const m = asRecord(map);
  if (!m) return !!defaultOn;
  const k = splitKey(doorId);
  if (!k) return !!defaultOn;
  if (Object.prototype.hasOwnProperty.call(m, k)) {
    const value = readOwn(m, k);
    if (value === true) return true;
    if (value === false) return false;
  }
  return !!defaultOn;
}

export function isSplitExplicitInMap(map: unknown, doorId: unknown): boolean {
  const m = asRecord(map);
  if (!m) return false;
  const k = splitKey(doorId);
  if (!k) return false;
  if (!Object.prototype.hasOwnProperty.call(m, k)) return false;
  return readOwn(m, k) === true;
}

export function isSplitBottomEnabledInMap(map: unknown, doorId: unknown): boolean {
  const m = asRecord(map);
  if (!m) return false;
  const k = splitBottomKey(doorId);
  if (!k) return false;
  if (!Object.prototype.hasOwnProperty.call(m, k)) return false;
  return readOwn(m, k) === true;
}

function readSplitPositionListByKey(map: unknown, key: string): number[] {
  const m = asRecord(map);
  if (!m || !key || !Object.prototype.hasOwnProperty.call(m, key)) return [];

  const raw = readOwn(m, key);
  const outNums: number[] = [];
  const push = (v: unknown) => {
    const n = typeof v === 'number' ? v : NaN;
    if (Number.isFinite(n)) outNums.push(Math.max(0, Math.min(1, n)));
  };

  try {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) push(raw[i]);
    }
  } catch {
    return [];
  }

  return outNums;
}

export function readSplitPosListFromMap(map: unknown, doorId: unknown): number[] {
  return readSplitPositionListByKey(map, splitPosKey(doorId));
}

export function readSplitStandardPosListFromMap(map: unknown, doorId: unknown): number[] {
  return readSplitPositionListByKey(map, splitStandardPosKey(doorId));
}
