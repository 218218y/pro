import type { UnknownRecord } from '../../types/index.js';
import {
  HINGED_DOOR_HARDWARE_RENDER_POLICY,
  HINGED_DOOR_RENDER_POLICY,
  SLIDING_DOOR_CONSTRUCTION_POLICY,
  SLIDING_DOOR_MOTION_POLICY,
} from './dimensions/door_system_policy.js';

export const HINGED_DOOR_OPEN_ANGLE_RAD = HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassConnectorOpenAngleRad;
export const HINGED_DOOR_VISUAL_THICKNESS_M = HINGED_DOOR_RENDER_POLICY.visualThicknessM;
export const SLIDING_DOOR_DEFAULT_COUNT = SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount;
export const SLIDING_DOOR_RUNTIME_OPEN_EPSILON_X_M = SLIDING_DOOR_MOTION_POLICY.runtimeOpenEpsilonXM;
export const SLIDING_DOOR_RUNTIME_STACK_Z_STEP_DEFAULT_M =
  SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepDefaultM;

export type HingedDoorMotionSign = 1 | -1;

export type HingedDoorMotionMetadataSnapshot = Readonly<{
  partId: string;
  isCornerPent: boolean;
  openDirectionSign: HingedDoorMotionSign;
  invertSwing: boolean;
  removed: boolean;
  noGlobalOpen: boolean;
  widthM: number | null;
  heightM: number | null;
  meshOffsetXM: number | null;
}>;

export type HingedDoorMotionMetadataPatchInput = Readonly<{
  partId?: string;
  cornerPent?: boolean;
  cornerPentPair?: boolean;
  openDirectionSign?: HingedDoorMotionSign;
  handleZSign?: HingedDoorMotionSign;
  invertSwing?: boolean;
  removed?: boolean;
  noGlobalOpen?: boolean;
  widthM?: number;
  heightM?: number;
  meshOffsetXM?: number;
}>;

function readRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readSign(value: unknown): HingedDoorMotionSign | null {
  if (value === 1 || value === '1') return 1;
  if (value === -1 || value === '-1') return -1;
  return null;
}

function readPartId(userData: UnknownRecord | null): string {
  return typeof userData?.partId === 'string' ? userData.partId : '';
}

function resolveOpenDirectionSign(userData: UnknownRecord | null): HingedDoorMotionSign {
  if (!userData) return 1;

  const explicitDirection = readSign(userData.__wpDoorOpenDirSign);
  if (explicitDirection !== null) return explicitDirection;

  const zDirection = readSign(userData.__wpDoorOpenZSign);
  if (zDirection !== null) return zDirection;

  // Historical door metadata stored the handle-face sign rather than the swing
  // sign. Preserve that migration tolerance only at this one normalization boundary.
  const handleZSign = readSign(userData.__handleZSign);
  return handleZSign === null ? 1 : handleZSign === 1 ? -1 : 1;
}

/**
 * Canonical read boundary for hinged-door scene metadata.
 *
 * Runtime/services must consume this normalized snapshot instead of independently
 * interpreting the underlying userData keys. The reader deliberately accepts the
 * two historical string sign values at this migration read boundary, but all
 * builder writes emitted by this module are strict numeric metadata.
 */
export function readHingedDoorMotionMetadataSnapshot(
  value: unknown,
  entryInvertSwing = false
): HingedDoorMotionMetadataSnapshot {
  const userData = readRecord(value);
  const partId = readPartId(userData);
  const isCornerPent =
    !!(
      userData &&
      (userData.__wpCornerPentDoor === true || userData.__wpCornerPentDoorPair === 'corner_pent_pair')
    ) || partId.startsWith('corner_pent_door');

  return {
    partId,
    isCornerPent,
    openDirectionSign: resolveOpenDirectionSign(userData),
    invertSwing: entryInvertSwing || userData?.__invertSwing === true,
    removed: userData?.__wpDoorRemoved === true,
    noGlobalOpen:
      userData?.noGlobalOpen === true ||
      isCornerPent ||
      userData?.__wpCornerPentFront === true ||
      userData?.__wpCornerPentagon === true,
    widthM: readFinite(userData?.__doorWidth),
    heightM: readFinite(userData?.__doorHeight),
    meshOffsetXM: readFinite(userData?.__doorMeshOffsetX),
  };
}

function assignFinite(target: UnknownRecord, key: string, value: number | undefined): void {
  if (typeof value === 'number' && Number.isFinite(value)) target[key] = value;
}

/**
 * Canonical builder-side patch for the metadata consumed by hinged-door motion.
 * Unrelated scene metadata remains owned by the concrete builder.
 */
export function createHingedDoorMotionMetadataPatch(
  input: HingedDoorMotionMetadataPatchInput
): UnknownRecord {
  const out: UnknownRecord = {};

  if (typeof input.partId === 'string') out.partId = input.partId;
  if (input.cornerPent === true) out.__wpCornerPentDoor = true;
  if (input.cornerPentPair === true) out.__wpCornerPentDoorPair = 'corner_pent_pair';
  if (input.openDirectionSign === 1 || input.openDirectionSign === -1) {
    out.__wpDoorOpenDirSign = input.openDirectionSign;
  }
  if (input.handleZSign === 1 || input.handleZSign === -1) out.__handleZSign = input.handleZSign;
  if (input.invertSwing === true) out.__invertSwing = true;
  if (typeof input.removed === 'boolean') out.__wpDoorRemoved = input.removed;
  if (input.noGlobalOpen === true) out.noGlobalOpen = true;

  assignFinite(out, '__doorWidth', input.widthM);
  assignFinite(out, '__doorHeight', input.heightM);
  assignFinite(out, '__doorMeshOffsetX', input.meshOffsetXM);

  return out;
}
