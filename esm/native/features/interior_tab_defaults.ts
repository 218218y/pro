import {
  INTERIOR_SHELF_GEOMETRY_POLICY,
  mToCm,
} from '../../shared/dimensions/interior_tab_defaults_dimension_policy.js';

export {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
} from './sketch_drawer_sizing.js';
export { DEFAULT_BASE_PLINTH_HEIGHT_CM } from './base_plinth_support.js';
export { DEFAULT_BASE_LEG_PLATFORM_MODE, DEFAULT_BASE_LEG_PLATFORM_SIDE_MODE } from './base_leg_support.js';
export {
  DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
  DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
} from './platform_overhang_support.js';

export const DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM: number = mToCm(INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);
