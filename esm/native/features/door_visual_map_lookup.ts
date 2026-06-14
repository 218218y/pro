import { readMirrorLayoutList } from './mirror_layout_contracts.js';

import type { MirrorLayoutList } from '../../../types';

export type DoorVisualMapEntry = { key: string; value: unknown };

const SEGMENTED_DOOR_ANY_SUFFIX_RE = /_(?:full|top|bot|mid\d*)$/i;
const SEGMENTED_DOOR_PART_SUFFIX_RE = /_(?:top|bot|mid\d*)$/i;
const DOOR_VISUAL_SURFACE_SUFFIX_RE = /_(?:accent|groove)_(?:top|bottom|left|right)$/i;

function hasOwn(map: Record<string, unknown> | undefined | null, key: string): boolean {
  return !!map && !!key && Object.prototype.hasOwnProperty.call(map, key);
}

function isSegmentedDoorBaseId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(partId) && !SEGMENTED_DOOR_ANY_SUFFIX_RE.test(partId))
    return true;
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

export function stripDoorVisualSurfaceSuffix(partId: string): string {
  return String(partId || '').replace(DOOR_VISUAL_SURFACE_SUFFIX_RE, '');
}

export function readDoorVisualSegmentBasePartId(partId: string): string {
  return stripDoorVisualSurfaceSuffix(String(partId || '')).replace(SEGMENTED_DOOR_ANY_SUFFIX_RE, '');
}

export function isDoorVisualSegmentPartId(partId: string): boolean {
  return SEGMENTED_DOOR_PART_SUFFIX_RE.test(stripDoorVisualSurfaceSuffix(String(partId || '')));
}

export function readDoorVisualPrefixedOwnMapEntry(args: {
  map: Record<string, unknown> | undefined | null;
  partId: string;
  prefix?: string;
}): DoorVisualMapEntry | null {
  const key = stripDoorVisualSurfaceSuffix(String(args.partId || ''));
  const prefix = String(args.prefix || '');
  if (!args.map || !key) return null;
  const prefixedKey = `${prefix}${key}`;
  if (prefix && hasOwn(args.map, prefixedKey)) return { key: prefixedKey, value: args.map[prefixedKey] };
  if (hasOwn(args.map, key)) return { key, value: args.map[key] };
  return null;
}

export function readDoorVisualPrefixedMapEntry(args: {
  map: Record<string, unknown> | undefined | null;
  partId: string;
  prefix?: string;
}): DoorVisualMapEntry | null {
  const key = stripDoorVisualSurfaceSuffix(String(args.partId || ''));
  if (!args.map || !key) return null;
  const keys = buildDoorVisualLookupKeys(key);
  for (let i = 0; i < keys.length; i += 1) {
    const entry = readDoorVisualPrefixedOwnMapEntry({
      map: args.map,
      partId: keys[i],
      prefix: args.prefix,
    });
    if (entry) return entry;
  }
  return null;
}

export function hasAnyDoorVisualSegmentMapEntry(args: {
  map: Record<string, unknown> | undefined | null;
  basePartId: string;
  prefix?: string;
}): boolean {
  const { map } = args;
  const basePartId = String(args.basePartId || '');
  const prefix = String(args.prefix || '');
  if (!map || !basePartId) return false;
  const prefixed = `${prefix}${basePartId}_`;
  const raw = `${basePartId}_`;
  const keys = Object.keys(map);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!key || map[key] == null) continue;
    const segmentPartId =
      prefix && key.startsWith(prefixed) ? key.slice(prefix.length) : key.startsWith(raw) ? key : '';
    if (segmentPartId && isDoorVisualSegmentPartId(segmentPartId)) return true;
  }
  return false;
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
