import type { AppContainer } from '../../../types';

export interface CanvasDoorSplitClickArgs {
  App: AppContainer;
  effectiveDoorId: string;
  foundModuleStack: 'top' | 'bottom';
  doorHitY: number | null;
}

export type CanvasDoorSplitBounds = {
  minY: number;
  maxY: number;
};
