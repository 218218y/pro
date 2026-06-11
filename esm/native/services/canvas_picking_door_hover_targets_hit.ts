import { hasViewportPickingSurface } from '../runtime/render_access.js';
import type { DoorHoverHit, DoorHoverResolverArgs } from './canvas_picking_door_hover_targets_shared.js';
import {
  __isEligiblePaintIntersect,
  __readPrimaryBlockingPaintPartId,
} from './canvas_picking_door_hover_targets_hit_paint.js';
import { __resolveHoverHitFromRaycastHit } from './canvas_picking_door_hover_targets_hit_scan.js';

export function __resolveHoverHit(
  args: DoorHoverResolverArgs,
  matchesPartId: (partId: string) => boolean
): DoorHoverHit | null {
  const {
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    getViewportRoots,
    getSplitHoverRaycastRoots,
    raycastReuse,
    isViewportRoot,
    str,
    allowTransparentRestoreTargets = false,
  } = args;

  if (!hasViewportPickingSurface(App)) return null;
  const { camera, wardrobeGroup } = getViewportRoots(App);
  if (!camera || !wardrobeGroup) return null;

  const raycastRoots = args.paintUsesWardrobeGroup ? [wardrobeGroup] : getSplitHoverRaycastRoots(App);
  const intersects = raycastReuse({
    App,
    raycaster,
    mouse,
    camera,
    ndcX,
    ndcY,
    objects: raycastRoots,
    recursive: true,
  });

  if (args.paintUsesWardrobeGroup) {
    const blockingPartId = __readPrimaryBlockingPaintPartId({
      App,
      intersects,
      matchesPartId,
    });
    if (blockingPartId) return null;

    for (let i = 0; i < intersects.length; i += 1) {
      const hit = intersects[i];
      if (!__isEligiblePaintIntersect({ App, hit, isViewportRoot, allowTransparentRestoreTargets })) continue;
      return __resolveHoverHitFromRaycastHit({
        App,
        hit,
        matchesPartId,
        isViewportRoot,
        str,
        wardrobeGroup,
      });
    }
    return null;
  }

  for (let i = 0; i < intersects.length; i += 1) {
    const hit = intersects[i];
    if (!__isEligiblePaintIntersect({ App, hit, isViewportRoot, allowTransparentRestoreTargets })) continue;

    const resolved = __resolveHoverHitFromRaycastHit({
      App,
      hit,
      matchesPartId,
      isViewportRoot,
      str,
      wardrobeGroup,
    });
    if (resolved) return resolved;
  }

  return null;
}
