import type { AppContainer, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { resolveDoorTrimTarget } from './canvas_picking_door_trim_targets.js';

export type DoorHitNode = UnknownRecord & {
  userData?: UnknownRecord | null;
  parent?: DoorHitNode | null;
  children?: DoorHitNode[] | null;
  getWorldPosition?: (target: { x: number; y: number; z: number }) => unknown;
  localToWorld?: (target: { x: number; y: number; z: number }) => unknown;
  worldToLocal?: (target: { x: number; y: number; z: number }) => unknown;
  getWorldQuaternion?: (target: unknown) => unknown;
};

function asDoorRecord<T extends UnknownRecord = UnknownRecord>(value: unknown): T | null {
  return asRecord<T>(value);
}

function readDoorLeafRectFromBounds(
  userData: UnknownRecord | null
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const minX =
    userData && typeof userData.__doorRectMinX === 'number' ? Number(userData.__doorRectMinX) : NaN;
  const maxX =
    userData && typeof userData.__doorRectMaxX === 'number' ? Number(userData.__doorRectMaxX) : NaN;
  const minY =
    userData && typeof userData.__doorRectMinY === 'number' ? Number(userData.__doorRectMinY) : NaN;
  const maxY =
    userData && typeof userData.__doorRectMaxY === 'number' ? Number(userData.__doorRectMaxY) : NaN;
  return Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(minY) && Number.isFinite(maxY)
    ? { minX, maxX, minY, maxY }
    : null;
}

export function readDoorLeafRectFromSizeUserData(
  userData: UnknownRecord | null
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const width = userData && typeof userData.__doorWidth === 'number' ? Number(userData.__doorWidth) : NaN;
  const height = userData && typeof userData.__doorHeight === 'number' ? Number(userData.__doorHeight) : NaN;
  const meshOffsetX =
    userData && typeof userData.__doorMeshOffsetX === 'number'
      ? Number(userData.__doorMeshOffsetX)
      : userData && typeof userData.__wpFaceOffsetX === 'number'
        ? Number(userData.__wpFaceOffsetX)
        : 0;
  if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) return null;
  return {
    minX: meshOffsetX - width / 2,
    maxX: meshOffsetX + width / 2,
    minY: -height / 2,
    maxY: height / 2,
  };
}

export function readDoorLeafRectFromUserData(
  userData: UnknownRecord | null
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  return readDoorLeafRectFromBounds(userData) || readDoorLeafRectFromSizeUserData(userData);
}

function readMirrorPlacementRectFromBounds(
  userData: UnknownRecord | null
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const minX =
    userData && typeof userData.__mirrorRectMinX === 'number' ? Number(userData.__mirrorRectMinX) : NaN;
  const maxX =
    userData && typeof userData.__mirrorRectMaxX === 'number' ? Number(userData.__mirrorRectMaxX) : NaN;
  const minY =
    userData && typeof userData.__mirrorRectMinY === 'number' ? Number(userData.__mirrorRectMinY) : NaN;
  const maxY =
    userData && typeof userData.__mirrorRectMaxY === 'number' ? Number(userData.__mirrorRectMaxY) : NaN;
  return Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(minY) && Number.isFinite(maxY)
    ? { minX, maxX, minY, maxY }
    : null;
}

function hasExplicitMirrorPlacementRect(userData: UnknownRecord | null): boolean {
  return !!readMirrorPlacementRectFromBounds(userData);
}

function readDoorNodePartId(node: DoorHitNode | null): string {
  const userData = asDoorRecord(node?.userData);
  return typeof userData?.partId === 'string' ? String(userData.partId) : '';
}

function resolveDescendantMirrorPlacementOwnerByPartId(
  doorHitObject: UnknownRecord | null,
  targetPartId: string
): DoorHitNode | null {
  const root = asDoorRecord<DoorHitNode>(doorHitObject);
  if (!root) return null;

  const stack: DoorHitNode[] = [root];
  let firstExplicitOwner: DoorHitNode | null = null;
  let visited = 0;

  while (stack.length && visited < 500) {
    visited += 1;
    const current = stack.shift() || null;
    if (!current) continue;

    const userData = asDoorRecord(current.userData);
    if (hasExplicitMirrorPlacementRect(userData)) {
      if (!firstExplicitOwner) firstExplicitOwner = current;
      const partId = readDoorNodePartId(current);
      if (!targetPartId || partId === targetPartId) return current;
    }

    const children = Array.isArray(current.children) ? current.children : [];
    for (let i = 0; i < children.length; i += 1) {
      const child = asDoorRecord<DoorHitNode>(children[i]);
      if (child) stack.push(child);
    }
  }

  return targetPartId ? null : firstExplicitOwner;
}

