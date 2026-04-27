import type { AppContainer, UnknownRecord } from '../../../types';
import { __wp_resolveNearestActionablePartFromHit } from './canvas_picking_core_helpers.js';
import type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';
import {
  type IsViewportRootFn,
  __asObject,
  __readParentHitObject,
} from './canvas_picking_door_hover_targets_shared.js';

function __isTransparentRestoreTargetObject(
  App: AppContainer,
  value: unknown,
  isViewportRoot: IsViewportRootFn
): boolean {
  let curr: HitObjectLike | null = __asObject<HitObjectLike>(value);
  while (curr && !isViewportRoot(App, curr)) {
    const currRec = __asObject<UnknownRecord>(curr);
    const userData = currRec ? __asObject<UnknownRecord>(currRec.userData) : null;
    if (userData?.__wpDoorRemoved === true) return true;
    curr = __readParentHitObject(currRec);
  }
  return false;
}

export function __isEligiblePaintIntersect(args: {
  App: AppContainer;
  hit: RaycastHitLike | null | undefined;
  isViewportRoot: IsViewportRootFn;
  allowTransparentRestoreTargets?: boolean;
}): boolean {
  const { App, hit, isViewportRoot, allowTransparentRestoreTargets = false } = args;
  const obj = hit && hit.object ? hit.object : null;
  const objRec = __asObject<UnknownRecord>(obj);
  if (!objRec) return false;
  if (objRec.type === 'LineSegments' || objRec.type === 'Line' || objRec.type === 'Sprite') return false;

  const objUserData = __asObject<UnknownRecord>(objRec.userData);
  if (objUserData && objUserData.isModuleSelector) return false;

  const material = __asObject<UnknownRecord>(objRec.material);
  if (material && material.visible === false) return false;
  if (material && material.opacity === 0) {
    if (!allowTransparentRestoreTargets) return false;
    if (!__isTransparentRestoreTargetObject(App, obj, isViewportRoot)) return false;
  }
  return true;
}

export function __readPrimaryBlockingPaintPartId(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  matchesPartId: (partId: string) => boolean;
}): string | null {
  const { App, intersects, matchesPartId } = args;
  for (let i = 0; i < intersects.length; i += 1) {
    const hit = intersects[i];
    const obj = hit && hit.object ? hit.object : null;
    const objRec = __asObject<UnknownRecord>(obj);
    if (!objRec) continue;
    if (objRec.type === 'LineSegments' || objRec.type === 'Line' || objRec.type === 'Sprite') continue;

    const objUserData = __asObject<UnknownRecord>(objRec.userData);
    if (objUserData && objUserData.isModuleSelector) continue;

    const material = __asObject<UnknownRecord>(objRec.material);
    if (material && material.visible === false) continue;
    if (material && material.opacity === 0) continue;

    const { nearestPartId, actionablePartId } = __wp_resolveNearestActionablePartFromHit(
      App,
      __asObject<HitObjectLike>(obj)
    );
    if (actionablePartId && matchesPartId(actionablePartId)) return null;
    if (nearestPartId && !matchesPartId(nearestPartId)) return nearestPartId;
    return null;
  }
  return null;
}
