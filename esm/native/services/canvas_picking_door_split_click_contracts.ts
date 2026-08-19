import type { AppContainer } from '../../../types';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';

export interface CanvasDoorSplitClickArgs {
  App: AppContainer;
  effectiveDoorId: string;
  foundModuleStack: 'top' | 'bottom';
  doorHitY: number | null;
  ndcX?: number | null | undefined;
  ndcY?: number | null | undefined;
  raycaster?: RaycasterLike | null | undefined;
  mouse?: MouseVectorLike | null | undefined;
  camera?: unknown;
  doorHitGroup?: unknown;
}

export type CanvasDoorSplitBounds = {
  minY: number;
  maxY: number;
};
