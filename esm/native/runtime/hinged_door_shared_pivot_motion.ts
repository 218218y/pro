import type { DoorVisualEntryLike, Object3DLike, UnknownRecord } from '../../../types';

export const HINGED_DOOR_SHARED_PIVOT_MOTION_POLICY = Object.freeze({
  /** Closed pivot coordinates must be effectively identical to share one divider axis. */
  sharedPivotMatchToleranceM: 0.0015,

  /** Ignore vertically disjoint leaves/segments that happen to reuse the same X pivot. */
  verticalOverlapToleranceM: 0.001,

  /**
   * Full-open lateral throw per leaf. Two opposing leaves gain 20 mm between
   * their motion frames, enough to clear the standard 18 mm rendered slab
   * without reducing the existing useful opening angle.
   */
  lateralThrowPerLeafM: 0.01,
});

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readUserData(group: Object3DLike | null | undefined): UnknownRecord | null {
  const userData = group?.userData;
  return userData && typeof userData === 'object' ? userData : null;
}

function isRemovedDoor(door: DoorVisualEntryLike | null | undefined): boolean {
  return readUserData(door?.group)?.__wpDoorRemoved === true;
}

function isCornerPentDoor(door: DoorVisualEntryLike | null | undefined): boolean {
  const userData = readUserData(door?.group);
  if (!userData) return false;
  if (userData.__wpCornerPentDoor || userData.__wpCornerPentDoorPair === 'corner_pent_pair') return true;
  const partId = userData.partId;
  return typeof partId === 'string' && partId.startsWith('corner_pent_door');
}

function readHingeSide(door: DoorVisualEntryLike | null | undefined): 'left' | 'right' | null {
  return door?.hingeSide === 'left' || door?.hingeSide === 'right' ? door.hingeSide : null;
}

function readEffectiveSwingSign(door: DoorVisualEntryLike): 1 | -1 | null {
  const hingeSide = readHingeSide(door);
  if (!hingeSide) return null;
  let sign: 1 | -1 = hingeSide === 'left' ? -1 : 1;
  const userData = readUserData(door.group);
  if (door.invertSwing === true || userData?.__invertSwing === true) sign = sign === 1 ? -1 : 1;
  return sign;
}

function sameParentScope(a: Object3DLike, b: Object3DLike): boolean {
  const aParent = a.parent;
  const bParent = b.parent;
  if (aParent == null && bParent == null) return true;
  return aParent != null && bParent != null && aParent === bParent;
}

function readDoorVerticalSpan(door: DoorVisualEntryLike): { minY: number; maxY: number } | null {
  const group = door.group;
  if (!group) return null;
  const centerY = readFinite(group.position?.y);
  const height = readFinite(readUserData(group)?.__doorHeight);
  if (centerY === null || height === null || height <= 0) return null;
  return { minY: centerY - height / 2, maxY: centerY + height / 2 };
}

function verticallyOverlaps(a: DoorVisualEntryLike, b: DoorVisualEntryLike): boolean {
  const aSpan = readDoorVerticalSpan(a);
  const bSpan = readDoorVerticalSpan(b);
  if (!aSpan || !bSpan) return true;
  const overlap = Math.min(aSpan.maxY, bSpan.maxY) - Math.max(aSpan.minY, bSpan.minY);
  return overlap > HINGED_DOOR_SHARED_PIVOT_MOTION_POLICY.verticalOverlapToleranceM;
}

export function ensureHingedDoorClosedPivotX(door: DoorVisualEntryLike): number | null {
  const stored = readFinite(door.originalX);
  if (stored !== null) return stored;
  if (door.type !== 'hinged' || !door.group) return null;
  const current = readFinite(door.group.position?.x);
  if (current === null) return null;
  door.originalX = current;
  return current;
}

function hasOpposingLeafOnSharedPivot(
  door: DoorVisualEntryLike,
  doors: readonly DoorVisualEntryLike[],
  closedPivotX: number
): boolean {
  if (isRemovedDoor(door) || isCornerPentDoor(door) || !door.group) return false;
  const hingeSide = readHingeSide(door);
  const swingSign = readEffectiveSwingSign(door);
  if (!hingeSide || swingSign === null) return false;

  for (const other of doors) {
    if (other === door || other?.type !== 'hinged' || !other.group) continue;
    if (isRemovedDoor(other) || isCornerPentDoor(other)) continue;
    const otherHingeSide = readHingeSide(other);
    if (!otherHingeSide || otherHingeSide === hingeSide) continue;
    if (!sameParentScope(door.group, other.group)) continue;

    const otherClosedPivotX = ensureHingedDoorClosedPivotX(other);
    if (otherClosedPivotX === null) continue;
    if (
      Math.abs(otherClosedPivotX - closedPivotX) >
      HINGED_DOOR_SHARED_PIVOT_MOTION_POLICY.sharedPivotMatchToleranceM
    ) {
      continue;
    }
    if (!verticallyOverlaps(door, other)) continue;

    const otherSwingSign = readEffectiveSwingSign(other);
    if (otherSwingSign === null || otherSwingSign === swingSign) continue;
    return true;
  }
  return false;
}

function readLeafBodyDirection(door: DoorVisualEntryLike): 1 | -1 | null {
  const meshOffsetX = readFinite(readUserData(door.group)?.__doorMeshOffsetX);
  if (meshOffsetX !== null && Math.abs(meshOffsetX) > 1e-9) return meshOffsetX > 0 ? 1 : -1;
  const hingeSide = readHingeSide(door);
  if (!hingeSide) return null;
  return hingeSide === 'left' ? 1 : -1;
}

/**
 * Return the X position for the hinged door's motion frame at the supplied
 * rotation. Closed geometry is unchanged; clearance grows smoothly with the
 * sine of the opening angle, approximating a concealed-hinge lateral throw.
 */
export function resolveHingedDoorSharedPivotMotionX(
  door: DoorVisualEntryLike,
  doors: readonly DoorVisualEntryLike[],
  rotationY: number
): number | null {
  const closedPivotX = ensureHingedDoorClosedPivotX(door);
  if (closedPivotX === null) return null;
  if (!hasOpposingLeafOnSharedPivot(door, doors, closedPivotX)) return closedPivotX;

  const bodyDirection = readLeafBodyDirection(door);
  if (bodyDirection === null) return closedPivotX;

  const finiteRotation = readFinite(rotationY) ?? 0;
  const openingProgress = Math.sin(Math.min(Math.abs(finiteRotation), Math.PI / 2));
  return (
    closedPivotX +
    bodyDirection * HINGED_DOOR_SHARED_PIVOT_MOTION_POLICY.lateralThrowPerLeafM * openingProgress
  );
}
