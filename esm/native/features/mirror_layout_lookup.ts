import type { MirrorLayoutEntry, MirrorLayoutList } from '../../../types';

import {
  cloneMirrorLayoutEntry,
  DEFAULT_FACE_SIGN,
  normalizeMirrorFaceSign,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  isRecord,
} from './mirror_layout_contracts.js';
import {
  distanceFromPointToRect,
  placementRect,
  prepareMirrorRect,
  resolveMirrorPlacementFromPreparedRect,
  resolveRemoveToleranceM,
  type MirrorRect,
  type ResolvedMirrorPlacement,
} from './mirror_layout_geometry.js';

export type MirrorLayoutHitMatch = {
  index: number;
  layout: MirrorLayoutEntry;
  placement: ResolvedMirrorPlacement;
  distanceM: number;
};

export function readMirrorLayoutListForPart(args: {
  map?: unknown;
  partId: unknown;
  scopedPartId?: unknown;
  preferScopedOnly?: boolean;
}): MirrorLayoutList {
  if (!isRecord(args.map)) return [];
  const map = args.map;

  const pushCandidate = (out: string[], seen: Record<string, true>, value: unknown): void => {
    const key = typeof value === 'string' ? value : String(value ?? '');
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(key);
  };

  const isSegmentedDoorBaseKey = (value: string): boolean =>
    /^(?:lower_)?d\d+$/i.test(value) ||
    /^(?:lower_)?corner_door_\d+$/i.test(value) ||
    /^(?:lower_)?corner_pent_door_\d+$/i.test(value);

  const pushVariants = (out: string[], seen: Record<string, true>, value: unknown): void => {
    const key = typeof value === 'string' ? value : String(value ?? '');
    if (!key) return;
    pushCandidate(out, seen, key);
    if (key.startsWith('lower_')) pushCandidate(out, seen, key.slice('lower_'.length));
    if (isSegmentedDoorBaseKey(key)) pushCandidate(out, seen, `${key}_full`);
  };

  const candidates: string[] = [];
  const seen: Record<string, true> = Object.create(null);
  pushVariants(candidates, seen, args.scopedPartId);
  if (!args.preferScopedOnly) pushVariants(candidates, seen, args.partId);

  for (let i = 0; i < candidates.length; i += 1) {
    const layouts = readMirrorLayoutList(map[candidates[i]]);
    if (layouts.length) return layouts;
  }
  return [];
}

export function findMirrorLayoutMatchInRect(args: {
  rect: MirrorRect;
  layouts?: unknown;
  hitX: number;
  hitY: number;
  toleranceM?: number;
  faceSign?: unknown;
}): MirrorLayoutHitMatch | null {
  const layouts = readMirrorLayoutList(args.layouts);
  if (!layouts.length) return null;

  const preparedRect = prepareMirrorRect(args.rect);
  let best: MirrorLayoutHitMatch | null = null;
  const requestedFaceSign =
    args.faceSign == null ? null : normalizeMirrorFaceSign(args.faceSign, DEFAULT_FACE_SIGN);
  for (let i = 0; i < layouts.length; i += 1) {
    const layout = layouts[i];
    if (
      requestedFaceSign !== null &&
      readMirrorLayoutFaceSign(layout, DEFAULT_FACE_SIGN) !== requestedFaceSign
    ) {
      continue;
    }
    const placement = resolveMirrorPlacementFromPreparedRect({ preparedRect, layout });
    const distanceM = distanceFromPointToRect(args.hitX, args.hitY, placementRect(placement));
    const toleranceM = resolveRemoveToleranceM(
      placement,
      typeof args.toleranceM === 'number' ? args.toleranceM : null
    );
    if (distanceM > toleranceM) continue;
    if (!best || distanceM < best.distanceM) {
      best = {
        index: i,
        layout: cloneMirrorLayoutEntry(layout),
        placement,
        distanceM,
      };
    }
  }

  return best;
}
