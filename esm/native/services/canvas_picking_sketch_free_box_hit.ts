import type { AppContainer, UnknownRecord } from '../../../types';
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
  owner: unknown;
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
        return { wall, rotationY, pivotX, pivotZ, along, logicalCenterZ, owner: node };
      }
    }
    if (wall === 'back') {
      return { wall: 'back', rotationY: 0, pivotX: 0, pivotZ: 0, along: 0, logicalCenterZ: 0, owner: node };
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

function shiftedNumber(value: unknown, offset: number): unknown {
  return typeof value === 'number' && Number.isFinite(value) ? value - offset : value;
}

function localizeMeasurementEntries(value: unknown, transform: SketchFreePlacementTransform): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const record = entry as UnknownRecord;
    return {
      ...record,
      startX: shiftedNumber(record.startX, transform.along),
      endX: shiftedNumber(record.endX, transform.along),
      labelX: shiftedNumber(record.labelX, transform.along),
      z: shiftedNumber(record.z, transform.logicalCenterZ),
    };
  });
}

export function localizeSketchFreePlacementPreview(
  preview: UnknownRecord,
  transform: SketchFreePlacementTransform
): UnknownRecord {
  if (transform.wall === 'back') return preview;
  return {
    ...preview,
    x: shiftedNumber(preview.x, transform.along),
    z: shiftedNumber(preview.z, transform.logicalCenterZ),
    frontOverlayX: shiftedNumber(preview.frontOverlayX, transform.along),
    frontOverlayZ: shiftedNumber(preview.frontOverlayZ, transform.logicalCenterZ),
    guideVerticalX: shiftedNumber(preview.guideVerticalX, transform.along),
    guideHorizontalX: shiftedNumber(preview.guideHorizontalX, transform.along),
    highlightX: shiftedNumber(preview.highlightX, transform.along),
    drawerMotionClosedX: shiftedNumber(preview.drawerMotionClosedX, transform.along),
    drawerMotionClosedZ: shiftedNumber(preview.drawerMotionClosedZ, transform.logicalCenterZ),
    clearanceMeasurements: localizeMeasurementEntries(preview.clearanceMeasurements, transform),
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
  for (const hit of intersects) {
    const userData = getRecordProp(hit?.object, 'userData');
    const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    if (!partId || (partId !== partPrefix && !partId.startsWith(`${partPrefix}_`))) continue;
    const localPoint = hit?.point ? projectWorldPointToLocal(App, hit.point, localParent) : null;
    if (localPoint)
      return remapSketchFreePlacementLocalPoint(localPoint, readSketchFreePlacementTransform(hit.object));
  }
  return null;
}
