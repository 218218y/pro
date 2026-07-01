import type { AppContainer, DoorVisualEntryLike, UnknownRecord } from '../../../types';
import {
  listDoorTrimTargetLookupKeys,
  toCanonicalDoorTrimTargetKey,
} from '../../shared/door_trim_key_contracts_shared.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { isDrawerBoxPartId } from '../features/part_identity/api.js';
import { isCabinetBodyDoorTrimSurfacePartId } from '../features/door_authoring/api.js';
import { asRecord } from '../runtime/record.js';

type DoorGroupLike =
  (UnknownRecord & { userData?: UnknownRecord | null }) | DoorVisualEntryLike['group'] | null | undefined;

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

function readGroupDrawerOwnerPartId(group: DoorGroupLike): string {
  const userData = asRecord(group?.userData);
  if (!userData) return '';
  const owner =
    typeof userData.__wpDrawerOwnerPartId === 'string' && userData.__wpDrawerOwnerPartId.trim()
      ? userData.__wpDrawerOwnerPartId
      : typeof userData.drawerId === 'string' && userData.drawerId.trim()
        ? userData.drawerId
        : typeof userData.__wpDrawerId === 'string' && userData.__wpDrawerId.trim()
          ? userData.__wpDrawerId
          : '';
  return owner ? String(owner) : '';
}

function hasDoorLeafMetrics(group: DoorGroupLike): boolean {
  const userData = asRecord(group?.userData);
  if (!userData) return false;
  const hasSizeMetrics =
    typeof userData.__doorWidth === 'number' &&
    Number.isFinite(Number(userData.__doorWidth)) &&
    typeof userData.__doorHeight === 'number' &&
    Number.isFinite(Number(userData.__doorHeight));
  const hasRectMetrics =
    typeof userData.__doorRectMinX === 'number' &&
    Number.isFinite(Number(userData.__doorRectMinX)) &&
    typeof userData.__doorRectMaxX === 'number' &&
    Number.isFinite(Number(userData.__doorRectMaxX)) &&
    typeof userData.__doorRectMinY === 'number' &&
    Number.isFinite(Number(userData.__doorRectMinY)) &&
    typeof userData.__doorRectMaxY === 'number' &&
    Number.isFinite(Number(userData.__doorRectMaxY));
  return hasSizeMetrics || hasRectMetrics;
}

function isDoorLikePartId(partId: string): boolean {
  if (!partId) return false;
  if (/^(?:lower_)?d\d+(?:_|$)/.test(partId) && !partId.includes('_draw_')) return true;
  if (/^sketch_box(?:_free)?_.+_door(?:_|$)/.test(partId)) return true;
  if (partId.startsWith('sliding') || partId.startsWith('slide')) return true;
  if (partId.startsWith('lower_sliding') || partId.startsWith('lower_slide')) return true;
  if (partId.startsWith('corner_door') || partId.startsWith('corner_pent_door')) return true;
  if (partId.startsWith('lower_corner_door') || partId.startsWith('lower_corner_pent_door')) return true;
  return false;
}

function isExternalDrawerFrontLikePartId(partId: string): boolean {
  if (!partId || isDrawerBoxPartId(partId)) return false;
  if (/^(?:lower_)?d\d+_draw_(?:shoe|\d+)$/i.test(partId)) return true;
  if (/^sketch_ext_drawers_.+_\d+$/i.test(partId)) return true;
  if (/^sketch_box(?:_free)?_.+_ext_drawers_.+_\d+$/i.test(partId)) return true;
  if (/^(?:lower_)?corner_c\d+_draw_(?:shoe|\d+)$/i.test(partId)) return true;
  if (/^chest_drawer_\d+$/i.test(partId)) return true;
  return false;
}

function isDoorTrimTargetPartId(partId: string): boolean {
  return (
    isDoorLikePartId(partId) ||
    isExternalDrawerFrontLikePartId(partId) ||
    isCabinetBodyDoorTrimSurfacePartId(partId)
  );
}

