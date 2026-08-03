import { DOOR_MOUNT_THICKNESS_DIMENSIONS as OWNER_DIMENSIONS } from '../../esm/shared/dimensions/door_mount_thickness_policy.js';
import type { Centimeters } from '../../esm/shared/dimensions/units.js';

const ownerStep: Centimeters = OWNER_DIMENSIONS.stepCm;

// @ts-expect-error The focused owner retains its branded Centimeters contract.
const ownerRejectsPlainNumber: typeof OWNER_DIMENSIONS.stepCm = 0.1;

export { ownerRejectsPlainNumber, ownerStep };
