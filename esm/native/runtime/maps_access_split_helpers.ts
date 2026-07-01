import { resolveDoorSplitAuthoringBaseKey } from '../../shared/door_visual_key_contracts_shared.js';
import { asRecord, readOwn } from './maps_access_shared.js';

function canonDoorBaseId(id0: unknown): string {
  let id = String(id0 || '').trim();
  if (!id) return '';
  if (id.indexOf('splitpos_') === 0) id = id.slice(9);
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

export function readSplitPosListFromMap(map: unknown, doorId: unknown): number[] {
  const m = asRecord(map);
  if (!m) return [];
  const k = splitPosKey(doorId);
  if (!k) return [];
  if (!Object.prototype.hasOwnProperty.call(m, k)) return [];

  const raw = readOwn(m, k);
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