function scopeCornerPartIdForBottom(partId: string, preferredGroup: DoorGroupLike): string {
  if (!partId || readGroupStackKey(preferredGroup) !== 'bottom') return partId;
  if (partId.startsWith('lower_')) return partId;
  if (partId.startsWith('corner_')) return `lower_${partId}`;
  return partId;
}

function normalizeDoorTrimMapPartId(candidatePartId: unknown, preferredGroup: DoorGroupLike): string {
  const preferredGroupPartId = readGroupPartId(preferredGroup);
  const preferredDrawerOwnerPartId = readGroupDrawerOwnerPartId(preferredGroup);
  const raw = typeof candidatePartId === 'string' ? String(candidatePartId) : String(candidatePartId ?? '');
  const variants = [
    scopeCornerPartIdForBottom(preferredDrawerOwnerPartId, preferredGroup),
    scopeCornerPartIdForBottom(preferredGroupPartId, preferredGroup),
    scopeCornerPartIdForBottom(raw, preferredGroup),
    preferredDrawerOwnerPartId,
    preferredGroupPartId,
    raw,
  ];
  for (let i = 0; i < variants.length; i += 1) {
    const key = toCanonicalDoorTrimTargetKey(variants[i]);
    if (key && isDoorTrimTargetPartId(key)) return key;
  }
  return '';
}

function pushCandidate(out: string[], seen: Set<string>, value: unknown): void {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!text || seen.has(text)) return;
  seen.add(text);
  out.push(text);
}

function pushDoorTrimTargetCandidates(out: string[], seen: Set<string>, value: unknown): void {
  const keys = listDoorTrimTargetLookupKeys(value);
  for (let index = 0; index < keys.length; index += 1) pushCandidate(out, seen, keys[index]);
}

function buildDoorTrimPartIdCandidates(candidatePartId: unknown, preferredGroup: DoorGroupLike): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const raw = typeof candidatePartId === 'string' ? String(candidatePartId) : String(candidatePartId ?? '');
  const preferredGroupPartId = readGroupPartId(preferredGroup);
  const preferredDrawerOwnerPartId = readGroupDrawerOwnerPartId(preferredGroup);

  pushDoorTrimTargetCandidates(
    out,
    seen,
    scopeCornerPartIdForBottom(preferredDrawerOwnerPartId, preferredGroup)
  );
  pushDoorTrimTargetCandidates(out, seen, scopeCornerPartIdForBottom(preferredGroupPartId, preferredGroup));
  pushDoorTrimTargetCandidates(out, seen, scopeCornerPartIdForBottom(raw, preferredGroup));
  pushDoorTrimTargetCandidates(out, seen, preferredDrawerOwnerPartId);
  pushDoorTrimTargetCandidates(out, seen, preferredGroupPartId);
  pushDoorTrimTargetCandidates(out, seen, raw);

  return out.filter(isDoorTrimTargetPartId);
}

function resolveDoorEntryByPartId(App: AppContainer, candidates: readonly string[]): DoorTrimTarget | null {
  if (!candidates.length) return null;
  const entries = [...getDoorsArray(App), ...getDrawersArray(App)];
  for (let ci = 0; ci < candidates.length; ci += 1) {
    const wanted = candidates[ci];
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
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

  // When a sketch door is cut by sketch external drawers, the original door group remains
  // in doorsArray with the full-height door metrics, while the live clickable leaves are
  // rebuilt as child segment groups. Prefer an explicit leaf group over the registry entry
  // so trim hover/click stays scoped to the actual top/bottom door piece.
  const preferredLeafPartId = normalizeDoorTrimMapPartId(candidatePartId, group);
  const preferredGroupPartId = readGroupPartId(group);
  if (
    preferredLeafPartId &&
    group &&
    hasDoorLeafMetrics(group) &&
    isDoorTrimTargetPartId(preferredGroupPartId)
  ) {
    return { partId: preferredLeafPartId, group };
  }

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
  if (groupPartId && isDoorTrimTargetPartId(groupPartId) && group) {
    return { partId: groupPartId, group };
  }
  return null;
}
