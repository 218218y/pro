import type { AppContainer } from '../../../types';

import {
  __wp_isDoorLikePartId,
  __wp_isDoorOrDrawerLikePartId,
  __wp_reportPickingIssue,
  __wp_resolveNearestActionablePartFromHit,
} from './canvas_picking_core_helpers.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { __wp_isViewportRoot } from './canvas_picking_local_helpers.js';
import { isCanvasPickingMaterialHitEligible } from './canvas_picking_transparent_hit_policy.js';
import type { MutableCanvasPickingClickHitState } from './canvas_picking_click_hit_flow_state.js';
import {
  mergeCanvasPickingHitIdentityUserData,
  normalizeCanvasPickingModuleStack,
} from './canvas_picking_hit_identity.js';

export function scanCanvasPickingClickObjectHit(args: {
  App: AppContainer;
  hit: RaycastHitLike;
  isRemoveDoorMode: boolean;
  state: MutableCanvasPickingClickHitState;
}): void {
  const { App, hit, isRemoveDoorMode, state } = args;
  const obj = hit.object;

  if (
    !isCanvasPickingMaterialHitEligible({
      App,
      object: obj,
      isViewportRoot: __wp_isViewportRoot,
      allowTransparentRestoreTargets: isRemoveDoorMode,
    })
  ) {
    return;
  }

  if (!state.primaryHitObject) {
    state.primaryHitObject = obj;
    state.primaryHitPoint = hit.point || null;
    state.primaryHitY = hit.point && typeof hit.point.y === 'number' ? hit.point.y : null;
  }

  let curr: typeof obj | null = obj;
  while (curr && !__wp_isViewportRoot(App, curr)) {
    if (curr.userData?.partId != null) {
      const pid = String(curr.userData.partId);
      const mergedUserData = mergeCanvasPickingHitIdentityUserData(obj.userData, curr.userData);
      const stackHint = normalizeCanvasPickingModuleStack(
        mergedUserData?.moduleStack ?? mergedUserData?.__wpStack ?? mergedUserData?.stack
      );
      if (stackHint && state.stackHintSource !== 'moduleSelector') {
        state.foundModuleStack = stackHint;
        state.stackHintSource = 'objectTag';
      }
      if (!state.foundPartId) {
        state.foundPartId = pid;
        state.foundPartUserData = mergedUserData;
      }

      if (__wp_isDoorLikePartId(pid) && !state.effectiveDoorId) {
        const resolvedDoorId =
          typeof mergedUserData?.doorId === 'string' && mergedUserData.doorId.trim()
            ? mergedUserData.doorId.trim()
            : pid;
        state.effectiveDoorId = resolvedDoorId;
        state.doorHitObject = obj;
        state.doorHitUserData = mergedUserData;
        state.doorHitPoint = hit.point || null;
        state.doorHitY = hit.point && typeof hit.point.y === 'number' ? hit.point.y : null;
      }

      if (pid.startsWith('drawer_') && !state.foundDrawerId) {
        state.foundDrawerId = pid;
      }
    }
    curr = curr.parent || null;
  }
}

export function promoteNearestActionableClickHit(
  App: AppContainer,
  state: MutableCanvasPickingClickHitState
): void {
  try {
    const hitIds = __wp_resolveNearestActionablePartFromHit(App, state.primaryHitObject);
    if (!state.foundPartId && hitIds.nearestPartId) state.foundPartId = hitIds.nearestPartId;

    if (hitIds.actionablePartId) {
      const foundIsActionable = __wp_isDoorOrDrawerLikePartId(state.foundPartId);
      if (!foundIsActionable) state.foundPartId = hitIds.actionablePartId;
    }

    if (!state.effectiveDoorId && hitIds.doorId) state.effectiveDoorId = hitIds.doorId;
    if (!state.foundDrawerId && hitIds.drawerId) state.foundDrawerId = hitIds.drawerId;
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.click',
      op: 'promoteNearestActionablePart',
      throttleMs: 1000,
    });
  }
}
