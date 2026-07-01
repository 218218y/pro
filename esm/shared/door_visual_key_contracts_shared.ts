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
