import { readMirrorLayoutList } from './mirror_contracts.js';

import type { MirrorLayoutList } from '../../../../../types';
import {
  buildDoorVisualLookupKeys,
  hasDoorVisualSegmentSuffix,
  isSegmentedDoorBaseId,
  resolveDoorSplitAuthoringBaseKey,
  resolveDoorVisualSegmentIdentity,
  stripDoorVisualSurfaceSuffix,
} from '../../../../shared/door_visual_key_contracts_shared.js';

export type DoorVisualMapEntry = { key: string; value: unknown };
export type { DoorVisualSegmentIdentity } from '../../../../shared/door_visual_key_contracts_shared.js';
export {
  buildDoorVisualLookupKeys,
  resolveDoorSplitAuthoringBaseKey,
  resolveDoorVisualSegmentIdentity,
  stripDoorVisualSurfaceSuffix,
};

function hasOwn(map: Record<string, unknown> | undefined | null, key: string): boolean {
  return !!map && !!key && Object.prototype.hasOwnProperty.call(map, key);
}

function normalizePartKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function isDoorStyleSegmentedBaseId(partId: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(partId) ||
    /^(?:lower_)?corner_door_\d+$/.test(partId) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
  );
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

export function readDoorVisualSegmentBasePartId(partId: string): string {
  return resolveDoorVisualSegmentIdentity(partId).basePartId;
}

export function isDoorVisualSegmentPartId(partId: string): boolean {
  return resolveDoorVisualSegmentIdentity(partId).isSegment;
}

export function buildDoorVisualOwnerAliasKeys(partId: unknown): string[] {
  const key = normalizePartKey(partId);
  if (!key) return [];
  const out: string[] = [key];
  const push = (value: string) => {
    if (value && !out.includes(value)) out.push(value);
  };

  if (key.endsWith('_full')) push(key.slice(0, -5));
  else if (isSegmentedDoorBaseId(key)) push(`${key}_full`);

  return out;
}

export function toDoorStyleOverrideMapKey(partId: unknown): string {
  const pid = normalizePartKey(partId);
  if (!pid) return '';
  if (hasDoorVisualSegmentSuffix(pid)) return pid;
  if (isDoorStyleSegmentedBaseId(pid)) return `${pid}_full`;
  return pid;
}

export function resolveDoorStylePaintTargetKey(args: {
  foundPartId: unknown;
  effectiveDoorId?: unknown;
  foundDrawerId?: unknown;
  activeStack: 'top' | 'bottom';
  isDoorOrDrawerLikePartId: (partId: unknown) => boolean;
  scopePartKeyForStack: (partId: string, stack: 'top' | 'bottom') => string;
}): string {
  const foundPartId =
    typeof args.foundPartId === 'string' ? args.foundPartId : String(args.foundPartId ?? '');
  const effectiveDoorId =
    typeof args.effectiveDoorId === 'string' && args.effectiveDoorId ? args.effectiveDoorId : '';
  const foundDrawerId =
    typeof args.foundDrawerId === 'string' && args.foundDrawerId ? args.foundDrawerId : '';
  const rawTarget =
    effectiveDoorId || foundDrawerId || (args.isDoorOrDrawerLikePartId(foundPartId) ? foundPartId : '');
  const scopedTarget = rawTarget ? args.scopePartKeyForStack(rawTarget, args.activeStack) : '';
  return toDoorStyleOverrideMapKey(scopedTarget);
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
