import type { UnknownRecord } from '../../../types';

import { buildDoorVisualOwnerAliasKeys } from '../features/door_authoring/api.js';

export function deleteDoorVisualOwnerAliasEntries(
  map: Record<string, unknown> | null | undefined,
  partId: unknown
): void {
  if (!map) return;
  for (const key of buildDoorVisualOwnerAliasKeys(partId)) delete map[key];
}

export function deletePrefixedDoorVisualOwnerAliasEntries(args: {
  map: Record<string, unknown> | null | undefined;
  prefix: string;
  partId: unknown;
}): void {
  if (!args.map) return;
  const prefix = String(args.prefix || '');
  for (const key of buildDoorVisualOwnerAliasKeys(args.partId)) delete args.map[`${prefix}${key}`];
}

export function readPrefixedDoorVisualOwnerAliasValue(args: {
  map: Record<string, unknown> | null | undefined;
  prefix: string;
  partId: unknown;
}): unknown {
  if (!args.map) return undefined;
  const prefix = String(args.prefix || '');
  for (const key of buildDoorVisualOwnerAliasKeys(args.partId)) {
    const markerKey = `${prefix}${key}`;
    if (Object.prototype.hasOwnProperty.call(args.map, markerKey)) return args.map[markerKey];
  }
  return undefined;
}

export function cloneUnknownRecordMap(value: unknown): UnknownRecord {
  const out: UnknownRecord = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, raw] of Object.entries(value)) out[key] = raw;
  return out;
}
