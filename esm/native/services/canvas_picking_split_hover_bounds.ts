import type { AppContainer } from '../../../types';
import { __wp_asRecord, __wp_getCanvasPickingRuntime } from './canvas_picking_core_shared.js';

export type SplitHoverDoorBounds = { minY: number; maxY: number };

export function __wp_getSplitHoverDoorBaseKey(partId: string): string {
  const pid = typeof partId === 'string' ? partId : String(partId || '');
  if (!pid) return '';
  if (pid.startsWith('d')) return pid.split('_')[0];
  if (pid.startsWith('lower_d')) return pid.split('_').slice(0, 2).join('_');
  if (pid.startsWith('corner_door')) {
    const parts = pid.split('_');
    return parts.length >= 3 ? `corner_door_${parts[2]}` : pid;
  }
  if (pid.startsWith('lower_corner_door')) {
    const parts = pid.split('_');
    return parts.length >= 4 ? `lower_corner_door_${parts[3]}` : pid;
  }
  if (pid.startsWith('corner_pent_door')) {
    const parts = pid.split('_');
    return parts.length >= 4 ? `corner_pent_door_${parts[3]}` : pid;
  }
  if (pid.startsWith('lower_corner_pent_door')) {
    const parts = pid.split('_');
    return parts.length >= 5 ? `lower_corner_pent_door_${parts[4]}` : pid;
  }
  return pid;
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
