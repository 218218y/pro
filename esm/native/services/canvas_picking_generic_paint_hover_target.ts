import type { AppContainer, UnknownRecord } from '../../../types';
import { __wp_isDoorOrDrawerLikePartId } from './canvas_picking_core_helpers.js';
import { __wp_isViewportRoot } from './canvas_picking_local_helpers.js';
import { asRecordMap } from './canvas_picking_generic_paint_hover_shared.js';

export type GenericPartPaintHoverTarget = {
  object: UnknownRecord;
  parent: UnknownRecord | null;
  partId: string;
  stackKey: 'top' | 'bottom';
};

export function resolveNonDoorHoverTargetFromObject(
  App: AppContainer,
  obj: unknown,
  preferredPartId?: string | null
): GenericPartPaintHoverTarget | null {
  let curr: UnknownRecord | null = asRecordMap(obj);
  while (curr && !__wp_isViewportRoot(App, curr)) {
    const userData = asRecordMap(curr.userData);
    const pidRaw = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    if (pidRaw && !__wp_isDoorOrDrawerLikePartId(pidRaw)) {
      if (!preferredPartId || preferredPartId === pidRaw) {
        const stackKey =
          userData && typeof userData.__wpStack === 'string' && userData.__wpStack === 'bottom'
            ? 'bottom'
            : 'top';
        return {
          object: curr,
          parent: asRecordMap(curr.parent),
          partId: pidRaw,
          stackKey,
        };
      }
    }
    curr = asRecordMap(curr.parent);
  }
  return null;
}
