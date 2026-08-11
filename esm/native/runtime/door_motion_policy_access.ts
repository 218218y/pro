import {
  HINGED_DOOR_HARDWARE_RENDER_POLICY,
  HINGED_DOOR_RENDER_POLICY,
  SLIDING_DOOR_CONSTRUCTION_POLICY,
  SLIDING_DOOR_MOTION_POLICY,
} from '../../shared/dimensions/door_system_policy.js';

// Runtime-local scalar seam for door motion. This is deliberately not an
// identity re-export of shared dimension owners: motion implementations only
// receive the exact numeric values they need, while the shared policies remain
// the canonical dimension owners.
export const HINGED_DOOR_OPEN_ANGLE_RAD = HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassConnectorOpenAngleRad;
export const HINGED_DOOR_VISUAL_THICKNESS_M = HINGED_DOOR_RENDER_POLICY.visualThicknessM;
export const SLIDING_DOOR_DEFAULT_COUNT = SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount;
export const SLIDING_DOOR_RUNTIME_OPEN_EPSILON_X_M = SLIDING_DOOR_MOTION_POLICY.runtimeOpenEpsilonXM;
export const SLIDING_DOOR_RUNTIME_STACK_Z_STEP_DEFAULT_M =
  SLIDING_DOOR_MOTION_POLICY.runtimeStackZStepDefaultM;
