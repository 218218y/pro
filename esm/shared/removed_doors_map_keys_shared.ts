import {
  resolveDoorVisualSegmentIdentity,
  stripDoorVisualSurfaceSuffix,
  toDoorStyleOverrideMapKey,
} from './door_visual_key_contracts_shared.js';

export type RemovedDoorPartIdentity = {
  partId: string;
  mapKey: string;
  basePartId: string;
  fullPartId: string;
  isDoorLike: boolean;
  isSegment: boolean;
  isFull: boolean;
  lookupKeys: string[];
};

function readRemovedDoorKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function stripRemovedDoorMapPrefix(value: unknown): string {
  const raw = readRemovedDoorKey(value);
  return raw.startsWith('removed_') ? raw.slice('removed_'.length) : raw;
}

export function hasRemovedDoorSegmentSuffix(value: string): boolean {
  return /_(?:full|top|bot|mid\d*)$/i.test(value);
}

export function isDoorLikeRemovedPartId(value: string): boolean {
  const partId = readRemovedDoorKey(value);
  if (!partId) return false;
  if (/^(?:lower_)?d\d+(?:_|$)/.test(partId) && !partId.includes('_draw_')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(partId)) return true;
  if (partId.startsWith('sliding') || partId.startsWith('slide')) return true;
  if (partId.startsWith('lower_sliding') || partId.startsWith('lower_slide')) return true;
  if (
    partId.startsWith('corner_door') ||
    partId.startsWith('corner_pent_door') ||
    partId.startsWith('lower_corner_door') ||
    partId.startsWith('lower_corner_pent_door')
  )
    return true;
  return false;
}

export function isSegmentedRemovedDoorBaseId(value: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(value) ||
    /^(?:lower_)?corner_door_\d+$/.test(value) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(value)
  );
}

export function toCanonicalRemovedDoorPartId(partId: unknown): string {
  const clean = stripRemovedDoorMapPrefix(partId);
  if (!clean || clean.startsWith('removed_')) return '';
  const doorVisualKey = stripDoorVisualSurfaceSuffix(clean);
  if (!isDoorLikeRemovedPartId(doorVisualKey)) return clean;
  return toDoorStyleOverrideMapKey(doorVisualKey);
}

export function toCanonicalRemovedDoorsMapKey(partId: unknown): string {
  const canonicalPartId = toCanonicalRemovedDoorPartId(partId);
  return canonicalPartId ? `removed_${canonicalPartId}` : '';
}

export function toInheritedFullRemovedDoorsMapKey(partId: unknown): string {
  const canonicalPartId = toCanonicalRemovedDoorPartId(partId);
  if (!canonicalPartId || !isDoorLikeRemovedPartId(canonicalPartId)) return '';
  const identity = resolveDoorVisualSegmentIdentity(canonicalPartId);
  return identity.isSegment && identity.fullPartId ? `removed_${identity.fullPartId}` : '';
}

export function isCanonicalRemovedDoorsMapKey(key: unknown): key is string {
  const raw = readRemovedDoorKey(key);
  return !!raw && raw.startsWith('removed_') && raw === toCanonicalRemovedDoorsMapKey(raw);
}

function uniqueNonEmpty(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function listCanonicalRemovedDoorLookupKeys(partId: unknown): string[] {
  return uniqueNonEmpty([toCanonicalRemovedDoorsMapKey(partId), toInheritedFullRemovedDoorsMapKey(partId)]);
}

export function resolveRemovedDoorPartIdentity(partId: unknown): RemovedDoorPartIdentity {
  const clean = stripRemovedDoorMapPrefix(partId);
  const doorVisualKey = stripDoorVisualSurfaceSuffix(clean);
  const isDoorLike = isDoorLikeRemovedPartId(doorVisualKey);
  const canonicalPartId = toCanonicalRemovedDoorPartId(partId);
  const mapKey = canonicalPartId ? `removed_${canonicalPartId}` : '';
  if (!canonicalPartId || !isDoorLike) {
    return {
      partId: canonicalPartId,
      mapKey,
      basePartId: canonicalPartId,
      fullPartId: '',
      isDoorLike: false,
      isSegment: false,
      isFull: false,
      lookupKeys: mapKey ? [mapKey] : [],
    };
  }

  const visualIdentity = resolveDoorVisualSegmentIdentity(canonicalPartId);
  return {
    partId: canonicalPartId,
    mapKey,
    basePartId: visualIdentity.basePartId,
    fullPartId: visualIdentity.fullPartId,
    isDoorLike: true,
    isSegment: visualIdentity.isSegment,
    isFull: canonicalPartId === visualIdentity.fullPartId,
    lookupKeys: uniqueNonEmpty([
      mapKey,
      visualIdentity.isSegment && visualIdentity.fullPartId ? `removed_${visualIdentity.fullPartId}` : '',
    ]),
  };
}
