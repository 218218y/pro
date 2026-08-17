import type { ThreeLike, UnknownRecord } from '../../../types/index.js';
import { HINGED_DOOR_HARDWARE_RENDER_POLICY } from '../../shared/dimensions/door_system_policy.js';
import {
  createHingedDoorHardwareRenderState,
  type HingedDoorHardwareRenderState,
} from './render_hinged_door_hardware.js';
import { createHingedDoorMotionMetadataPatch } from '../../shared/door_motion_contracts_shared.js';

type HingedDoorMotionMetadataPatchInput = Readonly<{
  partId?: string;
  cornerPent?: boolean;
  cornerPentPair?: boolean;
  openDirectionSign?: 1 | -1;
  handleZSign?: 1 | -1;
  invertSwing?: boolean;
  removed?: boolean;
  noGlobalOpen?: boolean;
  widthM?: number;
  heightM?: number;
  meshOffsetXM?: number;
}>;

/** Builder-local facade keeps concrete builders from knowing motion metadata keys. */
export function createBuilderHingedDoorMotionMetadata(
  input: HingedDoorMotionMetadataPatchInput
): UnknownRecord {
  return createHingedDoorMotionMetadataPatch(input);
}

export function patchBuilderHingedDoorMotionMetadata(
  target: UnknownRecord,
  input: HingedDoorMotionMetadataPatchInput
): void {
  Object.assign(target, createHingedDoorMotionMetadataPatch(input));
}

export const BUILDER_HINGED_DOOR_HARDWARE_METAL_FINISH = Object.freeze({
  color: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalColorHex,
  metalness: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalness,
  roughness: HINGED_DOOR_HARDWARE_RENDER_POLICY.roughness,
  emissive: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalEmissiveHex,
  emissiveIntensity: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalEmissiveIntensity,
});

/** Canonical builder-side creation of hardware state from the shared hinge policy. */
export function createBuilderHingedDoorHardwareRenderState(
  THREE: ThreeLike,
  doorThicknessM: number
): HingedDoorHardwareRenderState | null {
  return createHingedDoorHardwareRenderState(THREE, HINGED_DOOR_HARDWARE_RENDER_POLICY, doorThicknessM);
}
