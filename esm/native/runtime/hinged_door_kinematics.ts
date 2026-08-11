import { HINGED_DOOR_OPEN_ANGLE_RAD, HINGED_DOOR_VISUAL_THICKNESS_M } from './door_motion_policy_access.js';
import type { DoorVisualEntryLike, Object3DLike, UnknownRecord } from '../../../types';

type MotionSign = 1 | -1;

export type HingedDoorMotionMetadata = Readonly<{
  partId: string;
  isCornerPent: boolean;
  openDirectionSign: MotionSign;
  invertSwing: boolean;
  removed: boolean;
  heightM: number | null;
  meshOffsetXM: number | null;
}>;

const SHARED_PIVOT_PAIR_CLEARANCE_M = 0.002;

const SHARED_PIVOT_POLICY = Object.freeze({
  /** Closed pivot coordinates must be effectively identical to share one divider axis. */
  sharedPivotMatchToleranceM: 0.0015,

  /** Ignore vertically disjoint leaves/segments that happen to reuse the same X pivot. */
  verticalOverlapToleranceM: 0.001,

  /** Minimum slab-to-slab clearance at full open. */
  pairClearanceM: SHARED_PIVOT_PAIR_CLEARANCE_M,

  /**
   * Per-leaf full-open translation required to clear two opposing rendered slabs.
   * For symmetric leaves the projected slab overlap is `thickness * sin(angle)`;
   * translating each motion frame by half `(thickness + clearance)` removes it.
   */
  lateralThrowPerLeafM: (HINGED_DOOR_VISUAL_THICKNESS_M + SHARED_PIVOT_PAIR_CLEARANCE_M) / 2,
});

export const HINGED_DOOR_KINEMATICS_POLICY = Object.freeze({
  openAngleRad: HINGED_DOOR_OPEN_ANGLE_RAD,
  sharedPivot: SHARED_PIVOT_POLICY,
});

/** Focused shared-pivot motion policy owned by canonical kinematics. */
export const HINGED_DOOR_SHARED_PIVOT_MOTION_POLICY = SHARED_PIVOT_POLICY;

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readSign(value: unknown): MotionSign | null {
  if (value === 1 || value === '1') return 1;
  if (value === -1 || value === '-1') return -1;
  return null;
}

function readUserData(group: Object3DLike | null | undefined): UnknownRecord | null {
  const userData = group?.userData;
  return userData && typeof userData === 'object' ? userData : null;
}

function readPartId(userData: UnknownRecord | null): string {
  const value = userData?.partId;
  return typeof value === 'string' ? value : '';
}

function resolveOpenDirectionSign(userData: UnknownRecord | null): MotionSign {
  if (!userData) return 1;

  const explicitDirection = readSign(userData.__wpDoorOpenDirSign);
  if (explicitDirection !== null) return explicitDirection;

  const zDirection = readSign(userData.__wpDoorOpenZSign);
  if (zDirection !== null) return zDirection;

  const handleZSign = readSign(userData.__handleZSign);
  return handleZSign === null ? 1 : handleZSign === 1 ? -1 : 1;
}

export function readHingedDoorMotionMetadata(
  door: DoorVisualEntryLike | null | undefined
): HingedDoorMotionMetadata {
  const userData = readUserData(door?.group);
  const partId = readPartId(userData);
  const isCornerPent =
    !!(userData && (userData.__wpCornerPentDoor || userData.__wpCornerPentDoorPair === 'corner_pent_pair')) ||
    partId.startsWith('corner_pent_door');

  return {
    partId,
    isCornerPent,
    openDirectionSign: resolveOpenDirectionSign(userData),
    invertSwing: !!door?.invertSwing || !!userData?.__invertSwing,
    removed: userData?.__wpDoorRemoved === true,
    heightM: readFinite(userData?.__doorHeight),
    meshOffsetXM: readFinite(userData?.__doorMeshOffsetX),
  };
}

function readHingeSide(door: DoorVisualEntryLike | null | undefined): 'left' | 'right' | null {
  return door?.hingeSide === 'left' || door?.hingeSide === 'right' ? door.hingeSide : null;
}

/**
 * Canonical target rotation for every hinged-door motion route (snap, sync, and animated render loop).
 */
export function resolveHingedDoorTargetRotationY(
  door: DoorVisualEntryLike | null | undefined,
  targetOpen: boolean
): number {
  if (!targetOpen || !door) return 0;

  const metadata = readHingedDoorMotionMetadata(door);
  let rotationY = (door.hingeSide === 'left' ? -1 : 1) * HINGED_DOOR_KINEMATICS_POLICY.openAngleRad;

  if (metadata.isCornerPent) rotationY *= metadata.openDirectionSign;
  if (metadata.invertSwing) rotationY = -rotationY;
  return rotationY;
}

function readEffectiveSwingSign(door: DoorVisualEntryLike): MotionSign | null {
  if (!readHingeSide(door)) return null;
  const targetRotationY = resolveHingedDoorTargetRotationY(door, true);
  return targetRotationY < 0 ? -1 : 1;
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
  const height = readHingedDoorMotionMetadata(door).heightM;
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
  const metadata = readHingedDoorMotionMetadata(door);
  if (metadata.removed || metadata.isCornerPent || !door.group) return false;

  const hingeSide = readHingeSide(door);
  const swingSign = readEffectiveSwingSign(door);
  if (!hingeSide || swingSign === null) return false;

  for (const other of doors) {
    if (other === door || other?.type !== 'hinged' || !other.group) continue;

    const otherMetadata = readHingedDoorMotionMetadata(other);
    if (otherMetadata.removed || otherMetadata.isCornerPent) continue;

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

function readLeafBodyDirection(door: DoorVisualEntryLike): MotionSign | null {
  const meshOffsetX = readHingedDoorMotionMetadata(door).meshOffsetXM;
  if (meshOffsetX !== null && Math.abs(meshOffsetX) > 1e-9) return meshOffsetX > 0 ? 1 : -1;
  const hingeSide = readHingeSide(door);
  if (!hingeSide) return null;
  return hingeSide === 'left' ? 1 : -1;
}

/**
 * Return the X coordinate of the hinged-door motion frame for the supplied rotation.
 * Closed geometry is unchanged. Clearance follows the projected slab thickness,
 * so opposing leaves clear progressively instead of relying on a fixed visual patch.
 */
export function resolveHingedDoorMotionFrameX(
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

/** Shared-pivot-specific motion name for callers that operate only on the clearance concern. */
export const resolveHingedDoorSharedPivotMotionX = resolveHingedDoorMotionFrameX;
