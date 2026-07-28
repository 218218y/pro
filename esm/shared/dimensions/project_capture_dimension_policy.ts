import { normalizeDoorMountThicknessCm } from './door_mount_thickness_policy.js';
import { DEFAULT_HINGED_DOORS } from './wardrobe_defaults.js';

export const PROJECT_CAPTURE_DIMENSION_POLICY = Object.freeze({
  defaultHingedDoorsCount: DEFAULT_HINGED_DOORS,
  normalizeDoorMountThicknessCm,
});
