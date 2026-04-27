import type { AppContainer } from '../../../types';

export interface CanvasPaintClickArgs {
  App: AppContainer;
  foundPartId: string | null;
  effectiveDoorId?: string | null;
  foundDrawerId?: string | null;
  activeStack: 'top' | 'bottom';
  isPaintMode: boolean;
  primaryHitObject?: unknown;
  doorHitObject?: unknown;
  primaryHitPoint?: unknown;
  doorHitPoint?: unknown;
}
