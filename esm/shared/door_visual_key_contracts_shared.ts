export type DoorVisualSegmentIdentity = {
  partId: string;
  basePartId: string;
  fullPartId: string;
  isSegment: boolean;
  lookupKeys: string[];
};

const SEGMENTED_DOOR_ANY_SUFFIX_RE = /_(?:full|top|bot|mid\d*)$/i;
const SEGMENTED_DOOR_PART_SUFFIX_RE = /_(?:top|bot|mid\d*)$/i;
const DOOR_VISUAL_SURFACE_SUFFIX_RE = /_(?:accent|groove)_(?:top|bottom|left|right)$/i;
const DOOR_VISUAL_DECORATION_SUFFIX_RE = /_(?:trim|trim_preview)(?:_[a-z0-9]+)?$/i;

function readPartKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function readRawPartKey(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

export function hasDoorVisualSegmentSuffix(partId: string): boolean {
  return SEGMENTED_DOOR_ANY_SUFFIX_RE.test(partId);
}

export function isSegmentedDoorBaseId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(partId) && !hasDoorVisualSegmentSuffix(partId)) {
    return true;
  }
  return false;
}

export function isDoorStyleSegmentedBaseId(partId: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(partId) ||
    /^(?:lower_)?corner_door_\d+$/.test(partId) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
  );
}

export function toDoorStyleOverrideMapKey(partId: unknown): string {
  const key = readPartKey(partId);
  if (!key) return '';
  if (hasDoorVisualSegmentSuffix(key)) return key;
  return isDoorStyleSegmentedBaseId(key) ? `${key}_full` : key;
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

  if (SEGMENTED_DOOR_PART_SUFFIX_RE.test(partId)) {
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

export function stripDoorVisualSurfaceSuffix(partId: string): string {
  return String(partId || '').replace(DOOR_VISUAL_SURFACE_SUFFIX_RE, '');
}

export function stripDoorVisualDecorationSuffix(partId: unknown): string {
  let key = readPartKey(partId);
  for (let index = 0; index < 4; index += 1) {
    const next = stripDoorVisualSurfaceSuffix(key).replace(DOOR_VISUAL_DECORATION_SUFFIX_RE, '');
    if (next === key) return key;
    key = next;
  }
  return key;
}

export function toCanonicalDoorVisualMapKey(partId: unknown): string {
  const key = stripDoorVisualDecorationSuffix(partId);
  return key ? toDoorStyleOverrideMapKey(key) : '';
}

export function isCanonicalDoorVisualMapKey(partId: unknown): partId is string {
  const raw = readRawPartKey(partId);
  const key = readPartKey(partId);
  return !!key && raw === key && key === toCanonicalDoorVisualMapKey(key);
}

export function resolveDoorVisualSegmentIdentity(partId: unknown): DoorVisualSegmentIdentity {
  const key = stripDoorVisualSurfaceSuffix(String(partId || ''));
  const basePartId = key.replace(SEGMENTED_DOOR_ANY_SUFFIX_RE, '');
  const fullPartId = basePartId ? `${basePartId}_full` : '';
  return {
    partId: key,
    basePartId,
    fullPartId,
    isSegment: SEGMENTED_DOOR_PART_SUFFIX_RE.test(key),
    lookupKeys: buildDoorVisualLookupKeys(key),
  };
}

/**
 * Canonical split-authoring base key for hover/click/map keys.
 *
 * This is a split-authoring contract, not a general visual identity shortcut.
 * Do not replace it with resolveDoorVisualSegmentIdentity(...).basePartId in
 * callers without a full audit: it preserves the existing split hover, click,
 * and map-key contract while normalizing decorative surface ids to their door.
 */
export function resolveDoorSplitAuthoringBaseKey(partId: unknown): string {
  return resolveDoorVisualSegmentIdentity(partId).basePartId;
}
