import type { SplitDoorsBottomMap, SplitDoorsMap } from '../../../types/index.js';

import { asMapRecord } from './project_payload_shared.js';

function stripDoorSegmentSuffix(id0: string): string {
  return String(id0 || '').replace(/_(full|top|bot|mid)$/i, '');
}

function isDoorIdLike(key: string): boolean {
  return (
    /^(?:lower_)?d\d+(?:_(?:full|top|bot|mid))?$/i.test(key) ||
    /^(?:lower_)?corner_door_\d+(?:_(?:full|top|bot|mid))?$/i.test(key) ||
    /^(?:lower_)?corner_pent_door_\d+(?:_(?:full|top|bot|mid))?$/i.test(key) ||
    /^corner_pent_door_\d+(?:_(?:full|top|bot|mid))?$/i.test(key)
  );
}

function readBoolish(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === 'string') {
    const norm = value.trim().toLowerCase();
    if (norm === 'true' || norm === '1') return true;
    if (norm === 'false' || norm === '0') return false;
  }
  return null;
}

function parseSplitPositionList(raw: unknown): number[] {
  const out: number[] = [];
  const push = (value: unknown) => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(n)) return;
    out.push(Math.max(0, Math.min(1, n)));
  };

  try {
    if (Array.isArray(raw)) {
      for (const entry of raw) push(entry);
    } else if (typeof raw === 'number') {
      push(raw);
    } else if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return out;
      if (s.startsWith('[')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            for (const entry of parsed) push(entry);
          } else {
            push(parsed);
          }
        } catch {
          push(s);
        }
      } else if (s.includes(',')) {
        for (const part of s.split(',')) push(part);
      } else {
        push(s);
      }
    }
  } catch {
    // ignore malformed legacy payloads
  }

  out.sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const value of out) {
    if (!deduped.length || Math.abs(deduped[deduped.length - 1] - value) > 1e-6) deduped.push(value);
  }
  return deduped;
}

export function normalizeSplitDoorsMap(map: unknown): SplitDoorsMap {
  if (!map || typeof map !== 'object') return {};
  const src = asMapRecord(map);
  const out: SplitDoorsMap = {};
  const hasOwn = Object.prototype.hasOwnProperty;

  const assignPassthrough = (key: string, value: unknown): void => {
    if (value == null) {
      out[key] = null;
      return;
    }
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      out[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      const list = value.filter(
        (entry): entry is number => typeof entry === 'number' && Number.isFinite(entry)
      );
      if (list.length) out[key] = list;
    }
  };

  const mergeSplitToggle = (normalizedKey: string, value: unknown) => {
    const next = readBoolish(value);
    if (next == null) return;
    if (hasOwn.call(out, normalizedKey)) {
      if (out[normalizedKey] === false || next === false) out[normalizedKey] = false;
      else out[normalizedKey] = true;
      return;
    }
    out[normalizedKey] = next;
  };

  for (const rawKey in src) {
    if (!hasOwn.call(src, rawKey)) continue;
    const value = src[rawKey];
    const key = String(rawKey || '');

    if (key.startsWith('split_')) {
      mergeSplitToggle('split_' + stripDoorSegmentSuffix(key.slice(6)), value);
      continue;
    }

    if (!key.startsWith('split') && isDoorIdLike(key)) {
      mergeSplitToggle('split_' + stripDoorSegmentSuffix(key), value);
      continue;
    }

    if (key.startsWith('splitpos_') || /^splitPos_/i.test(key)) {
      const normalizedKey = key.replace(/^splitPos_/i, 'splitpos_');
      const list = parseSplitPositionList(value);
      if (list.length) out['splitpos_' + stripDoorSegmentSuffix(normalizedKey.slice(9))] = list;
      continue;
    }

    assignPassthrough(rawKey, value);
  }

  return out;
}

export function normalizeSplitDoorsBottomMap(map: unknown): SplitDoorsBottomMap {
  if (!map || typeof map !== 'object') return {};
  const src = asMapRecord(map);
  const out: SplitDoorsBottomMap = {};
  const hasOwn = Object.prototype.hasOwnProperty;

  for (const rawKey in src) {
    if (!hasOwn.call(src, rawKey)) continue;
    const value = src[rawKey];
    const key = String(rawKey || '');

    if (key.startsWith('splitb_') || /^splitBottom_/i.test(key)) {
      const prefixed = key.replace(/^splitBottom_/i, 'splitb_');
      if (prefixed.startsWith('splitb_')) {
        out['splitb_' + stripDoorSegmentSuffix(prefixed.slice(7))] = !!readBoolish(value);
      } else {
        out[rawKey] = !!readBoolish(value);
      }
      continue;
    }

    if (!key.startsWith('split') && isDoorIdLike(key)) {
      const next = readBoolish(value);
      if (next != null) {
        out['splitb_' + stripDoorSegmentSuffix(key)] = next;
        continue;
      }
    }

    if (
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string' ||
      value == null
    ) {
      const next = readBoolish(value);
      out[rawKey] = next == null ? null : next;
    }
  }

  return out;
}
