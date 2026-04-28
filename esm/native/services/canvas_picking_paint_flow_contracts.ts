import type { AppContainer } from '../../../types';
import type { CanvasPickingHitIdentity } from './canvas_picking_hit_identity.js';

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
  hitIdentity?: CanvasPickingHitIdentity | null;
}