export function resolveDoorHitOwnerByPartId(
  doorHitObject: UnknownRecord | null,
  targetPartId: string | null | undefined
): DoorHitNode | null {
  const targetId = typeof targetPartId === 'string' && targetPartId ? String(targetPartId) : '';
  let firstDoorLeaf: DoorHitNode | null = null;

  return (
    walkDoorHitNode(doorHitObject, current => {
      const userData = asDoorRecord(current.userData);
      const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
      const hasDoorLeafRect = !!readDoorLeafRectFromUserData(userData);
      if (!hasDoorLeafRect) return null;
      if (!firstDoorLeaf) firstDoorLeaf = current;
      if (targetId && partId === targetId) return current;
      if (!targetId && partId) return current;
      return null;
    }) || firstDoorLeaf
  );
}

export function readMirrorPlacementRectFromUserData(
  userData: UnknownRecord | null
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  return readMirrorPlacementRectFromBounds(userData) || readDoorLeafRectFromSizeUserData(userData);
}

export function resolveMirrorPlacementOwnerByPartId(
  doorHitObject: UnknownRecord | null,
  targetPartId: string | null | undefined
): DoorHitNode | null {
  const targetId = typeof targetPartId === 'string' && targetPartId ? String(targetPartId) : '';
  const descendantMirrorOwner = resolveDescendantMirrorPlacementOwnerByPartId(doorHitObject, targetId);
  if (descendantMirrorOwner) return descendantMirrorOwner;

  let firstMirrorOwner: DoorHitNode | null = null;

  return (
    walkDoorHitNode(doorHitObject, current => {
      const userData = asDoorRecord(current.userData);
      const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
      const hasMirrorRect = !!readMirrorPlacementRectFromUserData(userData);
      if (!hasMirrorRect) return null;
      if (!firstMirrorOwner) firstMirrorOwner = current;
      if (targetId && partId === targetId) return current;
      if (!targetId && partId) return current;
      return null;
    }) || firstMirrorOwner
  );
}

export function readPointXYZ(value: unknown): { x: number; y: number; z: number } | null {
  const rec = asDoorRecord(value);
  if (!rec) return null;
  const x = typeof rec.x === 'number' ? Number(rec.x) : NaN;
  const y = typeof rec.y === 'number' ? Number(rec.y) : NaN;
  const z = typeof rec.z === 'number' ? Number(rec.z) : NaN;
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
}

function walkDoorHitNode<T>(
  doorHitObject: UnknownRecord | null,
  visit: (node: DoorHitNode) => T | null
): T | null {
  let current = asDoorRecord<DoorHitNode>(doorHitObject);
  while (current) {
    const resolved = visit(current);
    if (resolved != null) return resolved;
    current = asDoorRecord<DoorHitNode>(current.parent);
  }
  return null;
}

export function resolveDoorTrimTargetFromHitObject(
  App: AppContainer,
  doorHitObject: UnknownRecord | null,
  fallbackPartId: string
) {
  const target = walkDoorHitNode(doorHitObject, current => {
    const userData = asDoorRecord(current.userData);
    const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    const looksLikeDoorLeaf =
      Number.isFinite(Number(userData?.__doorWidth)) && Number.isFinite(Number(userData?.__doorHeight));
    if (!looksLikeDoorLeaf && !partId) return null;
    return resolveDoorTrimTarget(App, partId || fallbackPartId, current);
  });
  return target || resolveDoorTrimTarget(App, fallbackPartId);
}

export function readDoorPartIdFromHitObject(doorHitObject: UnknownRecord | null): string | null {
  return walkDoorHitNode(doorHitObject, current => {
    const userData = asDoorRecord(current.userData);
    const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    return partId || null;
  });
}

export function readDoorWidthFromHitObject(doorHitObject: UnknownRecord | null): number | null {
  return walkDoorHitNode(doorHitObject, current => {
    const userData = asDoorRecord(current.userData);
    const width = typeof userData?.__doorWidth === 'number' ? Number(userData.__doorWidth) : NaN;
    return Number.isFinite(width) && width > 0 ? width : null;
  });
}
