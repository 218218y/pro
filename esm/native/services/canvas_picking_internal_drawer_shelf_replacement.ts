import type { AppContainer } from '../../../types';
import type { VerticalOccupancyRange } from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';

export function isInternalDrawerReplaceableShelfBlocker(blocker: VerticalOccupancyRange): boolean {
  return blocker?.kind === 'shelf';
}

export function withoutInternalDrawerReplaceableShelfBlockers<T extends VerticalOccupancyRange>(
  blockers: T[]
): T[] {
  return blockers.filter(blocker => !isInternalDrawerReplaceableShelfBlocker(blocker));
}

export function toastInternalDrawerRemovedShelves(App: AppContainer | null | undefined, count: number): void {
  if (!(count > 0) || !App) return;
  const message =
    count === 1
      ? 'מדף הוסר בעקבות הוספת מגירות פנימיות במקומו.'
      : `${count} מדפים הוסרו בעקבות הוספת מגירות פנימיות במקומם.`;
  __wp_toast(App, message, 'info');
}
