import {
  buildDoorVisualLookupKeys,
  stripDoorVisualSurfaceSuffix,
} from './door_visual_key_contracts_shared.js';

const DOOR_GROOVE_MAP_PREFIX = 'groove_';
const DOOR_GROOVE_DECORATION_SUFFIX_RE = /_(?:trim|trim_preview)(?:_[a-z0-9]+)?$/i;

function readDoorGrooveKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function stripDoorGrooveMapPrefix(value: string): string {
  return value.startsWith(DOOR_GROOVE_MAP_PREFIX) ? value.slice(DOOR_GROOVE_MAP_PREFIX.length) : value;
}

export function stripDoorGrooveDecorationSuffix(partId: unknown): string {
  let key = stripDoorGrooveMapPrefix(readDoorGrooveKey(partId));
  for (let index = 0; index < 4; index += 1) {
    const next = stripDoorVisualSurfaceSuffix(key).replace(DOOR_GROOVE_DECORATION_SUFFIX_RE, '');
    if (next === key) return key;
    key = next;
  }
  return key;
}

export function toCanonicalDoorGrooveTargetKey(input: unknown): string {
  return stripDoorGrooveDecorationSuffix(input);
}

export function toCanonicalGroovesMapKey(input: unknown): string {
  const targetKey = toCanonicalDoorGrooveTargetKey(input);
  return targetKey ? `${DOOR_GROOVE_MAP_PREFIX}${targetKey}` : '';
}

export function toCanonicalGrooveLinesCountMapKey(input: unknown): string {
  return toCanonicalDoorGrooveTargetKey(input);
}

export function isCanonicalGroovesMapKey(input: unknown): input is string {
  const key = readDoorGrooveKey(input);
  return !!key && key === toCanonicalGroovesMapKey(key);
}

export function isCanonicalGrooveLinesCountMapKey(input: unknown): input is string {
  const key = readDoorGrooveKey(input);
  return !!key && key === toCanonicalGrooveLinesCountMapKey(key);
}

export function listDoorGrooveTargetLookupKeys(input: unknown): string[] {
  const targetKey = toCanonicalDoorGrooveTargetKey(input);
  if (!targetKey) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    const key = toCanonicalDoorGrooveTargetKey(value);
    if (!key || out.includes(key)) return;
    out.push(key);
  };

  push(targetKey);
  for (const key of buildDoorVisualLookupKeys(targetKey)) push(key);
  return out;
}
