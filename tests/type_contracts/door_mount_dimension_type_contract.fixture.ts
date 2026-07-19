import { DOOR_MOUNT_THICKNESS_DIMENSIONS as OWNER_DIMENSIONS } from '../../esm/shared/dimensions/door_mount_thickness_policy.js';
import type { Centimeters } from '../../esm/shared/dimensions/units.js';
import { DOOR_MOUNT_THICKNESS_DIMENSIONS as FACADE_DIMENSIONS } from '../../esm/shared/wardrobe_dimension_tokens_shared.js';
import { DOOR_MOUNT_THICKNESS_DIMENSIONS as PUBLIC_DIMENSIONS } from '../../esm/native/features/dimensions/index.js';

const ownerStep: Centimeters = OWNER_DIMENSIONS.stepCm;
const facadeStep: number = FACADE_DIMENSIONS.stepCm;
const publicStep: number = PUBLIC_DIMENSIONS.stepCm;

const facadeAcceptsPlainNumber: typeof FACADE_DIMENSIONS.stepCm = 0.1;
const publicAcceptsPlainNumber: typeof PUBLIC_DIMENSIONS.stepCm = 0.1;

// @ts-expect-error The focused owner retains its branded Centimeters contract.
const ownerRejectsPlainNumber: typeof OWNER_DIMENSIONS.stepCm = 0.1;

export {
  facadeAcceptsPlainNumber,
  facadeStep,
  ownerRejectsPlainNumber,
  ownerStep,
  publicAcceptsPlainNumber,
  publicStep,
};
