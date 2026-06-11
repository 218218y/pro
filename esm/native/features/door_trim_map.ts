import type { DoorTrimEntry, DoorTrimMap } from './door_trim_shared.js';
import {
  DEFAULT_DOOR_TRIM_AXIS,
  DEFAULT_DOOR_TRIM_COLOR,
  DEFAULT_DOOR_TRIM_SPAN,
  DEFAULT_DOOR_TRIM_CENTER_NORM,
  isDoorTrimRecord,
  normalizeDoorTrimAxis,
  normalizeDoorTrimColor,
  normalizeDoorTrimCrossSizeCm,
  normalizeDoorTrimCustomSizeCm,
  normalizeDoorTrimSpan,
  resolveDoorTrimCenterPair,
} from './door_trim_shared.js';

function buildTrimId(seed?: unknown): string {
  if (typeof seed === 'string' && seed.trim()) return String(seed);
  return `trim_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneDoorTrimEntry(entry: DoorTrimEntry): DoorTrimEntry {
  return { ...entry };
}

export function readDoorTrimEntry(value: unknown): DoorTrimEntry | null {
  if (!isDoorTrimRecord(value)) return null;
  const axis = normalizeDoorTrimAxis(value.axis, DEFAULT_DOOR_TRIM_AXIS);
  const color = normalizeDoorTrimColor(value.color, DEFAULT_DOOR_TRIM_COLOR);
  const span = normalizeDoorTrimSpan(value.span, DEFAULT_DOOR_TRIM_SPAN);
  const { centerNorm, centerXNorm, centerYNorm } = resolveDoorTrimCenterPair(value, axis);
  const sizeCm = normalizeDoorTrimCustomSizeCm(value.sizeCm);
  const crossSizeCm = normalizeDoorTrimCrossSizeCm(value.crossSizeCm);

  const out: DoorTrimEntry = {
    id: buildTrimId(value.id),
    axis,
    color,
    span,
    centerNorm,
    centerXNorm,
    centerYNorm,
  };
  if (span === 'custom' && sizeCm != null) out.sizeCm = sizeCm;
  if (crossSizeCm != null) out.crossSizeCm = crossSizeCm;
  return out;
}

export function readDoorTrimList(value: unknown): DoorTrimEntry[] {
  if (Array.isArray(value)) {
    const out: DoorTrimEntry[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const entry = readDoorTrimEntry(value[i]);
      if (entry) out.push(entry);
    }
    return out;
  }
  const single = readDoorTrimEntry(value);
  return single ? [single] : [];
}

export function cloneDoorTrimList(value: unknown): DoorTrimEntry[] {
  const list = readDoorTrimList(value);
  const out: DoorTrimEntry[] = [];
  for (let i = 0; i < list.length; i += 1) out.push(cloneDoorTrimEntry(list[i]));
  return out;
}

export function readDoorTrimMap(value: unknown): DoorTrimMap {
  const out: DoorTrimMap = Object.create(null);
  if (!isDoorTrimRecord(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    const next = cloneDoorTrimList(entry);
    if (next.length) out[key] = next;
  }
  return out;
}

function pushDoorTrimCandidate(out: string[], seen: Record<string, true>, value: unknown): void {
  const key = typeof value === 'string' ? value : String(value ?? '');
  if (!key || seen[key]) return;
  seen[key] = true;
  out.push(key);
}

function isSegmentedDoorBaseKey(value: string): boolean {
  return (
    /^(?:lower_)?d\d+$/i.test(value) ||
    /^(?:lower_)?corner_door_\d+$/i.test(value) ||
    /^(?:lower_)?corner_pent_door_\d+$/i.test(value)
  );
}

function pushDoorTrimKeyVariants(
  out: string[],
  seen: Record<string, true>,
  value: unknown,
  options?: { allowLowerFallback?: boolean }
): void {
  const key = typeof value === 'string' ? value : String(value ?? '');
  if (!key) return;
  const allowLowerFallback = options?.allowLowerFallback !== false;
  pushDoorTrimCandidate(out, seen, key);
  if (key.startsWith('lower_') && allowLowerFallback)
    pushDoorTrimCandidate(out, seen, key.slice('lower_'.length));
  if (isSegmentedDoorBaseKey(key)) pushDoorTrimCandidate(out, seen, `${key}_full`);
}

export function readDoorTrimListForPart(args: {
  map?: unknown;
  partId: unknown;
  scopedPartId?: unknown;
  preferScopedOnly?: boolean;
}): DoorTrimEntry[] {
  if (!isDoorTrimRecord(args.map)) return [];
  const candidates: string[] = [];
  const seen: Record<string, true> = Object.create(null);
  pushDoorTrimKeyVariants(candidates, seen, args.scopedPartId, {
    allowLowerFallback: !args.preferScopedOnly,
  });
  if (!args.preferScopedOnly) pushDoorTrimKeyVariants(candidates, seen, args.partId);

  for (let i = 0; i < candidates.length; i += 1) {
    const trims = readDoorTrimList(args.map[candidates[i]]);
    if (trims.length) return trims;
  }
  return [];
}

export function createDoorTrimEntry(args: {
  id?: unknown;
  axis?: unknown;
  color?: unknown;
  span?: unknown;
  sizeCm?: unknown;
  crossSizeCm?: unknown;
  centerNorm?: unknown;
  centerXNorm?: unknown;
  centerYNorm?: unknown;
}): DoorTrimEntry {
  const id = buildTrimId(
    typeof args.id === 'string' && args.id
      ? args.id
      : `trim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  );
  const entry = readDoorTrimEntry({
    id,
    axis: args.axis,
    color: args.color,
    span: args.span,
    sizeCm: args.sizeCm,
    crossSizeCm: args.crossSizeCm,
    centerNorm: args.centerNorm,
    centerXNorm: args.centerXNorm,
    centerYNorm: args.centerYNorm,
  });
  return (
    entry || {
      id,
      axis: DEFAULT_DOOR_TRIM_AXIS,
      color: DEFAULT_DOOR_TRIM_COLOR,
      span: DEFAULT_DOOR_TRIM_SPAN,
      centerNorm: DEFAULT_DOOR_TRIM_CENTER_NORM,
      centerXNorm: DEFAULT_DOOR_TRIM_CENTER_NORM,
      centerYNorm: DEFAULT_DOOR_TRIM_CENTER_NORM,
    }
  );
}
