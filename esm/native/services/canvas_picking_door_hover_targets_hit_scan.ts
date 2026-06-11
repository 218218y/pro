import type { AppContainer, Object3DLike, UnknownRecord } from '../../../types';
import type { DoorHoverHit, IsViewportRootFn, StrFn } from './canvas_picking_door_hover_targets_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { __isReusableVectorLike } from './canvas_picking_door_hover_targets_shared.js';
import { __resolveDoorGroupForPartId } from './canvas_picking_door_hover_targets_match.js';
import {
  createCanvasPickingDoorHoverHitIdentity,
  mergeCanvasPickingHitIdentityUserData,
} from './canvas_picking_hit_identity.js';

export function __resolveHoverHitFromRaycastHit(args: {
  App: AppContainer;
  hit: RaycastHitLike;
  matchesPartId: (partId: string) => boolean;
  isViewportRoot: IsViewportRootFn;
  str: StrFn;
  wardrobeGroup: UnknownRecord;
}): DoorHoverHit | null {
  const { App, hit, matchesPartId, isViewportRoot, str, wardrobeGroup } = args;
  const hitObject = hit && hit.object ? hit.object : null;
  const nearestPart = __resolveNearestMatchingPartId({
    App,
    hitObject,
    matchesPartId,
    isViewportRoot,
    str,
  });
  if (!nearestPart) return null;

  const hitY = hit.point && typeof hit.point.y === 'number' ? hit.point.y : null;
  if (typeof hitY !== 'number') return null;

  const hitDoorGroup = __resolveDoorGroupForPartId({
    App,
    startObject: nearestPart.node,
    targetPartId: nearestPart.partId,
    isViewportRoot,
    str,
  });
  if (!hitDoorGroup) return null;

  return {
    hitDoorPid: nearestPart.partId,
    hitDoorGroup,
    hitY,
    hitPoint: hit.point && __isReusableVectorLike(hit.point) ? hit.point : null,
    wardrobeGroup,
    hitIdentity: createCanvasPickingDoorHoverHitIdentity({
      partId: nearestPart.partId,
      hitObjectUserData: mergeCanvasPickingHitIdentityUserData(
        hitObject?.userData,
        nearestPart.node.userData
      ),
      source: 'raycast',
    }),
  };
}

type DoorHoverNode = NonNullable<RaycastHitLike['object']> & Object3DLike;

function isDoorHoverNode(value: unknown): value is DoorHoverNode {
  return !!value && typeof value === 'object' && ('parent' in value || 'userData' in value);
}

function asDoorHoverNode(value: unknown): DoorHoverNode | null {
  return isDoorHoverNode(value) ? value : null;
}

function __resolveNearestMatchingPartId(args: {
  App: AppContainer;
  hitObject: unknown;
  matchesPartId: (partId: string) => boolean;
  isViewportRoot: IsViewportRootFn;
  str: StrFn;
}): { partId: string; node: DoorHoverNode } | null {
  const { App, hitObject, matchesPartId, isViewportRoot, str } = args;
  let curr = asDoorHoverNode(hitObject);
  while (curr && !isViewportRoot(App, curr)) {
    const userData = curr.userData;
    const partId = userData && userData.partId != null ? str(App, userData.partId) : '';
    if (partId && matchesPartId(partId)) return { partId, node: curr };
    curr = asDoorHoverNode(curr.parent);
  }
  return null;
}
