import { readMirrorLayoutList, resolveMirrorPlacementListInRect } from './mirror_layout.js';
import type {
  DoorTrimMirrorPlacementArgs,
  DoorTrimRect,
  ResolvedDoorTrimPlacement,
} from './door_trim_placement_contracts.js';
import { DOOR_TRIM_MIRROR_EDGE_GAP_M, DOOR_TRIM_MIRROR_SNAP_ZONE_M } from './door_trim_shared.js';
import { DOOR_TRIM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildDoorTrimCenterNormFromResolvedCenter,
  buildDoorTrimRectFromPlacement,
  clampDoorTrimCenterWithinDoor,
  resolveDoorTrimPlacement,
} from './door_trim_placement_geometry.js';

function rectsOverlap(a: DoorTrimRect, b: DoorTrimRect, clearance: number): boolean {
  return !(
    a.maxX <= b.minX - clearance ||
    a.minX >= b.maxX + clearance ||
    a.maxY <= b.minY - clearance ||
    a.minY >= b.maxY + clearance
  );
}

function overlapsAnyMirror(rect: DoorTrimRect, mirrors: readonly DoorTrimRect[], clearance: number): boolean {
  for (let i = 0; i < mirrors.length; i += 1) {
    if (rectsOverlap(rect, mirrors[i], clearance)) return true;
  }
  return false;
}

function buildMirrorPlacementRects(rect: DoorTrimRect, mirrorLayouts: unknown): DoorTrimRect[] {
  const layouts = readMirrorLayoutList(mirrorLayouts);
  if (!layouts.length) return [];
  const placements = resolveMirrorPlacementListInRect({ rect, layouts });
  const out: DoorTrimRect[] = [];
  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const halfWidth = placement.mirrorWidthM / 2;
    const halfHeight = placement.mirrorHeightM / 2;
    out.push({
      minX: placement.centerX - halfWidth,
      maxX: placement.centerX + halfWidth,
      minY: placement.centerY - halfHeight,
      maxY: placement.centerY + halfHeight,
    });
  }
  return out;
}

export function resolveDoorTrimPlacementAvoidingMirror(
  args: DoorTrimMirrorPlacementArgs
): ResolvedDoorTrimPlacement {
  const base = resolveDoorTrimPlacement(args);
  const mirrorRects = buildMirrorPlacementRects(args.rect, args.mirrorLayouts);
  if (!mirrorRects.length) return base;

  const snapZone =
    typeof args.mirrorSnapZoneM === 'number' && Number.isFinite(args.mirrorSnapZoneM)
      ? Math.max(0, Number(args.mirrorSnapZoneM))
      : DOOR_TRIM_MIRROR_SNAP_ZONE_M;
  const edgeGap =
    typeof args.mirrorEdgeGapM === 'number' && Number.isFinite(args.mirrorEdgeGapM)
      ? Math.max(0, Number(args.mirrorEdgeGapM))
      : DOOR_TRIM_MIRROR_EDGE_GAP_M;

  const baseRect = buildDoorTrimRectFromPlacement(base);
  if (!overlapsAnyMirror(baseRect, mirrorRects, snapZone)) return base;

  const halfWidth = base.width / 2;
  const halfHeight = base.height / 2;
  const centerXMin = args.rect.minX + Math.min(halfWidth, (args.rect.maxX - args.rect.minX) / 2);
  const centerXMax = args.rect.maxX - Math.min(halfWidth, (args.rect.maxX - args.rect.minX) / 2);
  const centerYMin = args.rect.minY + Math.min(halfHeight, (args.rect.maxY - args.rect.minY) / 2);
  const centerYMax = args.rect.maxY - Math.min(halfHeight, (args.rect.maxY - args.rect.minY) / 2);

  type Candidate = { centerX: number; centerY: number; rank: number; delta: number };
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const pushCandidate = (centerX: number, centerY: number, rank: number): void => {
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return;
    const nextX = clampDoorTrimCenterWithinDoor(centerX, args.rect.minX, args.rect.maxX, base.width);
    const nextY = clampDoorTrimCenterWithinDoor(centerY, args.rect.minY, args.rect.maxY, base.height);
    const key = `${nextX.toFixed(6)}:${nextY.toFixed(6)}:${rank}`;
    if (seen.has(key)) return;
    seen.add(key);
    const nextRect: DoorTrimRect = {
      minX: nextX - halfWidth,
      maxX: nextX + halfWidth,
      minY: nextY - halfHeight,
      maxY: nextY + halfHeight,
    };
    if (overlapsAnyMirror(nextRect, mirrorRects, edgeGap)) return;
    candidates.push({
      centerX: nextX,
      centerY: nextY,
      rank,
      delta: Math.hypot(nextX - base.centerX, nextY - base.centerY),
    });
  };

  pushCandidate(base.centerX, centerYMin, 4);
  pushCandidate(base.centerX, centerYMax, 4);
  pushCandidate(centerXMin, base.centerY, 4);
  pushCandidate(centerXMax, base.centerY, 4);

  for (let i = 0; i < mirrorRects.length; i += 1) {
    const mirror = mirrorRects[i];
    if (base.axis === 'horizontal') {
      const overlapsX = !(baseRect.maxX <= mirror.minX - snapZone || baseRect.minX >= mirror.maxX + snapZone);
      if (overlapsX) {
        pushCandidate(base.centerX, mirror.minY - halfHeight - edgeGap, 0);
        pushCandidate(base.centerX, mirror.maxY + halfHeight + edgeGap, 0);
      }
      pushCandidate(mirror.minX - halfWidth - edgeGap, base.centerY, 2);
      pushCandidate(mirror.maxX + halfWidth + edgeGap, base.centerY, 2);
    } else {
      const overlapsY = !(baseRect.maxY <= mirror.minY - snapZone || baseRect.minY >= mirror.maxY + snapZone);
      if (overlapsY) {
        pushCandidate(mirror.minX - halfWidth - edgeGap, base.centerY, 0);
        pushCandidate(mirror.maxX + halfWidth + edgeGap, base.centerY, 0);
      }
      pushCandidate(base.centerX, mirror.minY - halfHeight - edgeGap, 2);
      pushCandidate(base.centerX, mirror.maxY + halfHeight + edgeGap, 2);
    }
  }

  if (!candidates.length) return base;
  candidates.sort((a, b) => a.rank - b.rank || a.delta - b.delta);
  const best = candidates[0];
  const width = Math.max(DOOR_TRIM_DIMENSIONS.normalize.rectSpanMinM, args.rect.maxX - args.rect.minX);
  const height = Math.max(DOOR_TRIM_DIMENSIONS.normalize.rectSpanMinM, args.rect.maxY - args.rect.minY);
  return {
    ...base,
    centerX: best.centerX,
    centerY: best.centerY,
    centerNorm:
      base.axis === 'vertical'
        ? buildDoorTrimCenterNormFromResolvedCenter(best.centerX, args.rect.minX, args.rect.maxX)
        : buildDoorTrimCenterNormFromResolvedCenter(best.centerY, args.rect.minY, args.rect.maxY),
    centerXNorm: buildDoorTrimCenterNormFromResolvedCenter(best.centerX, args.rect.minX, args.rect.maxX),
    centerYNorm: buildDoorTrimCenterNormFromResolvedCenter(best.centerY, args.rect.minY, args.rect.maxY),
    width: Math.min(base.width, width),
    height: Math.min(base.height, height),
  };
}
