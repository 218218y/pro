import type { Object3DLike } from '../../../types';
import { HINGED_DOOR_RENDER_POLICY } from '../../shared/dimensions/door_system_policy.js';
import {
  clampSurfaceHandleCenter,
  getSurfaceDoorAnchorX,
  getSurfaceHandleFootprint,
} from '../../shared/handle_catalog.js';
import type { HandleFrontRect, SurfaceHandleType } from '../../shared/handle_catalog.js';
import {
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
  readGeometryUserDataSignKey,
} from './geometry_user_data_contracts.js';

export function resolveCatalogDoorHandleCenter(
  type: SurfaceHandleType,
  sizeMm: number | undefined,
  rect: HandleFrontRect,
  isLeftHinge: boolean,
  y: number,
  manual: { x: number; y: number } | null
): { x: number; y: number } | null {
  const x = (rect.minX + rect.maxX) / 2 + getSurfaceDoorAnchorX(rect.maxX - rect.minX, isLeftHinge);
  return clampSurfaceHandleCenter(
    getSurfaceHandleFootprint(type, 'door', sizeMm),
    rect,
    manual?.x ?? x,
    manual?.y ?? y
  );
}

export function readHandleDoorThickness(data: Object3DLike['userData']): number {
  return (
    readGeometryUserDataPositiveNumberKey(data, '__wpFrontThickness') ??
    HINGED_DOOR_RENDER_POLICY.visualThicknessM
  );
}

export function mountCatalogDoorHandle(
  handle: Object3DLike,
  center: { x: number; y: number },
  offsetY: number,
  leafData: Object3DLike['userData'],
  rootData: Object3DLike['userData']
): void {
  const sign = readGeometryUserDataSignKey(rootData, '__handleZSign', 1) ?? 1;
  const thickness = readHandleDoorThickness(leafData);
  const frontZ = readGeometryUserDataNumberKey(leafData, '__frontMaxZ') ?? thickness / 2;
  handle.position.set(center.x, center.y + offsetY, sign * frontZ);
  if (sign === -1) handle.scale.z = sign;
}
