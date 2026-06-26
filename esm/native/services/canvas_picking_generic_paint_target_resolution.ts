import type { AppContainer, UnknownRecord } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { resolveNonDoorHoverTargetFromObject } from './canvas_picking_generic_paint_hover_target.js';
import type { CanvasPaintTargetScope } from './canvas_picking_paint_target_scope.js';
import { resolveNearbyShelfPaintTarget } from './canvas_picking_shelf_paint_proximity.js';

export type GenericPartPaintTarget = {
  object: UnknownRecord;
  parent: UnknownRecord | null;
  partId: string;
  stackKey: 'top' | 'bottom';
  targetScope?: CanvasPaintTargetScope | null;
};

function readPartId(value: unknown): string {
  return typeof value === 'string' ? String(value) : '';
}

export function resolveGenericPartPaintTarget(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord | null | undefined;
  primaryHitObject: unknown;
  foundPartId?: string | null;
  intersects?: readonly RaycastHitLike[] | null;
  primaryHitPoint?: { x?: number; y?: number; z?: number } | null;
}): GenericPartPaintTarget | null {
  const { App, wardrobeGroup, primaryHitObject } = args;
  const foundPartId = readPartId(args.foundPartId);

  const preferredTarget = foundPartId
    ? resolveNonDoorHoverTargetFromObject(App, primaryHitObject, foundPartId)
    : null;
  if (preferredTarget) return preferredTarget;

  const directTarget = resolveNonDoorHoverTargetFromObject(App, primaryHitObject, null);
  if (directTarget) return directTarget;

  return wardrobeGroup
    ? resolveNearbyShelfPaintTarget({
        App,
        wardrobeGroup,
        intersects: args.intersects,
        primaryHitPoint: args.primaryHitPoint || null,
      })
    : null;
}
