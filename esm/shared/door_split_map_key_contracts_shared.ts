const DOOR_VISUAL_SEGMENT_SUFFIX_RE = /_(?:full|top|bot|mid\d*)$/i;
const DOOR_VISUAL_SURFACE_SUFFIX_RE = /_(?:accent|groove)_(?:top|bottom|left|right)$/i;
const DOOR_TRIM_DECORATION_SUFFIX_RE = /_(?:trim|trim_preview)(?:_[a-z0-9]+)?$/i;

function readRawKey(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function readCanonicalToken(value: unknown): string {
  const raw = readRawKey(value);
  const key = raw.trim();
  return raw === key ? key : '';
}

function hasVisualOrDecoratedSuffix(value: string): boolean {
  return (
    DOOR_VISUAL_SEGMENT_SUFFIX_RE.test(value) ||
    DOOR_VISUAL_SURFACE_SUFFIX_RE.test(value) ||
    DOOR_TRIM_DECORATION_SUFFIX_RE.test(value)
  );
}

export function isCanonicalSplitDoorBaseKey(value: unknown): value is string {
  const key = readCanonicalToken(value);
  if (!key || hasVisualOrDecoratedSuffix(key)) return false;
  if (/^(?:lower_)?d\d+$/.test(key)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(key)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(key)) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/i.test(key)) return true;
  return false;
}

export function isCanonicalSplitPositionBaseKey(value: unknown): value is string {
  const key = readCanonicalToken(value);
  return key === 'main' || isCanonicalSplitDoorBaseKey(key);
}

function hasCanonicalPrefixedBase(
  value: unknown,
  prefix: string,
  isCanonicalBase: (base: string) => boolean
): value is string {
  const key = readCanonicalToken(value);
  if (!key || !key.startsWith(prefix)) return false;
  const base = key.slice(prefix.length);
  return !!base && isCanonicalBase(base);
}

export function isCanonicalSplitDoorsMapKey(value: unknown): value is string {
  return hasCanonicalPrefixedBase(value, 'split_', isCanonicalSplitDoorBaseKey);
}

export function isCanonicalSplitPositionMapKey(value: unknown): value is string {
  return hasCanonicalPrefixedBase(value, 'splitpos_', isCanonicalSplitPositionBaseKey);
}

export function isCanonicalSplitDoorsBottomMapKey(value: unknown): value is string {
  return hasCanonicalPrefixedBase(value, 'splitb_', isCanonicalSplitDoorBaseKey);
}
