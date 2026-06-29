import { readGeometryRuntimePositiveNumber } from './geometry_runtime_contracts.js';
import {
  asGeometryUserData,
  readMirrorPlacementRectFromGeometryUserData,
} from './geometry_user_data_contracts.js';
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

export function applyDoorFaceIdentityMetadata(node: Object3DLike, faceSign: number): void {
  const rec = _asObject(node);
  if (!rec) return;
  const userData = _asObject(rec.userData) || {};
  rec.userData = userData;
  const sign = faceSign < 0 ? -1 : 1;
  userData.faceSign = sign;
  userData.faceSide = sign < 0 ? 'inside' : 'outside';
}

export function applyMirrorPlacementRectMetadata(node: Object3DLike, width: number, height: number): void {
  const rec = _asObject(node);
  if (!rec) return;
  const widthM = readGeometryRuntimePositiveNumber(width);
  const heightM = readGeometryRuntimePositiveNumber(height);
  if (widthM == null || heightM == null) return;
  const halfW = widthM / 2;
  const halfH = heightM / 2;
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
  const userData = asGeometryUserData(rec.userData);
  return readMirrorPlacementRectFromGeometryUserData(userData);
}
