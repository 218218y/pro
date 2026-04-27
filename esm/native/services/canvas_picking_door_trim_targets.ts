import type { AppContainer, DoorVisualEntryLike, UnknownRecord } from '../../../types';
import { getDoorsArray } from '../runtime/render_access.js';
import { asRecord } from '../runtime/record.js';

type DoorGroupLike =
  | (UnknownRecord & { userData?: UnknownRecord | null })
  | DoorVisualEntryLike['group']
  | null
  | undefined;

type DoorTrimTarget = {
  partId: string;
  group: DoorGroupLike;
};

function readGroupPartId(group: DoorGroupLike): string {
  const userData = asRecord(group?.userData);
  return userData && typeof userData.partId === 'string' ? String(userData.partId) : '';
}

function readGroupStackKey(group: DoorGroupLike): 'top' | 'bottom' | null {
  const userData = asRecord(group?.userData);
  const value = userData && typeof userData.__wpStack === 'string' ? String(userData.__wpStack) : '';
  return value === 'bottom' ? 'bottom' : value === 'top' ? 'top' : null;
}

function isDoorLikePartId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+(?:_|$)/.test(partId) && !partId.includes('_draw_')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(partId)) return true;
  if (partId.startsWith('sliding') || partId.startsWith('slide')) return true;
  if (partId.startsWith('lower_sliding')) return true;
  if (partId.startsWith('corner_door') || partId.startsWith('corner_pent_door')) return true;
  if (partId.startsWith('lower_corner_door') || partId.startsWith('lower_corner_pent_door')) return true;
  return false;
}

function isSegmentedDoorBaseId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_door_\d+$/.test(partId)) return true;
  if (/^(?:lower_)?corner_pent_door_\d+$/.test(partId)) return true;
  return false;
}

function canonDoorPartKeyForMaps(partId: string): string {
  if (!partId) return '';
  if (
    partId.endsWith('_full') ||
    partId.endsWith('_top') ||
    partId.endsWith('_mid') ||
    partId.endsWith('_bot')
  )
    return partId;
  if (isSegmentedDoorBaseId(partId)) return `${partId}_full`;
  return partId;
}

function scopeCornerPartIdForBottom(partId: string, preferredGroup: DoorGroupLike): string {
  if (!partId || readGroupStackKey(preferredGroup) !== 'bottom') return partId;
  if (partId.startsWith('lower_')) return partId;
  if (partId.startsWith('corner_')) return `lower_${partId}`;
  return partId;
}

function normalizeDoorTrimMapPartId(candidatePartId: unknown, preferredGroup: DoorGroupLike): string {
  const preferredGroupPartId = stripDoorTrimDecorationSuffix(readGroupPartId(preferredGroup));
  const raw = stripDoorTrimDecorationSuffix(
    typeof candidatePartId === 'string' ? String(candidatePartId) : String(candidatePartId ?? '')
  );
  const variants = [
    scopeCornerPartIdForBottom(preferredGroupPartId, preferredGroup),
    scopeCornerPartIdForBottom(raw, preferredGroup),
    preferredGroupPartId,
    raw,
  ];
  for (let i = 0; i < variants.length; i += 1) {
    const key = canonDoorPartKeyForMaps(variants[i]);
    if (key && isDoorLikePartId(key)) return key;
  }
  return '';
}

function stripDoorTrimDecorationSuffix(partId: string): string {
  if (!partId) return '';
  return partId
    .replace(/_(?:accent|groove)_(?:top|bottom|left|right)$/i, '')
    .replace(/_(?:trim|trim_preview)(?:_[a-z0-9]+)?$/i, '');
}

function pushCandidate(out: string[], seen: Set<string>, value: unknown): void {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!text || seen.has(text)) return;
  seen.add(text);
  out.push(text);
}

function buildDoorTrimPartIdCandidates(candidatePartId: unknown, preferredGroup: DoorGroupLike): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const raw = typeof candidatePartId === 'string' ? String(candidatePartId) : String(candidatePartId ?? '');
  const preferredGroupPartId = readGroupPartId(preferredGroup);
  const strippedRaw = stripDoorTrimDecorationSuffix(raw);
  const strippedPreferred = stripDoorTrimDecorationSuffix(preferredGroupPartId);

  pushCandidate(out, seen, preferredGroupPartId);
  pushCandidate(out, seen, raw);
  pushCandidate(out, seen, strippedPreferred);
  pushCandidate(out, seen, strippedRaw);
  pushCandidate(out, seen, canonDoorPartKeyForMaps(preferredGroupPartId));
  pushCandidate(out, seen, canonDoorPartKeyForMaps(raw));
  pushCandidate(out, seen, canonDoorPartKeyForMaps(strippedPreferred));
  pushCandidate(out, seen, canonDoorPartKeyForMaps(strippedRaw));

  if (strippedRaw.endsWith('_top') || strippedRaw.endsWith('_mid') || strippedRaw.endsWith('_bot')) {
    pushCandidate(out, seen, strippedRaw.replace(/_(top|mid|bot)$/i, '_full'));
  }
  if (
    strippedPreferred.endsWith('_top') ||
    strippedPreferred.endsWith('_mid') ||
    strippedPreferred.endsWith('_bot')
  ) {
    pushCandidate(out, seen, strippedPreferred.replace(/_(top|mid|bot)$/i, '_full'));
  }

  return out.filter(isDoorLikePartId);
}

function resolveDoorEntryByPartId(App: AppContainer, candidates: readonly string[]): DoorTrimTarget | null {
  if (!candidates.length) return null;
  const doors = getDoorsArray(App);
  for (let ci = 0; ci < candidates.length; ci += 1) {
    const wanted = candidates[ci];
    for (let i = 0; i < doors.length; i += 1) {
      const entry = doors[i];
      const partId = readGroupPartId(entry?.group);
      if (!partId || partId !== wanted) continue;
      return { partId, group: entry?.group };
    }
  }
  return null;
}

export function resolveDoorTrimTarget(
  App: AppContainer,
  candidatePartId: unknown,
  preferredGroup?: DoorGroupLike
): DoorTrimTarget | null {
  const group = preferredGroup || null;
  const candidates = buildDoorTrimPartIdCandidates(candidatePartId, group);
  const entry = resolveDoorEntryByPartId(App, candidates);
  if (entry) {
    const resolvedPartId = normalizeDoorTrimMapPartId(candidatePartId, entry.group);
    return {
      partId: resolvedPartId || readGroupPartId(entry.group),
      group: entry.group,
    };
  }

  const fallbackPartId = normalizeDoorTrimMapPartId(candidatePartId, group);
  if (fallbackPartId && group) return { partId: fallbackPartId, group };

  const groupPartId = readGroupPartId(group);
  if (groupPartId && isDoorLikePartId(groupPartId) && group) {
    return { partId: groupPartId, group };
  }
  return null;
}
