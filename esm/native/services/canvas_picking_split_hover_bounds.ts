import type { AppContainer } from '../../../types';
import { resolveDoorSplitAuthoringBaseKey } from '../features/door_authoring/api.js';
import { __wp_asRecord, __wp_getCanvasPickingRuntime } from './canvas_picking_core_shared.js';

export type SplitHoverDoorBounds = { minY: number; maxY: number };

export function __wp_getSplitHoverDoorBaseKey(partId: string): string {
  return resolveDoorSplitAuthoringBaseKey(partId);
}

export function __wp_readSplitHoverDoorBounds(
  App: AppContainer,
  baseKey: string
): SplitHoverDoorBounds | null {
  if (!baseKey) return null;
  try {
    const picking = __wp_getCanvasPickingRuntime(App);
    const map = __wp_asRecord(picking.__splitHoverDoorBoundsByBase);
    if (!map) return null;
    const rec = __wp_asRecord(map[baseKey]);
    if (!rec) return null;
    const minY = Number(rec.minY);
    const maxY = Number(rec.maxY);
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return null;
    return { minY, maxY };
  } catch {
    return null;
  }
}
