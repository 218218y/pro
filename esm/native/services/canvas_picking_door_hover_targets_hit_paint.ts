import type { AppContainer, UnknownRecord } from '../../../types';
import { __wp_resolveNearestActionablePartFromHit } from './canvas_picking_core_helpers.js';
import type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';
import { isCanvasPickingMaterialHitEligible } from './canvas_picking_transparent_hit_policy.js';
import { type IsViewportRootFn, __asObject } from './canvas_picking_door_hover_targets_shared.js';

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

  return isCanvasPickingMaterialHitEligible({
    App,
    object: obj,
    isViewportRoot,
    allowTransparentRestoreTargets,
  });
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

    if (
      !isCanvasPickingMaterialHitEligible({
        App,
        object: obj,
        isViewportRoot: () => false,
        allowTransparentRestoreTargets: false,
      })
    ) {
      continue;
    }

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
