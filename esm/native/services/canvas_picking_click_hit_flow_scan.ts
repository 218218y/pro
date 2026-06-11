import type { AppContainer } from '../../../types';

import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { MutableCanvasPickingClickHitState } from './canvas_picking_click_hit_flow_state.js';
import {
  scanCanvasPickingClickObjectHit,
  promoteNearestActionableClickHit,
} from './canvas_picking_click_hit_flow_scan_objects.js';
import {
  promoteSelectorPrimaryClickHit,
  scanCanvasPickingClickSelectorHits,
} from './canvas_picking_click_hit_flow_scan_selector.js';

export function scanCanvasPickingClickHits(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  isRemoveDoorMode: boolean;
  state: MutableCanvasPickingClickHitState;
}): void {
  const { App, intersects, isRemoveDoorMode, state } = args;

  for (let i = 0; i < intersects.length; i++) {
    const hit = intersects[i];
    const obj = hit.object;

    if (obj.type === 'LineSegments' || obj.type === 'Line' || obj.type === 'Sprite') continue;
    if (scanCanvasPickingClickSelectorHits({ App, hit, state })) continue;
    scanCanvasPickingClickObjectHit({ App, hit, isRemoveDoorMode, state });
  }
}

export { promoteNearestActionableClickHit, promoteSelectorPrimaryClickHit };
