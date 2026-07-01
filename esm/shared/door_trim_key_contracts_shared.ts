import {
  resolveDoorVisualSegmentIdentity,
  stripDoorVisualSurfaceSuffix,
  toDoorStyleOverrideMapKey,
} from './door_visual_key_contracts_shared.js';

const DOOR_TRIM_DECORATION_SUFFIX_RE = /_(?:trim|trim_preview)(?:_[a-z0-9]+)?$/i;

function readPartKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function readRawPartKey(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

export function stripDoorTrimTargetDecorationSuffix(partId: unknown): string {
  let key = readPartKey(partId);
  for (let index = 0; index < 4; index += 1) {
    const next = stripDoorVisualSurfaceSuffix(key).replace(DOOR_TRIM_DECORATION_SUFFIX_RE, '');
    if (next === key) return key;
    key = next;
  }
  return key;
}

export function toCanonicalDoorTrimTargetKey(partId: unknown): string {
  const key = stripDoorTrimTargetDecorationSuffix(partId);
  return key ? toDoorStyleOverrideMapKey(key) : '';
}

export function isCanonicalDoorTrimTargetKey(partId: unknown): partId is string {
  const raw = readRawPartKey(partId);
  const key = readPartKey(partId);
  return !!key && raw === key && key === toCanonicalDoorTrimTargetKey(key);
}

export function listDoorTrimTargetLookupKeys(partId: unknown): string[] {
  const key = toCanonicalDoorTrimTargetKey(partId);
  if (!key) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    const next = toCanonicalDoorTrimTargetKey(value);
    if (!next || out.includes(next)) return;
    out.push(next);
  };
  push(key);
  const identity = resolveDoorVisualSegmentIdentity(key);
  if (identity.isSegment) identity.lookupKeys.forEach(push);
  return out;
}
