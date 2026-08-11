import {
  HINGED_DOOR_OPEN_ANGLE_RAD as SHARED_HINGED_DOOR_OPEN_ANGLE_RAD,
  HINGED_DOOR_VISUAL_THICKNESS_M as SHARED_HINGED_DOOR_VISUAL_THICKNESS_M,
  SLIDING_DOOR_DEFAULT_COUNT as SHARED_SLIDING_DOOR_DEFAULT_COUNT,
  SLIDING_DOOR_RUNTIME_OPEN_EPSILON_X_M as SHARED_SLIDING_DOOR_RUNTIME_OPEN_EPSILON_X_M,
  SLIDING_DOOR_RUNTIME_STACK_Z_STEP_DEFAULT_M as SHARED_SLIDING_DOOR_RUNTIME_STACK_Z_STEP_DEFAULT_M,
  readHingedDoorMotionMetadataSnapshot,
} from '../../shared/door_motion_contracts_shared.js';

// Runtime-local scalar seam for door motion. This is deliberately not an
// identity re-export of shared dimension owners: motion implementations only
// receive the exact numeric values they need, while the shared contracts remain
// the canonical owners.
export const HINGED_DOOR_OPEN_ANGLE_RAD = SHARED_HINGED_DOOR_OPEN_ANGLE_RAD;
export const HINGED_DOOR_VISUAL_THICKNESS_M = SHARED_HINGED_DOOR_VISUAL_THICKNESS_M;
export const SLIDING_DOOR_DEFAULT_COUNT = SHARED_SLIDING_DOOR_DEFAULT_COUNT;
export const SLIDING_DOOR_RUNTIME_OPEN_EPSILON_X_M = SHARED_SLIDING_DOOR_RUNTIME_OPEN_EPSILON_X_M;
export const SLIDING_DOOR_RUNTIME_STACK_Z_STEP_DEFAULT_M = SHARED_SLIDING_DOOR_RUNTIME_STACK_Z_STEP_DEFAULT_M;

export type RuntimeHingedDoorMotionMetadata = Readonly<{
  partId: string;
  isCornerPent: boolean;
  openDirectionSign: 1 | -1;
  invertSwing: boolean;
  removed: boolean;
  noGlobalOpen: boolean;
  widthM: number | null;
  heightM: number | null;
  meshOffsetXM: number | null;
}>;

export function readRuntimeHingedDoorMotionMetadata(
  userData: unknown,
  entryInvertSwing = false
): RuntimeHingedDoorMotionMetadata {
  return readHingedDoorMotionMetadataSnapshot(userData, entryInvertSwing);
}
