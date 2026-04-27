import { asRecord, readOwn } from './maps_access_shared.js';

function stripDoorSuffix(id0: string): string {
  return String(id0 || '').replace(/_(full|top|bot|mid)$/i, '');
}

function canonDoorBaseId(id0: unknown): string {
  let id = String(id0 || '').trim();
  if (!id) return '';
  if (id.indexOf('splitpos_') === 0) id = id.slice(9);
  if (id.indexOf('splitb_') === 0) id = id.slice(7);
  if (id.indexOf('split_') === 0) id = id.slice(6);
  return stripDoorSuffix(id);
}

function boolish(v: unknown): boolean | null {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return null;
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
  if (Object.prototype.hasOwnProperty.call(m, k)) return readOwn(m, k) !== false;
  return !!defaultOn;
}

export function isSplitExplicitInMap(map: unknown, doorId: unknown): boolean {
  const m = asRecord(map);
  if (!m) return false;
  const k = splitKey(doorId);
  if (!k) return false;
  if (!Object.prototype.hasOwnProperty.call(m, k)) return false;
  const b = boolish(readOwn(m, k));
  return b === true;
}

export function isSplitBottomEnabledInMap(map: unknown, doorId: unknown): boolean {
  const m = asRecord(map);
  if (!m) return false;
  const k = splitBottomKey(doorId);
  if (!k) return false;
  if (!Object.prototype.hasOwnProperty.call(m, k)) return false;
  const b = boolish(readOwn(m, k));
  return b === true;
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
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (Number.isFinite(n)) outNums.push(Math.max(0, Math.min(1, n)));
  };

  try {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) push(raw[i]);
    } else if (typeof raw === 'number') {
      push(raw);
    } else if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      if (s.startsWith('[')) {
        try {
          const j = JSON.parse(s);
          if (Array.isArray(j)) {
            for (let i = 0; i < j.length; i++) push(j[i]);
          } else {
            push(j);
          }
        } catch {
          const parts = s.split(',');
          for (let i = 0; i < parts.length; i++) push(parts[i]);
        }
      } else if (s.indexOf(',') >= 0) {
        const parts = s.split(',');
        for (let i = 0; i < parts.length; i++) push(parts[i]);
      } else {
        push(s);
      }
    }
  } catch {
    return [];
  }

  return outNums;
}
