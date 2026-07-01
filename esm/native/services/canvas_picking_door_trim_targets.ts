import type { AppContainer, DoorVisualEntryLike, UnknownRecord } from '../../../types';
import { stripDoorVisualSurfaceSuffix } from '../../shared/door_visual_key_contracts_shared.js';
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
  const preferredDrawerOwnerPartId = stripDoorTrimDecorationSuffix(
    readGroupDrawerOwnerPartId(preferredGroup)
  );
  const raw = stripDoorTrimDecorationSuffix(
    typeof candidatePartId === 'string' ? String(candidatePartId) : String(candidatePartId ?? '')
  );
  const variants = [
    scopeCornerPartIdForBottom(preferredDrawerOwnerPartId, preferredGroup),
    scopeCornerPartIdForBottom(preferredGroupPartId, preferredGroup),
    scopeCornerPartIdForBottom(raw, preferredGroup),
    preferredDrawerOwnerPartId,
    preferredGroupPartId,
    raw,
  ];
  for (let i = 0; i < variants.length; i += 1) {
    const key = canonDoorPartKeyForMaps(variants[i]);
    if (key && isDoorTrimTargetPartId(key)) return key;
  }
  return '';
}

function stripDoorTrimDecorationSuffix(partId: string): string {
  if (!partId) return '';
  return stripDoorVisualSurfaceSuffix(partId).replace(/_(?:trim|trim_preview)(?:_[a-z0-9]+)?$/i, '');
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
  const preferredDrawerOwnerPartId = readGroupDrawerOwnerPartId(preferredGroup);
  const strippedRaw = stripDoorTrimDecorationSuffix(raw);
  const strippedPreferred = stripDoorTrimDecorationSuffix(preferredGroupPartId);
  const strippedPreferredDrawerOwner = stripDoorTrimDecorationSuffix(preferredDrawerOwnerPartId);

  pushCandidate(out, seen, scopeCornerPartIdForBottom(preferredDrawerOwnerPartId, preferredGroup));
  pushCandidate(out, seen, scopeCornerPartIdForBottom(preferredGroupPartId, preferredGroup));
  pushCandidate(out, seen, scopeCornerPartIdForBottom(raw, preferredGroup));
  pushCandidate(out, seen, preferredDrawerOwnerPartId);
  pushCandidate(out, seen, preferredGroupPartId);
  pushCandidate(out, seen, raw);
  pushCandidate(out, seen, strippedPreferredDrawerOwner);
  pushCandidate(out, seen, strippedPreferred);
  pushCandidate(out, seen, strippedRaw);
  pushCandidate(out, seen, canonDoorPartKeyForMaps(preferredDrawerOwnerPartId));
  pushCandidate(out, seen, canonDoorPartKeyForMaps(preferredGroupPartId));
  pushCandidate(out, seen, canonDoorPartKeyForMaps(raw));
  pushCandidate(out, seen, canonDoorPartKeyForMaps(strippedPreferredDrawerOwner));
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
