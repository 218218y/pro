import type { AppContainer, UnknownRecord } from '../../../types';
import { isDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { __wp_isDoorOrDrawerLikePartId } from './canvas_picking_core_helpers.js';
import { __wp_isViewportRoot } from './canvas_picking_local_helpers.js';
import { asRecordMap } from './canvas_picking_generic_paint_hover_shared.js';
import { isNonPaintableCanvasPaintPartId } from './canvas_picking_paint_part_eligibility.js';
import {
  readCanvasPaintTargetScopeFromObject,
  type CanvasPaintTargetScope,
} from './canvas_picking_paint_target_scope.js';

export type GenericPartPaintHoverTarget = {
  object: UnknownRecord;
  parent: UnknownRecord | null;
  partId: string;
  stackKey: 'top' | 'bottom';
  targetScope: CanvasPaintTargetScope;
};

function readStackKeyFromSelfOrAncestors(App: AppContainer, start: UnknownRecord | null): 'top' | 'bottom' {
  let curr: UnknownRecord | null = start;
  while (curr && !__wp_isViewportRoot(App, curr)) {
    const userData = asRecordMap(curr.userData);
    if (userData && typeof userData.__wpStack === 'string') {
      return userData.__wpStack === 'bottom' ? 'bottom' : 'top';
    }
    curr = asRecordMap(curr.parent);
  }
  return 'top';
}

export function resolveNonDoorHoverTargetFromObject(
  App: AppContainer,
  obj: unknown,
  preferredPartId?: string | null
): GenericPartPaintHoverTarget | null {
  let curr: UnknownRecord | null = asRecordMap(obj);
  while (curr && !__wp_isViewportRoot(App, curr)) {
    const userData = asRecordMap(curr.userData);
    const pidRaw = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    if (pidRaw && isNonPaintableCanvasPaintPartId(pidRaw)) return null;
    const isInternalDrawerCassette = userData?.__wpInternalDrawerCassette === true;
    if (
      pidRaw &&
      (isInternalDrawerCassette || !__wp_isDoorOrDrawerLikePartId(pidRaw) || isDrawerBoxPartId(pidRaw))
    ) {
      if (!preferredPartId || preferredPartId === pidRaw) {
        return {
          object: curr,
          parent: asRecordMap(curr.parent),
          partId: pidRaw,
          stackKey: readStackKeyFromSelfOrAncestors(App, curr),
          targetScope: readCanvasPaintTargetScopeFromObject(App, curr),
        };
      }
    }
    curr = asRecordMap(curr.parent);
  }
  return null;
}
