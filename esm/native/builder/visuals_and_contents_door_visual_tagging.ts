import { _asObject } from './visuals_and_contents_shared.js';

import type { Object3DLike } from '../../../types/index.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

export function createDoorVisualPartTagger(args: { groovePartId?: string | null }): {
  doorOwnerPartId: string;
  tagDoorVisualPart: TagDoorVisualPartFn;
} {
  const doorOwnerPartId = typeof args.groovePartId === 'string' && args.groovePartId ? args.groovePartId : '';

  const tagDoorVisualPart: TagDoorVisualPartFn = (node: Object3DLike, visualRole?: string) => {
    const rec = _asObject(node);
    if (!rec) return;
    const userData = _asObject(rec.userData) || {};
    rec.userData = userData;
    if (doorOwnerPartId) userData.partId = doorOwnerPartId;
    if (visualRole) userData.__doorVisualRole = visualRole;
  };

  return { doorOwnerPartId, tagDoorVisualPart };
}

export function applyMirrorPlacementRectMetadata(node: Object3DLike, width: number, height: number): void {
  const rec = _asObject(node);
  if (!rec) return;
  const halfW = Number(width) / 2;
  const halfH = Number(height) / 2;
  if (!(Number.isFinite(halfW) && halfW > 0 && Number.isFinite(halfH) && halfH > 0)) return;
  const userData = _asObject(rec.userData) || {};
  rec.userData = userData;
  userData.__mirrorRectMinX = -halfW;
  userData.__mirrorRectMaxX = halfW;
  userData.__mirrorRectMinY = -halfH;
  userData.__mirrorRectMaxY = halfH;
}

export function readMirrorPlacementRectMetadata(
  node: Object3DLike
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const rec = _asObject(node);
  if (!rec) return null;
  const userData = _asObject(rec.userData);
  if (!userData) return null;
  const minX = typeof userData.__mirrorRectMinX === 'number' ? Number(userData.__mirrorRectMinX) : NaN;
  const maxX = typeof userData.__mirrorRectMaxX === 'number' ? Number(userData.__mirrorRectMaxX) : NaN;
  const minY = typeof userData.__mirrorRectMinY === 'number' ? Number(userData.__mirrorRectMinY) : NaN;
  const maxY = typeof userData.__mirrorRectMaxY === 'number' ? Number(userData.__mirrorRectMaxY) : NaN;
  return Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(minY) && Number.isFinite(maxY)
    ? { minX, maxX, minY, maxY }
    : null;
}
