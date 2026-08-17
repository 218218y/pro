import type { AppContainer } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { ModuleKey, ProjectWorldPointToLocalFn } from './canvas_picking_sketch_free_box_contracts.js';

import { getRecordProp } from '../runtime/record.js';

export type SketchFreePlacementTransform = {
  wall: 'back' | 'left' | 'right';
  rotationY: number;
  pivotX: number;
  pivotZ: number;
  along: number;
  logicalCenterZ: number;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readSketchFreePlacementTransform(object: unknown): SketchFreePlacementTransform | null {
  let node = object && typeof object === 'object' ? object : null;
  for (let depth = 0; node && depth < 10; depth += 1) {
    const userData = getRecordProp(node, 'userData');
    const wall = userData?.__wpSketchFreePlacementWall;
    if (wall === 'left' || wall === 'right') {
      const rotationY = finiteNumber(userData?.__wpSketchFreePlacementRotationY);
      const pivotX = finiteNumber(userData?.__wpSketchFreePlacementPivotX);
      const pivotZ = finiteNumber(userData?.__wpSketchFreePlacementPivotZ);
      const along = finiteNumber(userData?.__wpSketchFreePlacementAlong);
      const logicalCenterZ = finiteNumber(userData?.__wpSketchFreePlacementLogicalCenterZ);
      if (rotationY != null && pivotX != null && pivotZ != null && along != null && logicalCenterZ != null) {
        return { wall, rotationY, pivotX, pivotZ, along, logicalCenterZ };
      }
    }
    if (wall === 'back') {
      return { wall: 'back', rotationY: 0, pivotX: 0, pivotZ: 0, along: 0, logicalCenterZ: 0 };
    }
    node = node && typeof node === 'object' ? Reflect.get(node, 'parent') : null;
  }
  return null;
}

export function remapSketchFreePlacementLocalPoint(
  point: { x: number; y: number; z: number },
  transform: SketchFreePlacementTransform | null
): { x: number; y: number; z: number } {
  if (!transform || transform.wall === 'back') return point;
  const dx = point.x - transform.pivotX;
  const dz = point.z - transform.pivotZ;
  const c = Math.cos(transform.rotationY);
  const sin = Math.sin(transform.rotationY);
  const canonicalDx = c * dx - sin * dz;
  const canonicalDz = sin * dx + c * dz;
  return {
    x: transform.along + canonicalDx,
    y: point.y,
    z: transform.logicalCenterZ + canonicalDz,
  };
}

export function getSketchFreeBoxPartPrefix(hostModuleKey: ModuleKey, boxId: unknown): string {
  const moduleKeyStr = formatIdentityValue(readIdentityValue(hostModuleKey));
  const bid = formatIdentityValue(readIdentityValue(boxId)) || 'box';
  return moduleKeyStr ? `sketch_box_free_${moduleKeyStr}_${bid}` : `sketch_box_free_${bid}`;
}

export function findSketchFreeBoxLocalHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  localParent: unknown;
  partPrefix: string;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
}): { x: number; y: number; z: number } | null {
  const { App, intersects, localParent, partPrefix, projectWorldPointToLocal } = args;
  for (let i = 0; i < intersects.length; i++) {
    const hit = intersects[i];
    const userData = getRecordProp(hit?.object, 'userData');
    const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    if (!partId || (partId !== partPrefix && !partId.startsWith(`${partPrefix}_`))) continue;
    const localPoint = hit?.point ? projectWorldPointToLocal(App, hit.point, localParent) : null;
    if (localPoint)
      return remapSketchFreePlacementLocalPoint(localPoint, readSketchFreePlacementTransform(hit.object));
  }
  return null;
}
