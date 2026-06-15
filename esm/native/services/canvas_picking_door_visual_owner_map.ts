import type { UnknownRecord } from '../../../types';

const SEGMENTED_DOOR_ANY_SUFFIX_RE = /_(?:full|top|bot|mid\d*)$/i;

function normalizePartKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function isSegmentedDoorBaseId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(partId) && !SEGMENTED_DOOR_ANY_SUFFIX_RE.test(partId)) {
    return true;
  }
  return false;
}

export function buildDoorVisualOwnerAliasKeys(partId: unknown): string[] {
  const key = normalizePartKey(partId);
  if (!key) return [];
  const out = [key];
  const push = (value: string) => {
    if (value && !out.includes(value)) out.push(value);
  };

  if (key.endsWith('_full')) push(key.slice(0, -5));
  else if (isSegmentedDoorBaseId(key)) push(`${key}_full`);

  return out;
}

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
