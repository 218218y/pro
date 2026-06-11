import { getCamera, getWardrobeGroup } from '../runtime/render_access.js';
import type {
  CanvasPickingClickHitFlowArgs,
  CanvasPickingClickHitState,
} from './canvas_picking_click_contracts.js';
import { __wp_raycastReuse } from './canvas_picking_core_helpers.js';
import {
  createMutableCanvasPickingClickHitState,
  finalizeCanvasPickingClickHitState,
  readObjectChildren,
} from './canvas_picking_click_hit_flow_shared.js';
import {
  promoteNearestActionableClickHit,
  promoteSelectorPrimaryClickHit,
  scanCanvasPickingClickHits,
} from './canvas_picking_click_hit_flow_scan.js';
import {
  promoteCornerCellCanvasPickingClickHit,
  repairCanvasPickingClickStack,
} from './canvas_picking_click_hit_flow_stack.js';

export function resolveCanvasPickingClickHitState(
  args: CanvasPickingClickHitFlowArgs
): CanvasPickingClickHitState | null {
  const { App, ndcX, ndcY, isRemoveDoorMode, raycaster, mouse } = args;
  if (!raycaster || !mouse) return null;
  if (typeof ndcX !== 'number' || typeof ndcY !== 'number') return null;

  const cam = getCamera(App);
  const wardrobeGroup = getWardrobeGroup(App);
  if (!cam || !wardrobeGroup) return null;

  const intersects = __wp_raycastReuse({
    App,
    raycaster,
    mouse,
    camera: cam,
    ndcX,
    ndcY,
    objects: readObjectChildren(wardrobeGroup) || [wardrobeGroup],
    recursive: true,
  });

  const state = createMutableCanvasPickingClickHitState();
  scanCanvasPickingClickHits({ App, intersects, isRemoveDoorMode, state });
  promoteNearestActionableClickHit(App, state);
  promoteSelectorPrimaryClickHit({ App, intersects, state });
  repairCanvasPickingClickStack({ App, cam, intersects, ndcY, state });
  promoteCornerCellCanvasPickingClickHit({ App, intersects, state });
  return finalizeCanvasPickingClickHitState(state, intersects);
}
