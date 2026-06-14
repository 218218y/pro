import { readMirrorLayoutList } from './mirror_layout.js';

import type { MirrorLayoutList } from '../../../types';

export type DoorVisualMapEntry = { key: string; value: unknown };

function hasOwn(map: Record<string, unknown> | undefined | null, key: string): boolean {
  return !!map && !!key && Object.prototype.hasOwnProperty.call(map, key);
}

function isSegmentedDoorBaseId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
  return false;
}

/**
 * Ordered lookup keys for door/drawer visual maps.
 *
 * Direct segment keys always win. Split segments then inherit from their *_full
 * owner so a full-door paint/special/style remains stable after the user cuts
 * the door, while a later segment-specific click can still override it.
 */
export function buildDoorVisualLookupKeys(partId: string): string[] {
  if (typeof partId !== 'string' || !partId) return [];
  const out: string[] = [partId];
  const push = (value: string) => {
    if (!value || out.includes(value)) return;
    out.push(value);
  };

  if (/(?:_(?:top|bot|mid\d*))$/i.test(partId)) {
    const base = partId.replace(/_(top|bot|mid\d*)$/i, '');
    push(`${base}_full`);
    push(base);
  }
  if (partId.endsWith('_full')) {
    push(partId.slice(0, -5));
  }
  if (isSegmentedDoorBaseId(partId)) {
    push(`${partId}_full`);
  }

  return out;
}

export function readDoorVisualMapEntry(
  map: Record<string, unknown> | undefined | null,
  partId: string
): DoorVisualMapEntry | null {
  const keys = buildDoorVisualLookupKeys(partId);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (hasOwn(map, key)) return { key, value: map![key] };
  }
  return null;
}

export function readDoorVisualMapValue(
  map: Record<string, unknown> | undefined | null,
  partId: string
): unknown {
  const entry = readDoorVisualMapEntry(map, partId);
  return entry ? entry.value : null;
}

export function readDoorVisualTextValue(
  map: Record<string, unknown> | undefined | null,
  partId: string
): string | null {
  const value = readDoorVisualMapValue(map, partId);
  return typeof value === 'string' && value ? String(value) : null;
}

export function readDoorVisualMirrorLayout(
  map: Record<string, unknown> | undefined | null,
  partId: string
): MirrorLayoutList | null {
  const value = readDoorVisualMapValue(map, partId);
  const layouts = readMirrorLayoutList(value);
  return layouts.length ? layouts : null;
}
