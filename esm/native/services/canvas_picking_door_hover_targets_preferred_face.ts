import type { AppContainer } from '../../../types';
import { hasViewportPickingSurface } from '../runtime/render_access.js';
import type {
  DoorHoverHit,
  GetViewportRootsFn,
  IsViewportRootFn,
  StrFn,
} from './canvas_picking_door_hover_targets_shared.js';
import type { HitObjectLike } from './canvas_picking_engine.js';
import { __resolveDoorGroupForPartId } from './canvas_picking_door_hover_targets_match.js';
import { __readPreferredFaceWorldY } from './canvas_picking_door_hover_targets_preferred_face_world.js';
import { createCanvasPickingDoorHoverHitIdentity } from './canvas_picking_hit_identity.js';

export function __resolvePreferredFacePreviewHit(args: {
  App: AppContainer;
  preferredPartId: string;
  preferredHitObject: HitObjectLike | null;
  getViewportRoots: GetViewportRootsFn;
  isViewportRoot: IsViewportRootFn;
  str: StrFn;
}): DoorHoverHit | null {
  const { App, preferredPartId, preferredHitObject, getViewportRoots, isViewportRoot, str } = args;
  if (!preferredPartId || !preferredHitObject || !hasViewportPickingSurface(App)) return null;

  const { wardrobeGroup } = getViewportRoots(App);
  if (!wardrobeGroup) return null;

  const resolvedGroup = __resolveDoorGroupForPartId({
    App,
    startObject: preferredHitObject,
    targetPartId: preferredPartId,
    isViewportRoot,
    str,
  });
  if (!resolvedGroup) return null;

  return {
    hitDoorPid: preferredPartId,
    hitDoorGroup: resolvedGroup,
    hitY: __readPreferredFaceWorldY(App, resolvedGroup),
    hitPoint: null,
    wardrobeGroup,
    hitIdentity: createCanvasPickingDoorHoverHitIdentity({
      partId: preferredPartId,
      hitObjectUserData: preferredHitObject.userData,
      source: 'preferred-face',
    }),
  };
}
