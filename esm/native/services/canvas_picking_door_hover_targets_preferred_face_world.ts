import type { AppContainer } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { HitObjectLike } from './canvas_picking_engine.js';
import {
  type TransformNodeLike,
  __asObject,
  __readHoverThree,
} from './canvas_picking_door_hover_targets_shared.js';

export function __readPreferredFaceWorldY(App: AppContainer, resolvedGroup: HitObjectLike): number {
  const T3 = __readHoverThree(getThreeMaybe(App));
  if (!T3) return 0;
  const pos = new T3.Vector3();
  try {
    __asObject<TransformNodeLike>(resolvedGroup)?.getWorldPosition?.(pos);
    return typeof pos.y === 'number' ? Number(pos.y) : 0;
  } catch {
    return 0;
  }
}
