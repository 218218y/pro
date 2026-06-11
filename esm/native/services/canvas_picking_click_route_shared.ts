import type {
  CanvasPickingClickHitState,
  CanvasPickingClickModeState,
  CanvasPickingClickModuleRefs,
} from './canvas_picking_click_contracts.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import type { AppContainer } from '../../../types';

export type CanvasPickingClickRouteArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  modeState: CanvasPickingClickModeState;
  hitState: CanvasPickingClickHitState;
  moduleRefs: CanvasPickingClickModuleRefs;
};
