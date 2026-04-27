import { readDoorTrimList } from './door_trim_map.js';
import type {
  DoorTrimAxis,
  DoorTrimFindMatchArgs,
  DoorTrimRect,
  DoorTrimMatch,
} from './door_trim_placement_contracts.js';
import {
  DEFAULT_DOOR_TRIM_AXIS,
  DEFAULT_DOOR_TRIM_THICKNESS_M,
  normalizeDoorTrimAxis,
} from './door_trim_shared.js';
import { resolveDoorTrimPlacement } from './door_trim_placement_geometry.js';

export function resolveDoorTrimRemoveToleranceM(args: { rect: DoorTrimRect; axis: DoorTrimAxis }): number {
  const crossSpan =
    args.axis === 'vertical'
      ? Math.max(0, args.rect.maxX - args.rect.minX)
      : Math.max(0, args.rect.maxY - args.rect.minY);
  return Math.max(DEFAULT_DOOR_TRIM_THICKNESS_M * 1.15, Math.min(0.09, crossSpan * 0.12));
}

export function findDoorTrimMatchInRect(args: DoorTrimFindMatchArgs): DoorTrimMatch | null {
  const trims = readDoorTrimList(args.trims);
  const axis = normalizeDoorTrimAxis(args.axis, DEFAULT_DOOR_TRIM_AXIS);
  const toleranceM =
    typeof args.toleranceM === 'number' && Number.isFinite(args.toleranceM)
      ? Math.max(0, Number(args.toleranceM))
      : resolveDoorTrimRemoveToleranceM({ rect: args.rect, axis });
  let best: DoorTrimMatch | null = null;
  for (let i = 0; i < trims.length; i += 1) {
    const entry = trims[i];
    if (!entry || entry.axis !== axis) continue;
    const placement = resolveDoorTrimPlacement({ rect: args.rect, entry });
    const halfWidth = placement.width / 2;
    const halfHeight = placement.height / 2;
    const overflowX = Math.max(0, Math.abs(Number(args.localX) - placement.centerX) - halfWidth);
    const overflowY = Math.max(0, Math.abs(Number(args.localY) - placement.centerY) - halfHeight);
    if (overflowX > toleranceM || overflowY > toleranceM) continue;
    const distanceM = Math.hypot(overflowX, overflowY);
    if (!best || distanceM < best.distanceM) best = { index: i, entry, placement, distanceM };
  }
  return best;
}
